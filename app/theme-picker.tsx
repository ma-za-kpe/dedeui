"use client";

import { useSyncExternalStore } from "react";

type Theme = "system" | "light" | "dark";
const key = "dede-theme";
const event = "dede-theme-change";
const valid = (value: string | null): Theme => value === "dark" || value === "light" ? value : "system";

function apply(preference: Theme) {
  const theme = preference === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
  document.documentElement.dataset.preference = preference;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#201d19" : "#f3ece0");
}

function subscribe(notify: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const update = () => { apply(valid(document.documentElement.dataset.preference || null)); notify(); };
  const storage = (e: StorageEvent) => {
    if (e.key !== key && e.key !== null) return;
    apply(valid(e.newValue)); notify();
  };
  update();
  window.addEventListener(event, update);
  window.addEventListener("storage", storage);
  media.addEventListener("change", update);
  return () => {
    window.removeEventListener(event, update);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", update);
  };
}

export default function ThemePicker() {
  const preference = useSyncExternalStore(subscribe, () => valid(document.documentElement.dataset.preference || null), () => "system" as Theme);
  return <label className="theme-picker"><span className="sr-only">Color theme</span><select aria-label="Color theme" value={preference} onChange={e => {
    const next = valid(e.target.value);
    apply(next);
    try { localStorage.setItem(key, next); } catch { /* Still usable for this tab when storage is blocked. */ }
    window.dispatchEvent(new Event(event));
  }}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
