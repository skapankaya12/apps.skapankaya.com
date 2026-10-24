import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pinned to this folder. Turbopack otherwise takes the highest folder with
    // a lockfile as the root, and a stray package-lock.json in the home folder
    // made it watch all of it: the dev server ran out of memory and restarted
    // every few minutes, with compiles of ten minutes or more.
    root: path.resolve(__dirname),
  },
  // /browse became the Marketplace tab. Permanent, so search engines move
  // the page's standing across; the query string (?q=, ?category=) carries.
  async redirects() {
    return [{ source: "/browse", destination: "/marketplace", permanent: true }];
  },
};

export default nextConfig;
