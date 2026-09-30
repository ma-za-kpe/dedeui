import assert from "node:assert/strict";
import { test } from "node:test";
import { welcomeText } from "../lib/welcome.ts";

test("local introduction uses only the supplied first name", () => {
  const text = welcomeText("  Maku Namutebi  ");
  assert.match(text, /^Hi Maku,/);
  assert.ok(!text.includes("Namutebi"));
  assert.match(text, /I’m an AI/);
});
test("signed-out introduction has no invented identity or history", () => {
  assert.equal(welcomeText(null), welcomeText("   "));
  assert.match(welcomeText(null), /^Hi, I’m DeDe/);
  assert.ok(!welcomeText(null).includes("remember"));
});
test("name controls are removed and output length is bounded", () => {
  assert.ok(!welcomeText("Ma\u0000ku Person").includes("\u0000"));
  assert.ok(welcomeText("X".repeat(1000)).length < 220);
});
