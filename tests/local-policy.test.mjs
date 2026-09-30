import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalReply } from '../public/local-policy.js';
test('rejects the actual offline reference model failure', () => {
  assert.throws(() => assertLocalReply("I'm not a DeDe. I'm a human. I'm sorry. I'm sorry. I'm sorry."));
});
test('rejects unsupported completed or pending actions and repetition', () => {
  for (const text of ["I'm calling 911 now.", "I have alerted Nakato.", 'Hello. Hello. Hello.']) assert.throws(() => assertLocalReply(text));
});
test('does not mistake capability disclaimers for action claims', () => {
  assert.doesNotThrow(() => assertLocalReply("I'm an AI, not a human. I cannot call anyone."));
});
