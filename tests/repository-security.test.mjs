import test from 'node:test';
import assert from 'node:assert/strict';
import { violations } from '../infra/check-repository.mjs';
test('blocks sensitive paths even when force-added', () => {
  for (const path of ['.env.local', '.firebase', 'x/service-account-dev.json', 'model.gguf', 'x/model.onnx', 'public/local-runtime/bundle.js']) assert.ok(violations(path, Buffer.from('')).length, path);
});
test('blocks credential content without disclosing it', () => {
  for (const value of ['gh' + 'p_' + 'a'.repeat(36), 'hf' + '_' + 'b'.repeat(32), 'DEDE_API_TOKEN=' + 'f'.repeat(48)]) {
    const result = violations('notes.txt', Buffer.from(value));
    assert.ok(result.length); assert.ok(result.every(x => !x.includes(value)));
  }
});
test('accepts placeholder documentation but rejects oversized artifacts', () => {
  assert.deepEqual(violations('README.md', Buffer.from('DEDE_API_TOKEN=<provided outside Git>')), []);
  assert.ok(violations('large.bin', Buffer.alloc(5 * 1024 * 1024 + 1)).length);
});
