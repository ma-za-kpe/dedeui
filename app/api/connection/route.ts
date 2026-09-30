export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ ready: false, mode: "local", qualified: false, requiresAuthentication: true, message: "Models load in your browser. Sign in before sending. Server inference and upload forwarding are disabled." }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
