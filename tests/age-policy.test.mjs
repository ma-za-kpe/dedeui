import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdultDeclaration, isExplicitMinor } from '../public/age-policy.js';
test('only the explicit adult declaration permits inference', () => {
  assert.doesNotThrow(() => requireAdultDeclaration('adult_declared'));
  for (const status of [undefined, null, '', 'unknown', 'minor', true, 'adult', 'guardian_added']) {
    assert.throws(() => requireAdultDeclaration(status), /18 and over/);
  }
});
test('blocked path keeps truthful emergency-help instructions available', () => {
  assert.throws(() => requireAdultDeclaration('minor'), /emergency calling feature/);
  assert.throws(() => requireAdultDeclaration('minor'), /cannot call or alert anyone/);
});
test('explicit first-person minor ages block; adult ages and third-party stories do not', () => {
  for (const text of ["I'm 15", 'I am 17 years old.', 'Hi, I’m 12 and scared', 'im 16, help me']) assert.equal(isExplicitMinor(text), true, text);
  for (const text of ["I'm 18", 'I am 30', "I'm 15 minutes late", 'My daughter is 15', 'She said I am 15', "I'm not 15"]) assert.equal(isExplicitMinor(text), false, text);
});
