import test from 'node:test';
import assert from 'node:assert/strict';
import { violations } from '../infra/check-repository.mjs';
import { spawnSync } from 'node:child_process';
test('blocks sensitive paths even when force-added', () => {
  for (const path of ['.env.local', '.firebase', 'x/service-account-dev.json', 'model.gguf', 'x/model.onnx', 'public/local-runtime/bundle.js']) assert.ok(violations(path, Buffer.from('')).length, path);
});
test('blocks fine-grained tokens, temporary cloud keys and renamed service accounts', () => {
  for (const value of ['github' + '_pat_' + 'a'.repeat(40), 'AS' + 'IA' + 'A'.repeat(16), JSON.stringify({ type: 'service_' + 'account' })]) {
    assert.ok(violations('innocent.json', Buffer.from(value)).length);
  }
});
test('pre-push rejects every direct main update, including deletion, but allows topic branches', () => {
  for (const local of ['refs/heads/main abc', '(delete) ' + '0'.repeat(40)]) {
    const result = spawnSync('sh', ['.githooks/pre-push'], { input: `${local} refs/heads/main def\n`, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pull-request merge/);
  }
  assert.equal(spawnSync('sh', ['.githooks/pre-push'], { input: 'refs/heads/topic abc refs/heads/topic def\n' }).status, 0);
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
