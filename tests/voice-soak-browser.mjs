// Player-only qualification: real browser decoding/playback of a synthetic WAV.
// No model is replaced or invoked; this is NOT STT/model/TTS integration proof.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const rounds = Number(process.env.SOAK_ROUNDS || 20);
assert.ok(Number.isInteger(rounds) && rounds >= 1 && rounds <= 500);
const browser = await chromium.launch({ headless: true });
const receipt = { scope: 'VoiceReply component synthetic-WAV playback only; no model, OAuth or physical-device qualification', rounds, completed: 0, passed: false, samples: [] };
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.TEST_ORIGIN || 'http://localhost:3000');
  await page.addScriptTag({ path: '/evidence/voice-autoplay-harness.js' });
  const wav = (await readFile('/evidence/synthetic-note.wav')).toString('base64');
  await page.getByRole('button', { name: 'Conversation options', exact: true }).click();
  const session = await page.context().newCDPSession(page);
  for (let i = 0; i < rounds; i++) {
    await page.evaluate(() => window.clearVoiceReply());
    await page.waitForFunction(() => !document.querySelector('.reply-player'));
    await page.evaluate(value => window.renderVoiceChunks([value, value], false), wav);
    await page.locator('.reply-player audio').waitFor({ state: 'attached' });
    await page.evaluate(() => {
      window.playbackEvidence = [];
      const player = document.querySelector('.reply-player audio');
      player.addEventListener('ended', () => window.playbackEvidence.push({ duration: player.duration, endedAt: player.currentTime }), { capture: true });
    });
    await page.getByRole('button', { name: "Play DeDe's reply", exact: true }).click();
    await page.waitForFunction(() => window.playbackEvidence.length === 2, undefined, { timeout: 60000 });
    const evidence = await page.evaluate(() => window.playbackEvidence);
    for (const item of evidence) {
      assert.ok(Number.isFinite(item.duration) && item.duration > 0);
      assert.ok(item.endedAt >= item.duration - 0.1, 'audio must play to its end');
    }
    assert.equal(await page.locator('.reply-player audio').evaluate(a => a.paused && !a.getAttribute('src')), true);
    await page.evaluate(() => window.clearVoiceReply());
    await page.waitForFunction(() => !document.querySelector('.reply-player'));
    await session.send('HeapProfiler.collectGarbage');
    receipt.samples.push(await session.send('Memory.getDOMCounters'));
    receipt.completed++;
    console.log(`Playback round ${i + 1}/${rounds}: both chunks completed`);
  }
  if (rounds >= 20) {
    const baseline = receipt.samples[2];
    const last = receipt.samples.at(-1);
    assert.ok(last.jsEventListeners <= baseline.jsEventListeners + 5, 'listeners must not accumulate across replies');
    assert.ok(last.nodes <= baseline.nodes + 20, 'detached player nodes must not accumulate');
  }
  // Removing an actively playing reply must pause its player (account teardown).
  await page.evaluate(value => window.renderVoiceChunks([value, value], false), wav);
  await page.locator('.reply-player audio').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: "Play DeDe's reply", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.reply-player audio').currentTime > 0);
  await page.evaluate(() => { window.removedPlayer = document.querySelector('.reply-player audio'); window.clearVoiceReply(); });
  await page.waitForFunction(() => !document.querySelector('.reply-player'));
  assert.equal(await page.evaluate(() => window.removedPlayer.paused), true, 'unmounted player must stop');
  assert.deepEqual(errors, []);
  receipt.passed = true;
} catch (error) {
  receipt.error = error.message;
  throw error;
} finally {
  await writeFile('/evidence/voice-soak.json', JSON.stringify(receipt, null, 2));
  await browser.close();
}
