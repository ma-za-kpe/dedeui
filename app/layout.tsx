import type { Metadata, Viewport } from "next";
import "./globals.css";
import { appPath } from '@/lib/app-path';
export const metadata: Metadata = { title: "DeDe · A little room for your day", description: "DeDe’s temporary, synthetic-only testing room.", manifest: appPath('/manifest.webmanifest'), icons: { icon: appPath('/brand/icon-192.png'), apple: appPath('/brand/icon-192.png') }, appleWebApp: { capable: true, title: "DeDe", statusBarStyle: "default" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f3ece0" };
const themeBootstrap = `(function(){var p="system";try{var v=localStorage.getItem("dede-theme");if(v==="light"||v==="dark")p=v;}catch(e){}var t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;document.documentElement.dataset.preference=p;document.documentElement.dataset.theme=t;})()`;
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" suppressHydrationWarning><head><style>{`@font-face{font-family:Atkinson;src:url('${appPath('/fonts/AtkinsonHyperlegibleNext-Variable.ttf')}') format('truetype');font-weight:100 900;font-display:swap}`}</style><script id="dede-theme-init" dangerouslySetInnerHTML={{ __html: themeBootstrap }}/></head><body>{children}</body></html>; }
