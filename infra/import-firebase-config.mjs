// Import client configuration as data. Never evaluate a pasted Firebase setup script.
import { readFile, writeFile, rename, lstat } from "node:fs/promises";

const [source, target] = process.argv.slice(2);
if (!source || !target) throw new Error("Provide config source and private runtime env destination");
for (const path of [source, target]) {
  const info = await lstat(path);
  if (!info.isFile() || (info.mode & 0o777) !== 0o600 || info.uid !== process.getuid()) throw new Error("Owner-held mode 0600 files required");
}
const raw = await readFile(source, "utf8");
if (/private_key|privateKey|BEGIN [A-Z ]*PRIVATE KEY|refresh_token|client_secret/.test(raw)) throw new Error("Private credentials cannot become web configuration");
const fields = ["apiKey", "authDomain", "projectId", "appId", "messagingSenderId", "storageBucket"];
let parsed;
try { parsed = JSON.parse(raw); } catch { parsed = null; }
const config = {};
for (const field of fields) {
  const value = parsed?.[field] ?? raw.match(new RegExp(`\\b${field}\\s*:\\s*(["'])([a-zA-Z0-9_.:/-]+)\\1`))?.[2];
  if (value !== undefined) {
    if (typeof value !== "string" || !/^[a-zA-Z0-9_.:/-]+$/.test(value)) throw new Error("Invalid client configuration value");
    config[field] = value;
  }
}
if (!["apiKey", "authDomain", "projectId", "appId"].every(field => config[field])) throw new Error("Incomplete Firebase client configuration");
const previous = await readFile(target, "utf8");
const lines = previous.split(/\r?\n/).filter(line => !line.startsWith("DEDE_FIREBASE_WEB_CONFIG="));
const replacement = `${lines.join("\n").trimEnd()}\nDEDE_FIREBASE_WEB_CONFIG=${JSON.stringify(config)}\n`;
const temp = `${target}.firebase-import`;
await writeFile(temp, replacement, { mode: 0o600, flag: "wx" });
await rename(temp, target);
console.log("Firebase client configuration imported; private runtime values preserved; analytics disabled.");
