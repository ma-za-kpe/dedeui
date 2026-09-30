"use client";

import { useEffect, useRef, useState } from "react";
import type { Auth, User } from "firebase/auth";
import { appPath } from '@/lib/app-path';

export function useAccount(onIdentityChange?: () => void) {
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const auth = useRef<Auth | null>(null);
  const actions = useRef<typeof import("firebase/auth") | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);
  const active = useRef(true);
  const identity = useRef<string | null | undefined>(undefined);
  const identityChanged = useRef(onIdentityChange);

  useEffect(() => { identityChanged.current = onIdentityChange; }, [onIdentityChange]);

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    async function prepare() {
      const configPath = process.env.NEXT_PUBLIC_STATIC_SITE === 'true' ? '/firebase-config.json' : '/api/firebase-config';
      const data = await (await fetch(appPath(configPath), { cache: "no-store" })).json();
      if (!data.configured || cancelled) { if (!cancelled) setLoading(false); return; }
      const [{ getApps, initializeApp }, sdk] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
      if (cancelled) return;
      const app = getApps().find(app => app.name === "dede-account") || initializeApp(data.config, "dede-account");
      const instance = sdk.getAuth(app);
      await sdk.setPersistence(instance, sdk.browserSessionPersistence);
      if (cancelled) return;
      auth.current = instance; actions.current = sdk;
      unsubscribe.current = sdk.onAuthStateChanged(instance, next => {
        if (cancelled) return;
        const uid = next?.uid || null;
        if (identity.current !== uid) { identity.current = uid; identityChanged.current?.(); }
        setUser(next);
        setLoading(false);
      });
      setConfigured(true);
    }
    void prepare().catch(() => { if (!cancelled) { setLoading(false); setNotice("Account setup is unavailable. Check the Firebase configuration and browser connection."); } });
    return () => { cancelled = true; active.current = false; unsubscribe.current?.(); };
  }, []);

  async function signIn() {
    setBusy(true); setNotice("");
    try {
      const sdk = actions.current;
      if (!sdk || !auth.current) return;
      // SDK is prepared before the click, preserving the browser's popup user activation.
      // No analytics initialization or account identity in synthetic model prompts.
      if (auth.current.currentUser) await sdk.signOut(auth.current);
      else {
        const provider = new sdk.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await sdk.signInWithPopup(auth.current, provider);
      }
    } catch (error) {
      if (!active.current) return;
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      setNotice(code === "auth/popup-closed-by-user" ? "Sign-in was cancelled." : code === "auth/unauthorized-domain"
        ? "This app's domain needs to be authorized in Firebase before Google sign-in can finish."
        : code === "auth/operation-not-allowed" ? "Enable the Google sign-in provider in Firebase to finish setup."
        : code === "auth/popup-blocked" ? "Allow the sign-in popup, then try again."
        : "Google sign-in couldn't finish. Check the connection and Firebase provider setup.");
    } finally { if (active.current) setBusy(false); }
  }

  return { configured, busy, loading, user, notice, signIn };
}
