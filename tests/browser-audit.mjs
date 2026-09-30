import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const results = [];
const base = process.env.TEST_ORIGIN || "http://localhost:3000";
async function visit(name) {
  await page.getByRole("button", { name: "Conversation options", exact: true }).click();
  await page.getByRole("navigation", { name: "Conversation options" }).getByRole("button", { name, exact: true }).click();
}
try {
  for (const width of [320, 375, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 740 });
    await page.goto(base);
    await page.getByRole("heading", { name: "DeDe", exact: true }).waitFor();
    for (const theme of ["light", "dark"]) {
      await visit("Settings");
      await page.getByLabel("Color theme").selectOption(theme);
      await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      await page.getByRole("button", { name: "Back to conversation" }).click();
      const layout = await page.evaluate(() => {
        const button = document.querySelector(".voice-button").getBoundingClientRect();
        const composer = document.querySelector(".composer-area").getBoundingClientRect();
        const room = document.querySelector(".talk-room");
        const main = document.querySelector(".main-panel");
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          roomOverflow: room.scrollWidth > room.clientWidth,
          touchWidth: button.width, touchHeight: button.height,
          composerVisible: composer.bottom <= window.innerHeight + 1 && composer.top >= 0,
          withinViewport: main.getBoundingClientRect().height <= window.innerHeight + 1,
        };
      });
      assert.equal(layout.overflow, false);
      assert.equal(layout.roomOverflow, false);
      assert.ok(layout.touchWidth >= 44 && layout.touchHeight >= 44);
      assert.ok(layout.withinViewport && layout.composerVisible);
      const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      results.push({ width, theme, layout, violations: audit.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
      if (width === 390 || width === 1280) await page.screenshot({ path: `/evidence/audit-${width}-${theme}.png`, fullPage: true });
    }
  }

  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto(base);
  await page.getByRole("article", { name: "DeDe introduction" }).getByText(/Hi, I’m DeDe/).waitFor();
  assert.equal(await page.getByRole("checkbox").count(), 0);
  assert.equal(await page.getByText("Please confirm fictional test content at the top before recording.").count(), 0);
  await page.getByRole("button", { name: "Type instead" }).click();
  await page.getByLabel("A thought in words").fill("Fictional test input, not sent.");
  await page.getByRole("button", { name: "Add something" }).click();
  await page.getByRole("button", { name: /Audio file/ }).waitFor();
  await page.getByText("Reading files is not connected yet").waitFor();
  assert.equal(await page.getByLabel("A thought in words").count(), 0);
  await visit("What I know");
  await page.getByRole("heading", { name: "What stays with DeDe." }).waitFor();
  await page.getByRole("button", { name: "Back to conversation" }).click();
  await page.getByRole("button", { name: "Type instead" }).click();
  assert.equal(await page.getByLabel("A thought in words").inputValue(), "Fictional test input, not sent.");
  await page.getByRole("button", { name: "Use voice instead" }).click();
  await page.getByRole("button", { name: "Record a voice note" }).click();
  await page.getByText(/Microphone permission was denied|couldn't open your microphone/).waitFor();
  assert.equal(await page.getByRole("button", { name: "Record a voice note" }).isEnabled(), true);
  await page.screenshot({ path: "/evidence/audit-permission-denied.png", fullPage: true });
  await page.getByRole("button", { name: "Conversation options", exact: true }).click();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("navigation", { name: "Conversation options" }).count(), 0);
  await visit("Settings");
  await page.getByRole("heading", { name: "Your account" }).waitFor();
  assert.equal(await page.getByLabel("Enable fictional-only workshop sending").isChecked(), false);
  assert.equal(await page.getByRole("button", { name: "Continue with Google" }).isDisabled(), true);
  const settings = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.equal(settings.violations.length, 0);
  assert.deepEqual(errors, []);
  const report = { results, settingsViolations: settings.violations, interactionChecks: "local introduction, ungated local recording, default-off workshop upload consent in Settings, text composer, attachments, conversation menu and Escape, draft preservation, real browser microphone denial, unconfigured Google sign-in", errors, liveModelCalls: 0, scope: "Household thread UI only; physical microphone, speaker, live voice/model integration and Google consent not qualified" };
  await writeFile("/evidence/browser-audit.json", JSON.stringify(report, null, 2));
  assert.equal(results.flatMap(r => r.violations).length, 0, JSON.stringify(results.filter(r => r.violations.length)));
  console.log("PASS: ten responsive/theme accessibility audits and household UI interactions; no model requests.");
} finally { await browser.close(); }
