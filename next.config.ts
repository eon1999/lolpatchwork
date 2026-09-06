import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Every image on the site is a Data Dragon asset, already compressed at
    // exactly the sizes we render (64px icons, 120px squares, pre-scaled
    // portraits). Optimizing them buys a few hundred bytes each and costs one
    // billable Vercel transformation per unique (source, width, DPR) — so
    // serve them straight from Riot's CDN instead.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "ddragon.leagueoflegends.com" },
    ],
  },
};

export default nextConfig;
