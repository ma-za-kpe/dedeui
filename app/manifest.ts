import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "DeDe testing room", short_name: "DeDe", description: "Synthetic-only DeDe conversation testing", start_url: "/", display: "standalone", background_color: "#f3ece0", theme_color: "#f3ece0", icons: [
    { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ] };
}
