import { test, expect } from "@playwright/test";

const NEW_PATHS = ["/marketplace/services", "/join/account", "/account", "/marketplace"];
const WIDTHS = [360, 768, 1024, 1440];

test("instrumented sweep", async ({ page }) => {
  test.setTimeout(170_000);
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 200)));
  page.on("crash", () => console.log("PAGE CRASHED"));
  const bad: string[] = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of NEW_PATHS) {
      console.log(`--> goto ${path} @${width}`);
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 15_000 });
      await page.waitForTimeout(900);
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth - root.clientWidth;
      });
      console.log(`    ok ${path} @${width} overflow=${overflow}`);
      if (overflow > 1) bad.push(`${path} @${width} overflows by ${overflow}px`);
    }
  }
  expect(bad, bad.join("\n")).toEqual([]);
});
