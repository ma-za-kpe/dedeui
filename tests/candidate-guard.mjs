// Run only in an isolated --network none container with live enabled and missing
// expected identity. Exercises the real routes; no model/server is stubbed.
import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000";
const status = await (await fetch(base + "/api/connection")).json();
assert.equal(status.configured, true);
assert.equal(status.inferenceEnabled, true);
assert.equal(status.identityMatched, false);
assert.equal(status.ready, false);
const form = new FormData();
form.set("synthetic", "true"); form.set("text", "Fictional test."); form.set("timezone", "UTC");
const result = await fetch(base + "/api/turn", { method: "POST", headers: { Origin: "http://localhost:3000" }, body: form });
assert.equal(result.status, 503);
assert.match((await result.json()).message, /identity is missing or mismatched/);
console.log("PASS: configured/live-enabled routes reject missing candidate identity; network disabled, no model requests.");
