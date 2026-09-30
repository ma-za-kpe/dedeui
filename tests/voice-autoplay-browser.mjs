import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.TEST_ORIGIN || 'http://localhost:3000');
  await page.addScriptTag({ path: '/evidence/voice-autoplay-harness.js' });
  const audio = (await readFile('/evidence/synthetic-note.wav')).toString('base64');
  // A real gesture on the page, as Send provides, not an autoplay-policy bypass.
  await page.getByRole('button', { name: 'Conversation options', exact: true }).click();
  await page.evaluate(value => window.renderVoiceReply(value, true), audio);
  await page.waitForFunction(() => document.querySelector('.reply-player audio')?.currentTime > 0);
  await page.waitForFunction(() => !document.querySelector('.reply-player audio')?.getAttribute('src'));
  await page.evaluate(value => window.renderVoiceReply(value, false), audio);
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.reply-player audio').evaluate(a => a.paused), true);
  await page.getByRole('button', { name: "Play DeDe's reply", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.reply-player audio')?.currentTime > 0);
  console.log('PASS: actual VoiceReply component automatically plays after page gesture, finishes, stays silent when autoPlay=false, and supports manual replay. No model/auth mocked.');
} finally { await browser.close(); }
