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
      CI runs the suite against the *production* build — the same standalone
      bundle the pipeline then ships — so a defect that only appears in a
      production render cannot slip through a green dev-mode run. Locally it
      stays `next dev`, so the suite reuses whatever server is already up.
    */
    command: process.env.CI
      ? `npx next start --port ${PORT}`
      : `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
