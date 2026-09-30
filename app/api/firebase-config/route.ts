import { privateHeaders } from "@/lib/core";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = JSON.parse(process.env.DEDE_FIREBASE_WEB_CONFIG || "null");
    const fields = ["apiKey", "authDomain", "projectId", "appId", "messagingSenderId", "storageBucket"];
    if (!raw || ["private_key", "privateKey", "client_secret", "refresh_token"].some(key => key in raw)) throw new Error("invalid");
    const config: Record<string, string> = {};
    for (const key of fields) if (typeof raw[key] === "string" && /^[a-zA-Z0-9_.:/-]+$/.test(raw[key])) config[key] = raw[key];
    if (!["apiKey", "authDomain", "projectId", "appId"].every(key => config[key])) throw new Error("missing");
    return Response.json({ configured: true, config }, { headers: privateHeaders });
  } catch {
    return Response.json({ configured: false }, { headers: privateHeaders });
  }
}
