import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    Standalone output: `next build` emits `.next/standalone` with `server.js` and
    only the node_modules the server actually needs. The deploy ships that
    directory instead of the repository, which matters here because the target
    box has 1 vCPU and under 1 GB of RAM — a Next build on it would run out of
    memory. CI builds; the server only runs.

    Note for the deploy: standalone deliberately does NOT copy `public/` or
    `.next/static`, so the pipeline copies both in beside `server.js`.
  */
  output: "standalone",

  /*
    The dev indicator defaults to bottom-left, which is exactly where the app
    shell puts the signed-in user block — so in development it sat on top of the
    person's name and role on every portal and console page. Moved to the corner
    that only carries demo chrome; the Demo controls button lifts above it.
  */
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
