// Actual Next routes in a network-disabled Docker container: no fake model replies.
// Set live true, DEDE_TEST_MODE=experimental_text and an unreachable core URL/token,
// but leave expected artifact identity unset so no outbound request can occur.
import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000";
const status = await (await fetch(base + "/api/connection")).json();
assert.equal(status.mode, "experimental_text");
assert.equal(status.qualified, false);
assert.equal(status.identityMatched, false);
const form = new FormData();
form.set("synthetic", "true"); form.set("text", "Fictional test"); form.set("timezone", "UTC");
form.set("file", new Blob(["not actual audio"], { type: "audio/wav" }), "test.wav");
const refused = await fetch(base + "/api/turn", { method: "POST", headers: { Origin: "http://localhost:3000" }, body: form });
assert.equal(refused.status, 400);
assert.match((await refused.json()).message, /accepts text only/);
form.delete("file");
const blocked = await fetch(base + "/api/turn", { method: "POST", headers: { Origin: "http://localhost:3000" }, body: form });
assert.equal(blocked.status, 503);
assert.match((await blocked.json()).message, /identity is missing or mismatched/);
console.log("PASS: text-only metadata, upload refusal and identity guard; no inference, no speech.");
