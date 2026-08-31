import { test, expect, type Page } from "@playwright/test";

/*
  Chapter 9 phase C1 — customer identity and the front door.

  Covers what the phase actually commits to: the four-step registration, the
  progressive business rule, deep-link clamping, the derived verification level,
  and the marketplace chrome knowing who is signed in.

  Labels are matched with anchored regexes because required fields render a
  trailing asterisk, so an exact string match would never hit — the same reason
  the onboarding spec does it.
*/

const HOMEOWNER = {
  name: "Grace Njeri",
  email: "grace.njeri@example.co.ke",
  phone: "+254712345699",
  password: "buildex2026",
  address: "Kamakis, Eastern Bypass",
  town: "Ruiru",
  county: "Kiambu",
};

const SHOP = {
  name: "Njoro Hardware",
  email: "buying@njorohardware.co.ke",
  phone: "+254712345688",
  password: "buildex2026",
  address: "Njoro Town, Main Street",
  town: "Njoro",
  county: "Nakuru",
  legalName: "Njoro Hardware Limited",
  tradingName: "Njoro Hardware",
  kraPin: "P098765432Z",
};

const STORE_KEY = "buildex.mock.v9";

/** Wipes the browser-local store so each test starts from the seeds. */
async function resetDemo(page: Page) {
  await page.goto("/marketplace");
  await page.evaluate(() => window.localStorage.clear());
}

/*
  Starts the next load signed out.

  Written as a partial store rather than by patching what is already there: the
  seeded database is only persisted on the first *mutation*, so a fresh visit
  that has read but not written leaves nothing in localStorage to patch. The
  mock store hydrates as `{ ...seed(), ...whatever is stored }`, so one field is
  a complete and legitimate override.
*/
async function signOut(page: Page) {
  await page.evaluate((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({ session: { role: "guest", manufacturerId: null, customerId: null } }),
    );
  }, STORE_KEY);
}

async function completeAccountStep(page: Page, who: typeof HOMEOWNER) {
  await page.goto("/join/account");
  await page.getByLabel(/^Full name/).fill(who.name);
  await page.getByLabel(/^Email address/).fill(who.email);
  await page.getByLabel(/^Mobile number/).fill(who.phone);
  await page.getByLabel(/^Password/).fill(who.password);
  await page.getByLabel(/^Confirm password/).fill(who.password);
  await page
    .getByRole("checkbox", { name: /accept the Buildex Connect marketplace terms/i })
    .click();
  await page.getByRole("checkbox", { name: /consent to Buildex processing/i }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/join\/verify-phone/);
}

async function completePhoneStep(page: Page) {
  await page.getByRole("button", { name: "Fill code" }).click();
  await page.getByRole("button", { name: /Verify and continue/i }).click();
  await expect(page).toHaveURL(/\/join\/profile/);
}

test.describe("customer registration", () => {
  test("a homeowner registers in four steps and lands on their account", async ({
    page,
  }) => {
    await resetDemo(page);
    await completeAccountStep(page, HOMEOWNER);
    await completePhoneStep(page);

    // Homeowner is the default, so no business fields should be asked for.
    await expect(page.getByLabel(/^Registered legal name/)).toHaveCount(0);

    await page.getByLabel(/^Physical address/).fill(HOMEOWNER.address);
    await page.getByLabel(/^Town or city/).fill(HOMEOWNER.town);
    await page.getByLabel(/^County/).selectOption(HOMEOWNER.county);
    await page.getByRole("button", { name: /^Continue/ }).click();

    await expect(page).toHaveURL(/\/join\/membership/);
    // Free is preselected: §9.40 says ordinary access must not feel punitive.
    await expect(page.getByRole("radio", { name: /Build Free/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.getByRole("button", { name: /Create my account/i }).click();

    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("heading", { name: /Welcome, Grace/ })).toBeVisible();
    await expect(page.getByText("Your account is ready")).toBeVisible();
  });

  test("choosing a business type asks for business details, and only then", async ({
    page,
  }) => {
    await resetDemo(page);
    await completeAccountStep(page, SHOP);
    await completePhoneStep(page);

    await expect(page.getByLabel(/^Registered legal name/)).toHaveCount(0);

    await page.getByRole("radio", { name: /Hardware shop/ }).click();
    await expect(page.getByLabel(/^Registered legal name/)).toBeVisible();

    await page.getByLabel(/^Physical address/).fill(SHOP.address);
    await page.getByLabel(/^Town or city/).fill(SHOP.town);
    await page.getByLabel(/^County/).selectOption(SHOP.county);

    // Submitting without the business block must fail on those fields.
    await page.getByRole("button", { name: /^Continue/ }).click();
    await expect(page.getByText("Enter the registered legal name")).toBeVisible();
    await expect(page).toHaveURL(/\/join\/profile/);

    await page.getByLabel(/^Registered legal name/).fill(SHOP.legalName);
    await page.getByLabel(/^Trading name/).fill(SHOP.tradingName);
    await page.getByLabel(/^KRA PIN/).fill(SHOP.kraPin);
    await page.getByRole("button", { name: /^Continue/ }).click();

    await expect(page).toHaveURL(/\/join\/membership/);
    await page.getByRole("radio", { name: /Build Business/ }).click();
    await page.getByRole("button", { name: /Create my account/i }).click();

    await expect(page).toHaveURL(/\/account/);
    // The membership is BUILD BUSINESS, but nothing has been verified — so the
    // level must still read Registered. §9.42: membership is not trust.
    await expect(page.getByText("Build Business").first()).toBeVisible();
    await expect(page.getByText("Registered").first()).toBeVisible();
  });

  test("a deep link past the draft clamps back to the reachable step", async ({
    page,
  }) => {
    await resetDemo(page);
    await page.goto("/join/membership");
    await expect(page).toHaveURL(/\/join\/account/);

    await completeAccountStep(page, HOMEOWNER);
    // Phone is verified but the profile is not, so profile is the furthest step.
    await page.goto("/join/membership");
    await expect(page).toHaveURL(/\/join\/verify-phone/);
  });

  test("/join resumes a half-finished registration", async ({ page }) => {
    await resetDemo(page);
    await completeAccountStep(page, HOMEOWNER);
    await completePhoneStep(page);

    await page.goto("/join");
    await expect(page).toHaveURL(/\/join\/profile/);
  });
});

test.describe("the account area", () => {
  test("the seeded demo account shows a derived level and real supplier reach", async ({
    page,
  }) => {
    await resetDemo(page);
    await page.goto("/account");

    await expect(page.getByRole("heading", { name: /^Welcome, / })).toBeVisible();

    // Verified member, not Registered: the seeded shop has a verified business
    // and a complete profile, and the level is computed from those.
    await expect(page.getByText("Verified member").first()).toBeVisible();

    // Suppliers reaching you is counted from the catalogue, so it must be a
    // real number rather than a dash.
    const reach = page
      .locator("div", { has: page.getByText("Suppliers reaching you") })
      .last();
    await expect(reach).not.toContainText("—");

    // The build must not imply it has authentication.
    await expect(page.getByText(/no authentication/i)).toBeVisible();
  });

  test("the trust ladder marks where the account is and what is next", async ({
    page,
  }) => {
    await resetDemo(page);
    await page.goto("/account");

    const ladder = page.getByRole("listitem").filter({ hasText: "You are here" });
    await expect(ladder).toHaveCount(1);
    await expect(page.getByText("To reach Trusted business")).toBeVisible();
  });

  test("signing out leaves the account area offering registration", async ({ page }) => {
    await resetDemo(page);
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /^Welcome, / })).toBeVisible();

    // Signed out is what a first-time visitor's load looks like.
    await signOut(page);
    await page.goto("/account");

    await expect(page.getByText("You are not signed in")).toBeVisible();
    await expect(page.getByRole("link", { name: /Create your account/ })).toBeVisible();
  });
});

test.describe("the marketplace front door", () => {
  test("carries Chapter 9's promise and the entry steps when signed out", async ({
    page,
  }) => {
    await resetDemo(page);
    await signOut(page);
    await page.goto("/marketplace");

    await expect(
      page.getByRole("heading", { name: /home of construction materials/i }),
    ).toBeVisible();
    await expect(page.getByText("Search, free")).toBeVisible();
    await expect(page.getByText("Choose your membership")).toBeVisible();
  });

  test("the entry steps stand down once an account is signed in", async ({ page }) => {
    await resetDemo(page);
    await page.goto("/marketplace");

    // The seeded session is signed in, so the sign-up strip must not be there.
    await expect(page.getByText("Search, free")).toHaveCount(0);
    // …and the account control names the account rather than saying "Sign in".
    await expect(page.getByRole("link", { name: /^Mwangi/ })).toBeVisible();
  });

  test("a search performed here shows up as a recent search on the account", async ({
    page,
  }) => {
    await resetDemo(page);
    await page.goto("/marketplace");

    await page.getByRole("textbox").first().fill("marine plywood");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/marketplace\/search\?q=marine(%20|\+)plywood/);

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Recent searches" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "marine plywood" }),
    ).toBeVisible();
  });

  test("Services is present, marked as coming, and says what it will hold", async ({
    page,
  }) => {
    await page.goto("/marketplace/services");
    await expect(page.getByText("FundiSmart is not open yet")).toBeVisible();
    await expect(page.getByText("Gypsum & ceilings")).toBeVisible();
  });

  test("offers resolve to live listings and never advertise an empty shelf", async ({
    page,
  }) => {
    await resetDemo(page);
    await page.goto("/marketplace");

    const rail = page.locator("section", {
      has: page.getByRole("heading", { name: /Offers|member deals/ }),
    });
    await expect(rail).toBeVisible();

    // Every card states a listing count, and it must never be zero — the
    // repository drops offers whose category has nothing live behind it.
    await expect(rail.getByText(/^0 listings/)).toHaveCount(0);
  });
});
