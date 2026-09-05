import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    maximumRedirects: 0,
    remotePatterns: [
      new URL("https://play.pokemonshowdown.com/sprites/gen5/**"),
      new URL("https://play.pokemonshowdown.com/sprites/gen5-shiny/**"),
      new URL("https://play.pokemonshowdown.com/sprites/itemicons/**"),
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
