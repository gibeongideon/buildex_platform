import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
