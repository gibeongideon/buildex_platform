import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, ShieldCheck, Store, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuildexMark } from "@/components/shared/brand";
import { PackageComparison } from "@/components/shared/package-picker";
import { SUBSCRIPTION_PACKAGES } from "@/lib/schemas/subscription";
import { STEPS } from "@/app/connect/onboarding/steps";

export const metadata: Metadata = {
  // The root template appends "· Buildex Connect", so the brand does not
  // belong here too — this read "Sell on Buildex Connect · Buildex Connect".
  title: "For manufacturers",
  description:
    "List your products to Kenya's hardware network. Verified onboarding, regional targeting and market intelligence for manufacturers.",
};

const BENEFITS = [
  {
    icon: Store,
    title: "Reach the hardware network directly",
    body: "Hardware shops browse by category and region before they browse by price. Being listed is what makes you findable at the moment they are restocking.",
  },
  {
    icon: MapPin,
    title: "Target where you actually sell",
    body: "Boost visibility in the regions that matter to you — Kakamega rather than Kisumu — priced on hardware coverage and turnover potential in each.",
  },
  {
    icon: TrendingUp,
    title: "See real demand, not guesswork",
    body: "Category demand by region, where your prices sit against comparable products, and which regions look but do not buy.",
  },
  {
    icon: BadgeCheck,
    title: "Verification that means something",
    body: "Every manufacturer is checked against BRS, KRA and IPRS records. The badge is worth something to buyers precisely because not everyone gets one.",
  },
];

export default function ManufacturersPage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex items-center gap-2.5">
            <BuildexMark className="h-6" />
            <p className="text-sm font-medium text-brand">Buildex Connect</p>
          </div>
          <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Sell your products to Kenya&apos;s hardware network.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            List your catalogue with wholesale price bands, reach verified hardware shops in the
            regions you supply, and see what the market is actually buying. Listing is free.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/connect/onboarding/account">
                Start selling on Buildex Connect
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              About 15 minutes · Free to list
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="flex gap-4">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-brand">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{benefit.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {benefit.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            What onboarding involves
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Have your BRS certificate, KRA PIN certificate, tax compliance certificate, CR12 and
            director IDs to hand. You can save and come back at any point.
          </p>

          <ol className="mt-8 space-y-0">
            {STEPS.slice(0, 6).map((step, index) => (
              <li key={step.id} className="flex gap-4 border-b border-border py-4 last:border-0">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong text-xs font-semibold text-muted-foreground text-numeric"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              Buildex verifies your registration against BRS, your PIN against KRA and each
              director against IPRS. Newer companies may also get a plant visit — you can list
              products while that is outstanding.
            </span>
          </p>
        </div>
      </section>

      <section id="packages" className="border-b border-border bg-surface scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Packages</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Start on Free and upgrade whenever you want more visibility. Pricing shown is
            indicative pending commercial approval.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SUBSCRIPTION_PACKAGES.map((pkg) => (
              <div
                key={pkg.key}
                className="rounded-lg border border-border bg-background p-5"
              >
                <p className="text-sm font-semibold text-foreground">{pkg.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">{pkg.tagline}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <PackageComparison />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Ready to list?
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Create your account, upload your documents and add your first product.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/connect/onboarding/account">
              Start onboarding
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
