// Reports paths and rule names only, never matched credential material.
import { readdir, readFile, lstat } from 'node:fs/promises';
import { join, relative } from 'node:path';
export function violations(path, bytes) {
  const hits = [];
  if (/(^|\/)(\.env[^/]*|\.firebase|node_modules|\.next|\.git)(\/|$)|(^|\/)public\/local-runtime\/|service-account.*\.json$|\.(gguf|onnx|safetensors|pem|key)$/i.test(path)) hits.push('forbidden generated/credential/model path');
  if (bytes.length > 5 * 1024 * 1024) hits.push('file exceeds 5 MiB; store artifacts outside Git');
  const text = bytes.toString('utf8');
  const rules = {
    'private key': /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    'GitHub token': /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
    'Hugging Face token': /\bhf_[A-Za-z0-9]{30,}\b/,
    'AWS access key': /\bAKIA[0-9A-Z]{16}\b/,
    'age secret': /AGE-SECRET-KEY-1[0-9A-Z]{50,}/,
    'credential assignment': /(?:DEDE_API_TOKEN|DEDE_R2_SECRET_ACCESS_KEY|client_secret|private_key|password)\s*["']?\s*[=:]\s*["']?[A-Za-z0-9_+/=-]{24,}/i,
    'credential URL': /https?:\/\/[^\s/@:]+:[^\s/@]+@/,
  };
  for (const [name, pattern] of Object.entries(rules)) if (pattern.test(text)) hits.push(name);
  return hits;
}
async function scan(root, dir = root) {
  const failures = [];
  for (const entry of await readdir(dir)) {
    const path = join(dir, entry), name = relative(root, path);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) { failures.push(`${name}: symlinks are not allowed`); continue; }
    if (stat.isDirectory()) failures.push(...await scan(root, path));
    else for (const rule of violations(name, await readFile(path))) failures.push(`${name}: ${rule}`);
  }
  return failures;
}
if (process.argv[1]?.endsWith('/check-repository.mjs')) {
  const failures = await scan(process.cwd());
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  else console.log('PASS: repository credential/path/size checks');
}
