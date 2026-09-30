// Loopback/container test server for the exported site, not a production backend.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('/app/out');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.ttf': 'font/ttf' };
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith('/dedeui/')) throw new Error('Outside site');
    const file = resolve(root, `.${path.slice('/dedeui'.length)}${path.endsWith('/') ? 'index.html' : ''}`);
    if (!file.startsWith(`${root}/`)) throw new Error('Outside root');
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(3000, '0.0.0.0');
