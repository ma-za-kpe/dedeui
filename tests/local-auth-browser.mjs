import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let turns = 0;
  page.on('request', request => { if (request.url().endsWith('/api/turn')) turns++; });
  await page.goto(process.env.TEST_ORIGIN || 'http://127.0.0.1:3000');
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Type instead' }).click();
  await page.getByRole('textbox', { name: 'A thought in words' }).fill('Synthetic signed-out test');
  assert.equal(await page.getByRole('button', { name: 'Send message', exact: true }).isDisabled(), true);
  await page.getByRole('textbox', { name: 'A thought in words' }).press('Enter');
  await page.getByText('Sign in with Google before sending a message or voice note.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Add something' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'synthetic.wav', mimeType: 'audio/wav', buffer: await readFile('/evidence/synthetic-note.wav') });
  assert.equal(await page.getByRole('button', { name: 'Send voice note', exact: true }).isDisabled(), true);
  await page.getByText('Sign in to send', { exact: true }).waitFor();
  assert.equal(turns, 0);
  const response = await page.request.post((process.env.TEST_ORIGIN || 'http://127.0.0.1:3000') + '/api/turn', { data: 'synthetic direct request' });
  assert.equal(response.status(), 410);
  console.log('PASS: signed-out text, Enter, voice blocked; no turn requests from UI; direct uploads retired. No Google sign-in mocked.');
} finally { await browser.close(); }
