// Retired workshop proxy: never parse or forward conversation uploads.
// Local inference runs in a browser worker after the UI's Google sign-in gate.
export const dynamic = 'force-dynamic';
export async function POST() {
  return Response.json({ message: 'Server conversation uploads are disabled. Sign in and use on-device inference.' }, {
    status: 410,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
