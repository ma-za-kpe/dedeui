import assert from "node:assert/strict";
import { test } from "node:test";
import { encodedAudioMime } from "../lib/audio-format.ts";
test("detects Opus/OGG instead of labelling all speech WAV", () => {
  assert.equal(encodedAudioMime(Buffer.from("OggS" + "\0".repeat(24)).toString("base64")), "audio/ogg");
});
test("accepts actual RIFF WAVE header shape", () => {
  assert.equal(encodedAudioMime(Buffer.from("RIFF1234WAVE" + "\0".repeat(20)).toString("base64")), "audio/wav");
});
test("unknown or malformed bytes fail rather than simulate speech", () => {
  assert.throws(() => encodedAudioMime(Buffer.from("not an audio file").toString("base64")));
  assert.throws(() => encodedAudioMime("!!!!"));
});
