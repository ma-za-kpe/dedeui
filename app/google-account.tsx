"use client";

import type { useAccount } from "./use-account";

export default function GoogleAccount({ account }: { account: ReturnType<typeof useAccount> }) {
  const { configured, busy, user, notice, signIn } = account;
  return <div className="account-card"><h2>Your account</h2><p>{user ? `Signed in${user.displayName ? ` as ${user.displayName}` : ""}.` : "Sign in with your Google account."} Account sign-in and encrypted vault unlock are separate. Cloud sync is still being connected.</p><button className="outline-button" disabled={!configured || busy} onClick={signIn}>{busy ? "Please wait…" : user ? "Sign out" : "Continue with Google"}</button>{!configured && <p>Firebase configuration is pending.</p>}{notice && <p className="notice" role="status">{notice}</p>}</div>;
}
