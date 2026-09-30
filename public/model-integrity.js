// Transformers uses a one-byte GET to discover download size. Metadata is not
// an artifact: never pass this exemption to cache reads or cache writes.
export function artifactRequestOptions(input, init) {
  return {
    ...init,
    method: (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase(),
    headers: new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)),
  };
}

export function isArtifactMetadataRequest(options) {
  return options.method === 'HEAD' ||
    (options.method === 'GET' && options.headers.get('range') === 'bytes=0-0');
}

export async function verifyArtifact(url, response, hashes) {
  const key = new URL(url).pathname.slice(1);
  if (!key.endsWith('.onnx') || !response.ok) return response;
  if (!hashes[key]) throw new Error('Unlisted model artifact blocked.');
  if (response.status !== 200 || response.headers.has('content-range')) {
    throw new Error('Incomplete model download blocked. Please retry loading.');
  }
  const bytes = await response.arrayBuffer();
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  if (digest !== hashes[key]) throw new Error('Model checksum mismatch. Remove downloaded models and retry.');
  return new Response(bytes, { status: response.status, headers: response.headers });
}

export async function verifyArtifactFetch(url, response, options, hashes) {
  // Leave metadata bodies untouched: the library cancels a 200 response when
  // the host ignores Range. Do not download the full file just for progress.
  return isArtifactMetadataRequest(options) ? response : verifyArtifact(url, response, hashes);
}
