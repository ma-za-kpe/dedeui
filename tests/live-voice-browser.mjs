// Actual browser -> PWA -> STT -> small model -> TTS -> browser decoding.
// Uses a reviewed synthetic audio file, not a fake microphone or mocked service.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createHash } from "node:crypto";

assert.equal(process.env.DEDE_SYNTHETIC_AUDIO_APPROVED, "true");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 740 } });
const base = process.env.TEST_ORIGIN || "http://localhost:3000";
try {
  await page.goto(base);
  await page.getByRole("button", { name: "Conversation options", exact: true }).click();
  await page.getByRole("navigation", { name: "Conversation options" }).getByRole("button", { name: "Settings", exact: true }).click();
  // Wait until Firebase's initial identity resolution cannot revoke the newly selected consent.
  await page.getByRole("button", { name: "Continue with Google" }).waitFor();
  await page.waitForFunction(() => ![...document.querySelectorAll("button")].find(b => b.textContent === "Continue with Google")?.disabled);
  await page.getByLabel("Enable fictional-only workshop sending").check();
  await page.getByRole("button", { name: "Back to conversation" }).click();
  await page.getByText("Voice configured", { exact: true }).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "Add something" }).click();
  const fixture = process.env.DEDE_SYNTHETIC_AUDIO;
  // Match MediaRecorder's audio MIME; generic OS extension lookup calls .webm video/webm.
  await page.locator('input[type="file"]').setInputFiles({ name: fixture.split("/").at(-1), mimeType: fixture.endsWith(".webm") ? "audio/webm;codecs=opus" : "audio/wav", buffer: await readFile(fixture) });
  await page.getByRole("button", { name: "Send voice note" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Send voice note" }).isEnabled(), true);
  await page.waitForFunction(() => document.querySelector(".voice-review audio")?.duration > 0);
  const pending = page.waitForResponse(response => response.url().endsWith("/api/turn"), { timeout: 180000 });
  const start = performance.now();
  await page.getByRole("button", { name: "Send voice note" }).click();
  const response = await pending;
  const result = await response.json();
  if (response.status() !== 200) {
    await writeFile("/evidence/live-voice-browser-failure.json", JSON.stringify({ status: response.status(), message: result.message, scope: "Actual browser submission; failed turn, not a pass" }, null, 2));
    await page.screenshot({ path: "/evidence/live-voice-browser-failure.png", fullPage: true });
  }
  assert.equal(response.status(), 200, result.message);
  assert.ok(result.transcript.toLowerCase().includes("quiet"));
  assert.ok(result.metrics.ttftMs > 0);
  assert.ok(result.audio.length > 0);
  await page.getByRole("article", { name: "Your message" }).waitFor();
  await page.getByRole("article", { name: "DeDe's reply" }).waitFor();
  await page.evaluate(() => {
    window.dedePlaybackStarts = 0;
    document.querySelector(".reply-player audio").addEventListener("playing", () => { window.dedePlaybackStarts += 1; });
  });
  await page.getByRole("button", { name: "Play DeDe's reply" }).click();
  await page.waitForFunction(() => {
    const audio = document.querySelector(".reply-player audio");
    return audio && audio.currentTime > 0 && audio.duration > 0 && !audio.paused;
  }, undefined, { timeout: 30000 });
  const decoded = await page.evaluate(() => {
    const audio = document.querySelector(".reply-player audio");
    return { mime: audio.src.split(";")[0].replace("data:", ""), duration: audio.duration, currentTime: audio.currentTime };
  });
  assert.ok(["audio/ogg", "audio/wav"].includes(decoded.mime));
  await page.waitForFunction(count => window.dedePlaybackStarts === count && !document.querySelector(".reply-player audio").getAttribute("src"), result.audio.length, { timeout: 90000 });
  await page.screenshot({ path: "/evidence/live-voice-browser.png", fullPage: true });
  const receipt = { passed: true, elapsedMs: Math.round(performance.now() - start), fixtureFormat: process.env.DEDE_SYNTHETIC_AUDIO.split(".").at(-1), speechChunks: result.audio.length, allChunksPlayed: true, decoded, transcriptSha256: createHash("sha256").update(result.transcript).digest("hex"), scope: "Actual upload, STT, small model, TTS and sequential browser audio decoding; physical microphone/speaker and real Google sign-in not qualified" };
  await writeFile("/evidence/live-voice-browser.json", JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
} finally { await browser.close(); }
