import { test, expect, type Page } from "@playwright/test";

/*
  Journey A — manufacturer onboarding, end to end.

  Covers the happy path plus the edge states Phase 1 commits to: duplicate KRA
  PIN, expired document, deep-link clamping and resuming a draft after reload.

  Labels are matched with anchored regexes because required fields render a
  trailing asterisk, so an exact string match would never hit.
*/

const COMPANY = {
  contactName: "Achieng Odhiambo",
  email: "achieng@lakesidecement.co.ke",
  phone: "+254712345678",
  password: "buildex2026",
  legalName: "Lakeside Cement Works Limited",
  tradingName: "Lakeside Cement",
  brsNumber: "PVT-4KDM7QX",
  kraPin: "P077412903B",
  address: "Kisumu–Busia Road, Industrial Area",
  county: "Kisumu",
  nationalId: "28104477",
};

/** A KRA PIN that already exists in the seed data (Savannah Cement Works). */
const DUPLICATE_KRA_PIN = "P051234567M";

const REQUIRED_DOCUMENTS = [
  "Certificate of Incorporation",
  "KRA PIN Certificate",
  "Tax Compliance Certificate",
  "CR12",
  "Director National ID copies",
  "Bank / M-Pesa settlement details",
];

/** Drives the real file-chooser rather than reaching for the hidden input. */
async function uploadDocument(page: Page, documentLabel: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: `Upload ${documentLabel}` }).click(),
  ]);
  await chooser.setFiles({
    name: `${documentLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 buildex test fixture"),
  });
}

async function completeAccountStep(page: Page) {
  await page.goto("/connect/onboarding/account");
  await page.getByLabel(/^Full name/).fill(COMPANY.contactName);
  await page.getByLabel(/^Work email/).fill(COMPANY.email);
  await page.getByLabel(/^Mobile number/).fill(COMPANY.phone);
  await page.getByLabel(/^Password/).fill(COMPANY.password);
  await page.getByLabel(/^Confirm password/).fill(COMPANY.password);
  await page
    .getByRole("checkbox", { name: /accept the Buildex Connect marketplace terms/i })
    .click();
  await page.getByRole("checkbox", { name: /consent to Buildex verifying/i }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/verify-phone/);
}

async function completePhoneStep(page: Page) {
  await page.getByRole("button", { name: "Fill code" }).click();
  await page.getByRole("button", { name: /Verify and continue/i }).click();
  await expect(page).toHaveURL(/\/company/);
}

async function fillCompanyStep(page: Page, kraPin = COMPANY.kraPin) {
  await page.getByLabel(/^Registered legal name/).fill(COMPANY.legalName);
  await page.getByLabel(/^Trading name/).fill(COMPANY.tradingName);
  await page.getByLabel(/^BRS registration number/).fill(COMPANY.brsNumber);
  await page.getByLabel(/^KRA PIN/).fill(kraPin);
  await page.getByLabel(/^Year established/).fill("2015");
  await page.getByLabel(/^Physical address/).fill(COMPANY.address);
  await page.getByLabel(/^County/).selectOption(COMPANY.county);
  await page.getByRole("checkbox", { name: "Cement & Concrete" }).click();
  await page.getByLabel(/^Monthly production capacity/).selectOption("5m_20m");
  await page.getByRole("checkbox", { name: "Nyanza", exact: true }).click();
}

async function completeCompanyStep(page: Page) {
  await fillCompanyStep(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/directors/);
}

async function completeDirectorsStep(page: Page) {
  await page.getByLabel(/^National ID number/).fill(COMPANY.nationalId);
  // The IPRS lookup fires on blur, which fill() alone does not trigger.
  await page.getByLabel(/^National ID number/).blur();
  await expect(page.getByText("IPRS matched")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/documents/);
}

test.beforeEach(async ({ page }) => {
  // Each test starts from an empty draft and the pristine seed data.
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("a manufacturer can complete onboarding end to end", async ({ page }) => {
  await completeAccountStep(page);
  await completePhoneStep(page);
  await completeCompanyStep(page);

  // The account holder is pre-seeded as sole director at 100% ownership.
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await completeDirectorsStep(page);

  // Continue stays disabled until every required document is present.
  await expect(page.getByRole("button", { name: /Continue to review/i })).toBeDisabled();

  for (const label of REQUIRED_DOCUMENTS) {
    await uploadDocument(page, label);
  }

  await expect(page.getByText("All required documents uploaded")).toBeVisible();
  await page.getByRole("button", { name: /Continue to review/i }).click();
  await expect(page).toHaveURL(/\/review/);

  await expect(page.getByText(COMPANY.legalName)).toBeVisible();
  await expect(page.getByText(COMPANY.kraPin)).toBeVisible();
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page).toHaveURL(/\/verification/, { timeout: 20_000 });

  await expect(page.getByRole("heading", { name: /Verification in progress/i })).toBeVisible();
  await expect(page.getByText("Document completeness", { exact: true })).toBeVisible();

  /*
    Verification no longer advances from this screen — Buildex Operations owns
    that decision now. So the loop closes the way it will in production: the
    applicant waits, ops approves in the console, and the applicant's own
    tracker updates without anyone wiring the two together.
  */
  await page.getByRole("link", { name: /Open the reviewer/i }).click();
  await expect(page).toHaveURL(/\/admin\/verification\/mfr_/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    COMPANY.tradingName,
    { timeout: 20_000 },
  );

  await page.getByRole("button", { name: /Pass every outstanding check/ }).click();
  await page.getByRole("button", { name: /^Record approve$/i }).click();
  await expect(page.getByText(/Approve recorded/)).toBeVisible({ timeout: 20_000 });

  await page.goto("/connect/onboarding/verification");
  await expect(page.getByText("Verified").first()).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: /Continue to packages/i }).click();
  await expect(page).toHaveURL(/\/subscription/);

  await page.getByRole("radio", { name: /Premium/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/first-listing/);

  await page.getByLabel(/^Product name/).fill("Lakeside OPC 32.5N Cement");
  await page.getByLabel(/^Category/).selectOption("Cement & Concrete");
  await page.getByLabel(/^Your SKU/).fill("LKS-OPC325");
  await page.getByLabel(/^Sold by/).selectOption("bag");
  await page.getByLabel(/^Pack size/).fill("50 kg");
  await page.locator('input[name="priceBands.0.unitPrice"]').fill("760");
  await page.locator('input[name="priceBands.1.unitPrice"]').fill("735");

  // The preview is the same component the marketplace renders.
  const preview = page.getByRole("article");
  await expect(preview).toContainText("Lakeside OPC 32.5N Cement");
  await expect(preview).toContainText("KSh 735");

  await page.getByRole("button", { name: /Publish and finish/i }).click();
  await expect(page).toHaveURL(/\/connect\/dashboard/, { timeout: 20_000 });

  await expect(
    page.getByRole("heading", { name: /Welcome, Lakeside Cement/i }),
  ).toBeVisible();
  await expect(page.getByText("Lakeside OPC 32.5N Cement")).toBeVisible();
  await expect(page.getByText(/of 6 complete/)).toBeVisible();
});

test("a duplicate KRA PIN blocks the company step", async ({ page }) => {
  await completeAccountStep(page);
  await completePhoneStep(page);
  await fillCompanyStep(page, DUPLICATE_KRA_PIN);

  await expect(page.getByText("This KRA PIN is already registered")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Savannah Cement Works Limited")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

  // Correcting the PIN clears the block.
  await page.getByLabel(/^KRA PIN/).fill(COMPANY.kraPin);
  await page.getByLabel(/^Physical address/).click();
  await expect(page.getByText(/PIN is not yet registered/i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
});

test("an expired document keeps the pack incomplete", async ({ page }) => {
  await completeAccountStep(page);
  await completePhoneStep(page);
  await completeCompanyStep(page);
  await completeDirectorsStep(page);

  await page.getByRole("button", { name: /Upload an expired certificate/i }).click();

  await expect(page.getByText("Expired").first()).toBeVisible();
  await expect(page.getByText(/Still needed:.*Tax Compliance Certificate/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue to review/i })).toBeDisabled();
});

test("a draft resumes at the right step and clamps deep links", async ({ page }) => {
  await completeAccountStep(page);
  await completePhoneStep(page);
  await completeCompanyStep(page);

  await page.reload();
  await expect(page).toHaveURL(/\/directors/);

  // The resume link lands on the furthest step the draft supports.
  await page.goto("/connect/onboarding");
  await expect(page).toHaveURL(/\/directors/);

  // A deep link past that step is clamped back.
  await page.goto("/connect/onboarding/first-listing");
  await expect(page).toHaveURL(/\/directors/);

  // Going back to an already-completed step still shows what was entered.
  await page.goto("/connect/onboarding/company");
  await expect(page.getByLabel(/^Registered legal name/)).toHaveValue(COMPANY.legalName);
});
