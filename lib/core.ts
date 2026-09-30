import "server-only";
export function coreConfig() {
  if (!process.env.DEDE_CORE_URL || !process.env.DEDE_API_TOKEN) return null;
  try { const url = new URL(process.env.DEDE_CORE_URL); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null; return { base: url.origin, token: process.env.DEDE_API_TOKEN }; } catch { return null; }
}
export async function coreFetch(path: string, init: RequestInit = {}) {
  const config = coreConfig(); if (!config) throw new Error("disabled");
  return fetch(config.base + path, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(120_000), headers: { Authorization: `Bearer ${config.token}`, ...init.headers } });
}
export const privateHeaders = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

export function liveEnabled() { return process.env.DEDE_ENABLE_LIVE === "true"; }
export function testMode() {
  const mode = process.env.DEDE_TEST_MODE || "voice";
  if (mode !== "voice" && mode !== "experimental_text") throw new Error("Invalid test mode");
  return mode;
}

export async function candidateIdentity() {
  const expected = process.env.DEDE_EXPECTED_ARTIFACT_SHA256 || "";
  const model = process.env.DEDE_EXPECTED_MODEL || "";
  const quantization = process.env.DEDE_EXPECTED_QUANTIZATION || "";
  if (!/^[a-f0-9]{64}$/.test(expected) || !model || !quantization) return false;
  const response = await coreFetch("/v1/model-info");
  if (!response.ok) return false;
  const identity = await response.json();
  return identity.model === model && identity.artifact_sha256 === expected && identity.quantization === quantization && identity.identity_basis === "operator_declared_not_attested" && identity.mode === (testMode() === "experimental_text" ? "text_only" : "voice");
}
