import { defineConfig, devices } from "@playwright/test";

/*
  The default dev port, deliberately. Next.js refuses to run a second dev
  server for the same directory, so the suite reuses whatever `npm run dev`
  already started rather than trying to bring up its own on a side port.
*/
const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    /*
      CI runs the suite against the standalone bundle the pipeline actually
      ships — not `next start`, which Next refuses to pair with
      `output: "standalone"`, and not `next dev`. So a defect that only appears
      in the shipped artifact cannot slip through a green run.

      Requires `npm run build && npm run package:standalone` first; the workflow
      does both before invoking Playwright. Locally it stays `next dev`, so the
      suite reuses whatever server is already up.
    */
    command: process.env.CI
      ? `node .next/standalone/server.js`
      : `npx next dev --port ${PORT}`,
    env: process.env.CI ? { PORT: String(PORT), HOSTNAME: "127.0.0.1" } : {},
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
