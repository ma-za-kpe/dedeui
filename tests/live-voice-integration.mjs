// Real PWA HTTP integration. Fails if voice is unavailable; never substitutes replies.
// Run only against an authorized synthetic-only connection with a reviewed synthetic WAV.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const base = process.env.TEST_ORIGIN || "http://localhost:3000";
const state = await (await fetch(`${base}/api/connection`)).json();
assert.equal(state.mode, "voice", "Voice integration NOT QUALIFIED: connected service is text-only");
assert.equal(state.identityMatched, true, "Artifact identity must match");
assert.equal(state.inferenceEnabled, true, "Inference must be explicitly enabled");
assert.equal(process.env.DEDE_SYNTHETIC_AUDIO_APPROVED, "true", "Explicit synthetic fixture approval required");
const path = process.env.DEDE_SYNTHETIC_AUDIO;
assert.ok(path, "A reviewed synthetic audio fixture path is required");
const bytes = await readFile(path);
const webm = path.endsWith(".webm");
if (webm) assert.equal(bytes.subarray(0, 4).toString("hex"), "1a45dfa3");
else { assert.equal(bytes.subarray(0, 4).toString(), "RIFF"); assert.equal(bytes.subarray(8, 12).toString(), "WAVE"); }
assert.ok(bytes.length > 44 && bytes.length < 4 * 1024 * 1024);
const form = new FormData();
form.set("synthetic", "true"); form.set("text", ""); form.set("timezone", "UTC");
form.set("file", new Blob([bytes], { type: webm ? "audio/webm;codecs=opus" : "audio/wav" }), webm ? "synthetic-voice.webm" : "synthetic-voice.wav");
const start = performance.now();
const response = await fetch(`${base}/api/turn`, { method: "POST", headers: { Origin: base }, body: form, signal: AbortSignal.timeout(180000) });
const result = await response.json();
assert.equal(response.status, 200, result.message || "Real voice turn must succeed");
assert.ok(typeof result.text === "string" && result.text.trim());
assert.ok(typeof result.transcript === "string" && result.transcript.trim(), "Actual STT transcript is required");
assert.ok(result.metrics?.ttftMs > 0, "Fixture must exercise actual model generation, not a fixed emergency/space reply");
if (process.env.DEDE_EXPECTED_TRANSCRIPT) assert.ok(result.transcript.toLowerCase().includes(process.env.DEDE_EXPECTED_TRANSCRIPT.toLowerCase()), "STT must recognize the reviewed fixture");
assert.ok(Array.isArray(result.audio) && result.audio.length > 0, "Actual TTS audio is required");
for (const chunk of result.audio) {
  const returned = Buffer.from(chunk, "base64");
  const ogg = returned.subarray(0, 4).toString() === "OggS";
  const wav = returned.subarray(0, 4).toString() === "RIFF" && returned.subarray(8, 12).toString() === "WAVE";
  assert.ok(ogg || wav, "Actual Opus/OGG or WAV TTS audio is required");
  assert.ok(returned.length > 44);
}
const receipt = { passed: true, mode: state.mode, fixtureSha256: createHash("sha256").update(bytes).digest("hex"), elapsedMs: Math.round(performance.now() - start), audioChunks: result.audio.length, transcriptSha256: createHash("sha256").update(result.transcript).digest("hex"), replySha256: createHash("sha256").update(result.text).digest("hex"), scope: "Real HTTP voice integration; physical microphone and audible playback require separate evidence" };
if (process.env.DEDE_INTEGRATION_RECEIPT) await writeFile(process.env.DEDE_INTEGRATION_RECEIPT, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));
