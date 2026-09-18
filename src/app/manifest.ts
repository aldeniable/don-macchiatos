import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Don Macchiatos Ops",
    short_name: "Don Ops",
    description: "Daily sales and expense tracker for branch staff.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1ea",
    theme_color: "#4a3428",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
