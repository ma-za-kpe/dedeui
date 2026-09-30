import assert from "node:assert/strict";
const response = await fetch("http://localhost:3000/api/firebase-config");
assert.match(response.headers.get("cache-control"), /no-store/);
const data = await response.json();
if (process.env.EXPECT_CONFIG === "valid") {
  assert.equal(data.configured, true);
  assert.deepEqual(Object.keys(data.config).sort(), ["apiKey", "appId", "authDomain", "projectId"].sort());
  assert.equal(data.config.measurementId, undefined);
  assert.equal(data.config.api_token, undefined);
} else assert.deepEqual(data, { configured: false });
console.log("PASS: Firebase client config route exposes only selected public fields, or fails closed.");
