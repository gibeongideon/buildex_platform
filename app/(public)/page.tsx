import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Factory,
  RefreshCw,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuildexMark } from "@/components/shared/brand";

const PRODUCTS = [
  {
    key: "buildex" as const,
    name: "Buildex",
    role: "Product supply & distribution",
    icon: Truck,
    accent: "text-supply",
    description:
      "Sourcing, stocking and delivery into the hardware network. The supply relationships and inventory the rest of the ecosystem runs on.",
    points: ["Marketplace ordering", "Inventory & stock movement", "Delivery and fulfilment"],
    status: "Phase 4",
  },
  {
    key: "capital" as const,
    name: "Buildex Capital",
    role: "Credit, financing & collections",
    icon: Banknote,
    accent: "text-capital",
    description:
      "Short-cycle stock financing for hardware shops, underwritten on platform data rather than a subjective assessment.",
    points: ["Credit scoring & limits", "Wallet and collections", "Loan tracking, DPD and recovery"],
    status: "Phases 5–6",
  },
  {
    key: "connect" as const,
    name: "Buildex Connect",
    role: "Manufacturer marketplace",
    icon: Factory,
    accent: "text-connect",
    description:
      "Verified manufacturers listing directly to hardware shops, with regional targeting and market intelligence.",
    points: ["KYB-verified onboarding", "Catalogue & price bands", "Regional targeting"],
    status: "Live in this build",
    href: "/manufacturers",
  },
];

const CHAIN = [
  { icon: Factory, label: "Manufacturer", detail: "Lists verified products" },
  { icon: Truck, label: "Buildex", detail: "Supplies and delivers" },
  { icon: Store, label: "Hardware shop", detail: "Stocks and sells" },
  { icon: Banknote, label: "POS & wallet", detail: "Captures the transaction" },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0">
              <p className="text-sm font-medium text-connect">The Buildex Ecosystem</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                One platform connecting manufacturers, hardware shops and the capital that
                moves between them.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Buildex is moving from product supply to platform infrastructure for
                Kenya&apos;s construction material market — connecting what a manufacturer
                produces to what a builder buys at a local hardware, and financing the stock in
                between.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/manufacturers">
                    Sell on Buildex Connect
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" asChild>
                  <Link href="/connect/dashboard">Explore the manufacturer portal</Link>
                </Button>
              </div>
            </div>

            {/*
              The chain is the whole strategic argument, so it sits beside the
              headline rather than further down the page.
            */}
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                How the chain connects
              </p>
              <ol className="mt-4">
                {CHAIN.map((link, index) => {
                  const Icon = link.icon;
                  const isLast = index === CHAIN.length - 1;
                  return (
                    <li key={link.label} className="flex gap-3">
                      <div className="flex flex-col items-center self-stretch">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        {!isLast ? (
                          <span
                            aria-hidden="true"
                            className="my-1 w-px flex-1 bg-border-strong"
                          />
                        ) : null}
                      </div>
                      <div className={isLast ? "" : "pb-3"}>
                        <p className="text-sm font-semibold text-foreground">{link.label}</p>
                        <p className="text-xs text-muted-foreground">{link.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 flex gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                <RefreshCw className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Every transaction feeds the next credit decision, stock recommendation and
                market insight.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Three businesses, one chain of data
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Each part is useful on its own. Together they capture the whole chain — from what a
            manufacturer produces to what a consumer buys — and every transaction improves the
            next decision.
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {PRODUCTS.map((product) => {
              const Icon = product.icon;
              const card = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-md border border-border bg-background p-2 ${product.accent}`}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {product.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{product.name}</h3>
                  <p className={`text-xs font-medium ${product.accent}`}>{product.role}</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                  <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                    {product.points.map((point) => (
                      <li key={point} className="flex gap-2 text-xs text-muted-foreground">
                        <span
                          aria-hidden="true"
                          className="mt-1.5 size-1 shrink-0 rounded-full bg-subtle-foreground"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                  {product.href ? (
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      Get started
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  ) : null}
                </>
              );

              return product.href ? (
                <Link
                  key={product.key}
                  href={product.href}
                  className="flex flex-col rounded-lg border border-border bg-background p-5 transition-colors hover:border-border-strong"
                >
                  {card}
                </Link>
              ) : (
                <div
                  key={product.key}
                  className="flex flex-col rounded-lg border border-border bg-background p-5"
                >
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex gap-4">
            <BuildexMark product="connect" className="mt-1 size-8 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Manufacturers: get in front of the hardware network
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                Verified onboarding takes about fifteen minutes. Listing is free — you only pay
                when you want more visibility.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
                Every manufacturer is checked against BRS, KRA and IPRS records before going live.
              </p>
            </div>
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
