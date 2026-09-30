import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "DeDe · A little room for your day", description: "DeDe’s temporary, synthetic-only testing room.", icons: { icon: "/brand/icon-192.png", apple: "/brand/icon-192.png" }, appleWebApp: { capable: true, title: "DeDe", statusBarStyle: "default" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f3ece0" };
const themeBootstrap = `(function(){var p="system";try{var v=localStorage.getItem("dede-theme");if(v==="light"||v==="dark")p=v;}catch(e){}var t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;document.documentElement.dataset.preference=p;document.documentElement.dataset.theme=t;})()`;
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" suppressHydrationWarning><head><script id="dede-theme-init" dangerouslySetInnerHTML={{ __html: themeBootstrap }}/></head><body>{children}</body></html>; }
