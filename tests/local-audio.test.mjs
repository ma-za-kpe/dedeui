import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wavBase64 } from '../lib/local-audio.ts';
test('local synthesis creates a valid mono PCM WAV and clips samples', () => {
  const bytes = Buffer.from(wavBase64(new Float32Array([-2, 0, 2]), 16000), 'base64');
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  assert.equal(bytes.readUInt32LE(24), 16000);
  assert.equal(bytes.readUInt32LE(40), 6);
  assert.equal(bytes.readInt16LE(44), -32768);
  assert.equal(bytes.readInt16LE(48), 32767);
});
test('invalid local synthesis output is not presented as audio', () => {
  assert.throws(() => wavBase64(new Float32Array(), 16000));
  assert.throws(() => wavBase64(new Float32Array([0]), 0));
});
