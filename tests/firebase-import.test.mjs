import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const importer = resolve("infra/import-firebase-config.mjs");
const example = { apiKey: "public-example", authDomain: "example.firebaseapp.com", projectId: "example", appId: "1:123:web:abc", measurementId: "G-EXAMPLE" };

async function files(source) {
  const folder = await mkdtemp(join(tmpdir(), "dede-firebase-"));
  const input = join(folder, "config"), target = join(folder, "ui.env");
  await writeFile(input, source, { mode: 0o600 });
  await writeFile(target, "DEDE_API_TOKEN=synthetic-test-only\nDEDE_TEST_MODE=experimental_text\n", { mode: 0o600 });
  return { folder, input, target };
}

test("import preserves existing runtime values and exports only client fields", async () => {
  const f = await files(JSON.stringify(example));
  try {
    const result = spawnSync(process.execPath, [importer, f.input, f.target], { encoding: "utf8" });
    assert.equal(result.status, 0);
    const env = await readFile(f.target, "utf8");
    assert.match(env, /DEDE_API_TOKEN=synthetic-test-only/);
    const config = JSON.parse(env.split("DEDE_FIREBASE_WEB_CONFIG=")[1]);
    assert.equal(config.projectId, example.projectId);
    assert.equal(config.measurementId, undefined);
    assert.ok(!result.stdout.includes(example.apiKey));
    assert.ok(!result.stdout.includes("synthetic-test-only"));
  } finally { await rm(f.folder, { recursive: true }); }
});

test("pasted setup script is parsed without executing its statements", async () => {
  const body = `const firebaseConfig = { apiKey: "public-example", authDomain: "example.firebaseapp.com", projectId: "example", appId: "1:123:web:abc" }; throw new Error("This code must not run");`;
  const f = await files(body);
  try { assert.equal(spawnSync(process.execPath, [importer, f.input, f.target]).status, 0); }
  finally { await rm(f.folder, { recursive: true }); }
});

test("private credentials and insecure file permissions fail before replacing runtime config", async () => {
  for (const kind of ["private", "permission"]) {
    const f = await files(JSON.stringify(kind === "private" ? { ...example, private_key: "test-only" } : example));
    try {
      if (kind === "permission") await chmod(f.input, 0o644);
      const original = await readFile(f.target, "utf8");
      assert.notEqual(spawnSync(process.execPath, [importer, f.input, f.target]).status, 0);
      assert.equal(await readFile(f.target, "utf8"), original);
    } finally { await rm(f.folder, { recursive: true }); }
  }
});
