import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [], failures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  await page.goto('http://localhost:3000/dedeui/');
  await page.getByRole('button', { name: 'Conversation options', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Back to conversation' }).click();
  await page.getByText('Need urgent help?', { exact: true }).click();
  assert.ok(await page.getByText(/Help information is available regardless of age/).isVisible());
  assert.equal(await page.getByRole('button', { name: 'Continue with Google' }).isDisabled(), true);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('16px Atkinson')), true);
  const registration = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  assert.equal(registration, 'http://localhost:3000/dedeui/');
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  console.log('PASS: static Pages mobile UI, subpath assets/font, Settings, signed-out gate, urgent help and scoped service worker; no inference or OAuth attempted');
} finally { await browser.close(); }
