import test from 'node:test';
import assert from 'node:assert/strict';
import { artifactRequestOptions, isArtifactMetadataRequest, verifyArtifact, verifyArtifactFetch } from '../public/model-integrity.js';

const url = 'https://huggingface.co/example/resolve/pinned/model.onnx';
const bytes = new TextEncoder().encode('complete synthetic test artifact');
const hash = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex');
const hashes = { 'example/resolve/pinned/model.onnx': hash };
const options = init => artifactRequestOptions(url, init);

test('one-byte metadata GET is not compared with full artifact checksum', async () => {
  const response = new Response(bytes.slice(0, 1), { status: 206, headers: { 'Content-Range': 'bytes 0-0/32' } });
  assert.equal(await verifyArtifactFetch(url, response, options({ headers: { Range: 'bytes=0-0' } }), hashes), response);
  assert.equal(response.bodyUsed, false);
});
test('ignored Range response remains unread and cancellable', async () => {
  const response = new Response(bytes);
  assert.equal(await verifyArtifactFetch(url, response, options({ headers: new Headers({ range: 'bytes=0-0' }) }), hashes), response);
  assert.equal(response.bodyUsed, false);
  await response.body.cancel();
});
test('HEAD and inherited Request metadata options are recognized', async () => {
  const head = artifactRequestOptions(new Request(url, { method: 'HEAD' }));
  const response = new Response(null);
  assert.equal(await verifyArtifactFetch(url, response, head, hashes), response);
  assert.equal(isArtifactMetadataRequest(artifactRequestOptions(new Request(url, { headers: { Range: 'bytes=0-0' } }))), true);
  assert.equal(isArtifactMetadataRequest(artifactRequestOptions(new Request(url, { method: 'HEAD' }), { method: 'GET', headers: {} })), false);
});
test('full GET and cache verification accept only correct complete bytes', async () => {
  assert.deepEqual(new Uint8Array(await (await verifyArtifactFetch(url, new Response(bytes), options(), hashes)).arrayBuffer()), bytes);
  assert.deepEqual(new Uint8Array(await (await verifyArtifact(url, new Response(bytes), hashes)).arrayBuffer()), bytes);
  await assert.rejects(verifyArtifact(url, new Response('corrupted'), hashes), /checksum mismatch/);
  await assert.rejects(verifyArtifactFetch(url, new Response('corrupted'), options(), hashes), /checksum mismatch/);
});
test('partial artifacts are rejected on download and cache paths', async () => {
  await assert.rejects(verifyArtifactFetch(url, new Response(bytes, { status: 206 }), options(), hashes), /Incomplete/);
  await assert.rejects(verifyArtifact(url, new Response(bytes, { headers: { 'Content-Range': 'bytes 0-31/32' } }), hashes), /Incomplete/);
  await assert.rejects(verifyArtifact(url, new Response(bytes.slice(0, 1), { status: 206 }), hashes), /Incomplete/);
});
test('arbitrary ranges and unknown artifacts do not bypass integrity', async () => {
  const request = options({ headers: { Range: 'bytes=1-2' } });
  assert.equal(isArtifactMetadataRequest(request), false);
  await assert.rejects(verifyArtifactFetch(url, new Response(bytes, { status: 206 }), request, hashes), /Incomplete/);
  await assert.rejects(verifyArtifact(url, new Response(bytes), {}), /Unlisted/);
});
