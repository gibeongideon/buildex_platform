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

  /*
    "Next.js" on every response tells an attacker which CVEs to try and tells a
    visitor nothing.
  */
  poweredByHeader: false,

  async headers() {
    /*
      nginx sets three of these for the domain, but only for the domain: the
      bare IP at 143.244.137.254 goes through a server block that does not, and
      any future host would start with none. Setting them in the app means they
      travel with the application rather than with one server's configuration.

      HSTS stays in nginx and is deliberately absent here — it is only valid
      over TLS, which is terminated there, and the app cannot tell whether the
      request that reached it arrived over HTTPS.

      No Content-Security-Policy yet. A useful one for this app needs a nonce
      threaded through the document, and a CSP written without that either
      blocks Next's own inline bootstrap or is loose enough to be decoration.
      It is worth doing properly, not quickly.
    */
    const headers = [
      // Nothing embeds this app, so framing it is only ever clickjacking.
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // The app asks for none of these, so no page should be able to.
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
    ];

    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
