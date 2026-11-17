import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NAREN REALTY",
    short_name: "NAREN",
    description: "Premium real estate and home services by NAREN REALTY.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#06142e",
    theme_color: "#10243A",
    icons: [
      { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
