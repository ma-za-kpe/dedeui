// Operator-only: verify actual voice services before updating private runtime config.
import assert from "node:assert/strict";
import { lstat, readFile, open, rename, unlink } from "node:fs/promises";

const path = process.argv[2];
assert.ok(path, "Runtime config path required");
const stat = await lstat(path);
assert.ok(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0 && stat.uid === process.getuid());
const old = await readFile(path, "utf8");
function value(key) { return old.split(/\r?\n/).find(line => line.startsWith(key + "="))?.slice(key.length + 1); }
const token = value("DEDE_API_TOKEN");
assert.ok(token);
const base = "http://host.docker.internal:18086";
const response = await fetch(base + "/v1/model-info", { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
assert.equal(response.status, 200);
const identity = await response.json();
assert.equal(identity.mode, "voice");
assert.equal(identity.model, value("DEDE_EXPECTED_MODEL"));
assert.equal(identity.quantization, value("DEDE_EXPECTED_QUANTIZATION"));
assert.equal(identity.artifact_sha256, value("DEDE_EXPECTED_ARTIFACT_SHA256"));
const health = await (await fetch(base + "/healthz", { signal: AbortSignal.timeout(10000) })).json();
assert.ok(health.llm === true && health.perception === true && health.mode === "voice" && health.data_policy === "synthetic_only");
const lines = old.split(/\r?\n/).filter(line => line && !/^DEDE_(CORE_URL|TEST_MODE)=/.test(line));
const next = [...lines, `DEDE_CORE_URL=${base}`, "DEDE_TEST_MODE=voice", ""].join("\n");
const temporary = `${path}.voice-${process.pid}`;
let handle;
try {
  handle = await open(temporary, "wx", 0o600);
  await handle.writeFile(next); await handle.sync(); await handle.close(); handle = null;
  await rename(temporary, path);
} finally { await handle?.close(); await unlink(temporary).catch(() => {}); }
console.log("Verified actual voice health and artifact identity; private runtime config updated. No credentials printed.");
