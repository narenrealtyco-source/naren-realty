import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NAREN REALTY",
    short_name: "NAREN REALTY",
    description: "Premium real estate services by NAREN REALTY.",
    start_url: "/",
    display: "standalone",
    background_color: "#06142e",
    theme_color: "#10243A",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
