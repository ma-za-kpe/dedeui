// Only runs inside the disposable Pages build image, never against the checkout.
import { rm, writeFile } from 'node:fs/promises';
if (process.cwd() !== '/app' || process.env.DEDE_PAGES_BUILD !== 'true') throw new Error('Pages preparation requires the isolated /app build context');
const raw = JSON.parse(process.env.DEDE_FIREBASE_WEB_CONFIG || 'null');
const allowed = ['apiKey', 'authDomain', 'projectId', 'appId', 'messagingSenderId', 'storageBucket'];
if (raw && (typeof raw !== 'object' || Object.keys(raw).some(k => !allowed.includes(k)))) throw new Error('Only public Firebase web fields may be published');
if (raw && !['apiKey', 'authDomain', 'projectId', 'appId'].every(k => typeof raw[k] === 'string' && /^[a-zA-Z0-9_.:/-]+$/.test(raw[k]))) throw new Error('Incomplete public Firebase configuration');
await writeFile('public/firebase-config.json', JSON.stringify(raw ? { configured: true, config: raw } : { configured: false }));
await writeFile('public/.nojekyll', '');
await rm('/app/app/api', { recursive: true });
