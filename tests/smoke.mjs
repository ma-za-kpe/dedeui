import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
const base = process.env.TEST_ORIGIN || "http://localhost:3000";
const page = await fetch(base);
assert.equal(page.status, 200);
assert.equal(page.headers.get("x-frame-options"), "DENY");
const html = await page.text();
assert.match(html, /Hi, I’m DeDe/);
assert.match(html, /aria-label="Conversation options"/);
const bootstrap = html.match(/<script id="dede-theme-init">([\s\S]*?)<\/script>/)?.[1];
assert.ok(bootstrap, "Pre-paint theme bootstrap is served");
for (const [stored, systemDark, expected] of [["dark", false, "dark"], ["light", true, "light"], [null, true, "dark"], [null, false, "light"], ["invalid", true, "dark"], ["blocked", true, "dark"]]) {
  const dataset = {};
  runInNewContext(bootstrap, {
    localStorage: { getItem() { if (stored === "blocked") throw new Error("blocked"); return stored; } },
    matchMedia: () => ({ matches: systemDark }),
    document: { documentElement: { dataset } },
  });
  assert.equal(dataset.theme, expected);
}
const manifest = await (await fetch(base + "/manifest.webmanifest")).json();
assert.equal(manifest.display, "standalone");
assert.equal(manifest.short_name, "DeDe");
for (const icon of manifest.icons) assert.equal((await fetch(base + icon.src)).status, 200);
const status = await fetch(base + "/api/connection");
assert.match(status.headers.get("cache-control"), /no-store/);
assert.equal((await status.json()).ready, false);
const form = new FormData(); form.set("synthetic", "true"); form.set("text", "Fictional test."); form.set("timezone", "UTC");
const disabled = await fetch(base + "/api/turn", { method: "POST", headers: { Origin: "http://localhost:3000" }, body: form });
assert.equal(disabled.status, 410);
assert.match((await disabled.json()).message, /uploads are disabled/);
const foreign = await fetch(base + "/api/turn", { method: "POST", headers: { Origin: "https://example.invalid" }, body: form });
assert.equal(foreign.status, 410);
const sw = await fetch(base + "/sw.js"); assert.equal(sw.status, 200);
assert.match(sw.headers.get("cache-control"), /no-cache/);
assert.equal((await fetch(base + "/offline.html")).status, 200);
console.log("PASS: page, theme selector and six bootstrap cases, security headers, manifest/icons, disconnected status, retired uploads for both origins, service worker and offline page. No model requests.");
