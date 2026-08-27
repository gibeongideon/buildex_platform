"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Info,
  Lightbulb,
  Send,
  Sparkles,
  Store,
} from "lucide-react";
import { marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { parseRequirement, SOURCING_EXAMPLES } from "@/lib/rules/sourcing";
import { priceAtQuantity, priceRange } from "@/lib/schemas/product";
import { ProductCard, ProductCardSkeleton } from "@/components/shared/product-card";
import { Currency, Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Card, CardBody, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

/*
  Ask AI — the sourcing assistant.

  A buyer describes a requirement in plain language and gets back the listings
  and suppliers that actually match it, plus what it would cost at their stated
  quantity.

  It is a deterministic matcher over the catalogue's vocabulary, not a language
  model, and the page says so rather than implying otherwise. That is also why
  it shows its working: the chips under the answer are exactly what it
  recognised, so a buyer can see why they got these results and correct the
  phrasing if something was missed.
*/

function AskInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [draft, setDraft] = React.useState(initial);

  const parsed = React.useMemo(
    () => (initial.trim() ? parseRequirement(initial) : null),
    [initial],
  );

  const { data, loading, error, refetch } = useQuery(
    async () => {
      if (!parsed) return null;
      return marketplaceRepo.search({
        query: parsed.categories.length ? undefined : parsed.freeText,
        categories: parsed.categories.length ? parsed.categories : undefined,
        regions: parsed.region ? [parsed.region] : undefined,
        sort: parsed.urgent ? "lead-time" : parsed.priceSensitive ? "price-asc" : "relevance",
      });
    },
    [initial],
  );

  function ask(question: string) {
    router.push(`/marketplace/ask?q=${encodeURIComponent(question)}`);
  }

  const listings = data?.listings ?? [];
  const suppliers = data?.facets.manufacturers ?? [];

  // Cost at the buyer's own quantity, from the cheapest matching listing.
  const best = listings[0];
  const bestUnit =
    best && parsed?.quantity
      ? priceAtQuantity(best.product.priceBands, parsed.quantity) ??
        priceRange(best.product.priceBands).min
      : null;

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: "Marketplace", href: "/marketplace" },
          { label: "Ask AI" },
        ]}
      />

      <QueryError error={error} onRetry={refetch} />

      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden="true" />
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Ask AI
        </h1>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Describe what you need in your own words — quantity, material, where it has to
        go — and get the suppliers who can actually deliver it.
      </p>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) ask(draft.trim());
        }}
      >
        <div className="flex items-center gap-2 rounded-full border-2 border-brand bg-surface p-1.5 pl-5 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background">
          <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="400 bags of cement delivered to Machakos next week"
            aria-label="Describe what you need"
            className="h-12 min-w-0 flex-1 border-0 bg-transparent text-base text-foreground placeholder:text-subtle-foreground focus:outline-none"
          />
          <button
            type="submit"
            className="h-12 shrink-0 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Ask
          </button>
        </div>
      </form>

      {!parsed ? (
        <div className="mt-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="size-4 text-primary" aria-hidden="true" />
            Try one of these
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCING_EXAMPLES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(example);
                    ask(example);
                  }}
                  className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
                >
                  <span>{example}</span>
                  <ArrowRight
                    className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>

          <Card className="mt-8">
            <CardBody>
              <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  <span className="font-medium text-foreground">How this works.</span>{" "}
                  Ask AI matches your wording against the catalogue&apos;s own vocabulary —
                  materials, counties, quantities and urgency. It is deterministic rather
                  than a language model, so it will never invent a supplier or a price, and
                  it shows you exactly what it recognised.
                </span>
              </p>
            </CardBody>
          </Card>
        </div>
      ) : (
        <div className="mt-6">
          {/* The answer card: what it understood, and what that means. */}
          <Card className="overflow-hidden">
            <div className="on-brand px-5 py-4">
              <p className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Here is what I found
              </p>
              {loading && !data ? (
                <p className="mt-2 text-lg text-white/80">Matching suppliers…</p>
              ) : listings.length === 0 ? (
                <p className="mt-2 max-w-3xl font-display text-lg font-extrabold leading-snug text-white">
                  Nothing in the catalogue matches that yet.
                </p>
              ) : (
                <p className="mt-2 max-w-3xl font-display text-lg font-extrabold leading-snug text-white sm:text-xl">
                  <Num value={listings.length} />{" "}
                  {listings.length === 1 ? "listing" : "listings"} from{" "}
                  <Num value={suppliers.length} />{" "}
                  {suppliers.length === 1 ? "supplier" : "suppliers"}
                  {parsed.region ? ` delivering to ${parsed.region}` : ""}
                  {parsed.urgent ? ", fastest first" : parsed.priceSensitive ? ", cheapest first" : ""}.
                </p>
              )}

              {parsed.matchedOn.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-white/50">Matched on</span>
                  {parsed.matchedOn.map((term) => (
                    <span
                      key={term}
                      className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-white/60">
                  Nothing specific recognised — searching on your wording as typed.
                </p>
              )}
            </div>

            {best && parsed.quantity && bestUnit ? (
              <CardBody className="border-b border-border bg-surface-muted">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Best indicative price at{" "}
                      <span className="font-medium text-foreground text-numeric">
                        <Num value={parsed.quantity} />
                      </span>{" "}
                      {best.product.unit}
                      {parsed.quantity === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 flex items-baseline gap-2">
                      <Currency
                        value={bestUnit * parsed.quantity}
                        className="font-display text-2xl font-extrabold text-foreground"
                      />
                      <span className="text-sm text-muted-foreground">
                        (<Currency value={bestUnit} /> per {best.product.unit})
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      From {best.manufacturer.tradingName} · confirmed on quote
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/marketplace/rfq">
                      <Send aria-hidden="true" />
                      Send this to every matching supplier
                    </Link>
                  </Button>
                </div>
              </CardBody>
            ) : null}
          </Card>

          {suppliers.length > 0 ? (
            <section className="mt-6">
              <h2 className="font-display text-base font-bold text-foreground">
                Suppliers who can serve this
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {suppliers.map((supplier) => (
                  <li key={supplier.id}>
                    <Link
                      href={`/marketplace/manufacturer/${supplier.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                    >
                      <Store className="size-3.5" aria-hidden="true" />
                      {supplier.name}
                      <span className="text-xs text-subtle-foreground text-numeric">
                        {supplier.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-6">
            {loading && listings.length === 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <Card>
                <CardBody className="p-0">
                  <EmptyState
                    icon={<Sparkles className="size-5" />}
                    title="No match in the catalogue"
                    description="Try naming the material plainly (cement, rebar, roofing sheets), or post it as a quotation request and let suppliers come to you."
                    action={
                      <Button asChild>
                        <Link href="/marketplace/rfq">Post a quotation request</Link>
                      </Button>
                    }
                  />
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {listings.slice(0, 20).map(({ product, manufacturer, enquiryCount }, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    manufacturer={manufacturer}
                    enquiryCount={enquiryCount}
                    priority={i < 5}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function AskPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-[80rem] px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-7 w-40" />
          <Skeleton className="mt-5 h-16 w-full rounded-full" />
        </div>
      }
    >
      <AskInner />
    </React.Suspense>
  );
}
