"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  Search,
  Sparkles,
  Store,
  Tag,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Separator,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { QueryError, SkeletonRows } from "@/components/ui/query-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Currency } from "@/components/shared/format";
import { AccountLevelLadder } from "@/components/shared/account-level";
import { VerifiedMark, verifiedLevel } from "@/components/shared/verified-mark";
import { browsingRepo, marketplaceRepo, offerRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  CUSTOMER_TYPE_LABELS,
  VERIFICATION_LEVEL_LABELS,
} from "@/lib/schemas/customer";
import { membershipMeta } from "@/lib/schemas/membership";
import {
  deriveVerificationLevel,
  nextLevelRequirements,
  profileCompleteness,
  profileGaps,
} from "@/lib/rules/customers";
import { formatDate, spreadBy } from "@/lib/utils";
import { useCurrentCustomer } from "./use-current-customer";

/*
  The customer dashboard — Chapter 9 §9.16.

  The chapter lists ten things it should carry. Six of them are real today:
  search, popular categories, recent searches, recommended products and
  suppliers, nearby suppliers, and membership and verification status. Four —
  wallet and token balance, orders, quotations, and the Business Passport —
  belong to later phases.

  Those four are named as arriving rather than mocked up with invented figures.
  A dashboard showing a KSh 0 wallet that no money can enter, or "3 orders" that
  open nothing, teaches a reviewer to distrust every other number on the page.
*/

function SignedOut() {
  return (
    <Card>
      <CardBody>
        <EmptyState
          icon={<UserPlus className="size-5" aria-hidden="true" />}
          title="You are not signed in"
          description="Create an account to save what you find, request quotations and build a trading record on Buildex Connect."
          action={
            <Button asChild>
              <Link href="/join">
                Create your account
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        />
      </CardBody>
    </Card>
  );
}

export default function AccountOverviewPage() {
  const searchParams = useSearchParams();
  const justJoined = searchParams.get("welcome") === "1";

  const { data: customer, loading, error, refetch } = useCurrentCustomer();
  const region = customer?.region;

  const { data: searches } = useQuery(() => browsingRepo.recentSearches(6), []);

  const { data: offers, loading: offersLoading } = useQuery(
    () => offerRepo.list(customer?.membership ?? null),
    [customer?.membership ?? ""],
  );

  // Suppliers who can actually reach this customer. "Nearby" on a marketplace
  // that trades nationally means "delivers to your region", not "closest".
  const { data: storefronts, loading: storefrontsLoading } = useQuery(
    () => marketplaceRepo.listStorefronts(),
    [],
  );

  const { data: nearbyListings, loading: listingsLoading } = useQuery(
    () =>
      region
        ? marketplaceRepo.search({ regions: [region], sort: "relevance" })
        : Promise.resolve(null),
    [region ?? ""],
  );

  if (error) return <QueryError error={error} onRetry={refetch} />;

  if (loading) {
    return (
      <>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </>
    );
  }

  if (!customer) {
    return (
      <>
        <PageHeader title="My account" />
        <SignedOut />
      </>
    );
  }

  const level = deriveVerificationLevel(customer);
  const membership = membershipMeta(customer.membership);
  const completeness = profileCompleteness(customer);
  const gaps = profileGaps(customer);
  const next = nextLevelRequirements(customer);

  const nearbySuppliers = (storefronts ?? []).filter((entry) =>
    entry.manufacturer.distributionRegions.includes(customer.region),
  );

  const categories = nearbyListings?.facets.categories.slice(0, 8) ?? [];
  const recommended = spreadBy(
    nearbyListings?.listings ?? [],
    4,
    (listing) => listing.product.category,
  );

  return (
    <>
      <PageHeader
        title={`Welcome, ${customer.name.split(" ")[0]}`}
        description={
          <>
            {CUSTOMER_TYPE_LABELS[customer.customerType]} in {customer.town},{" "}
            {customer.county}. We show you suppliers who deliver to{" "}
            <span className="font-medium text-foreground">{customer.region}</span>.
          </>
        }
        actions={
          <Button asChild>
            <Link href="/marketplace">
              <Search aria-hidden="true" />
              Search materials
            </Link>
          </Button>
        }
      />

      {justJoined ? (
        <Alert tone="success" className="mb-6" title="Your account is ready">
          You are on {membership.name}. Search is free — the next thing worth doing is
          finding a material and asking two suppliers what they would charge for your
          quantity.
        </Alert>
      ) : null}

      <Alert tone="info" className="mb-6" title="Demo build — no authentication">
        This account is a demo session held in your browser, not a signed-in user. There
        is no password check, and nothing here is private.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Membership"
          value={membership.name}
          hint={
            customer.membershipRenewsAt
              ? `Renews ${formatDate(customer.membershipRenewsAt)}`
              : "Free — never renews"
          }
          icon={<Sparkles className="size-4" aria-hidden="true" />}
          tone="info"
        />
        <StatCard
          label="Verification level"
          value={VERIFICATION_LEVEL_LABELS[level]}
          hint={
            next
              ? `Next: ${VERIFICATION_LEVEL_LABELS[next.level]}`
              : "Top of the earned ladder"
          }
          icon={<BadgeCheck className="size-4" aria-hidden="true" />}
          tone={level === "registered" ? "warning" : "success"}
        />
        <StatCard
          label="Profile complete"
          value={`${completeness}%`}
          hint={
            gaps.length === 0
              ? "Everything we ask for is on file"
              : `${gaps.length} thing${gaps.length === 1 ? "" : "s"} still to add`
          }
          icon={<UserPlus className="size-4" aria-hidden="true" />}
          tone={completeness === 100 ? "success" : "warning"}
        />
        <StatCard
          label="Suppliers reaching you"
          value={storefrontsLoading ? "—" : nearbySuppliers.length}
          hint={`Verified and delivering to ${customer.region}`}
          icon={<Store className="size-4" aria-hidden="true" />}
          tone="info"
          loading={storefrontsLoading}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {gaps.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Finish your profile</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Each of these moves your verification level, and with it what
                  suppliers and pricing you can see.
                </p>
                <ul className="space-y-1.5">
                  {gaps.map((gap) => (
                    <li
                      key={gap}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning"
                      />
                      {gap}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>
                {customer.membership === "free" ? "Offers open to you" : "Your member deals"}
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {offersLoading ? (
                <div className="p-5">
                  <SkeletonRows rows={3} />
                </div>
              ) : (offers ?? []).length === 0 ? (
                <EmptyState
                  icon={<Tag className="size-5" aria-hidden="true" />}
                  title="No offers running right now"
                  description="Offers are tied to categories with live listings, so they come and go with what suppliers have on the marketplace."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {(offers ?? []).slice(0, 4).map(({ offer, listings, fromKsh }) => (
                    <li key={offer.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/marketplace/search?category=${encodeURIComponent(offer.category)}`}
                            className="text-sm font-medium text-foreground hover:text-brand hover:underline"
                          >
                            {offer.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {offer.description}
                          </p>
                        </div>
                        {offer.minimumTier ? (
                          <StatusPill tone="info">
                            {membershipMeta(offer.minimumTier).name}
                          </StatusPill>
                        ) : (
                          <StatusPill tone="neutral">Open to all</StatusPill>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-subtle-foreground">
                        {listings} live listing{listings === 1 ? "" : "s"}
                        {fromKsh !== null ? (
                          <>
                            {" · from "}
                            <Currency value={fromKsh} />
                          </>
                        ) : null}
                        {" · ends "}
                        {formatDate(offer.endsAt)}
                        {" · up to "}
                        {offer.savingPercent}% indicative saving
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended for {customer.region}</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {listingsLoading ? (
                <div className="p-5">
                  <SkeletonRows rows={4} />
                </div>
              ) : recommended.length === 0 ? (
                <EmptyState
                  icon={<Store className="size-5" aria-hidden="true" />}
                  title="Nothing listed for your region yet"
                  description="No verified supplier currently delivers to your region. Try searching nationally instead."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {recommended.map(({ product, manufacturer, enquiryCount }) => (
                    <li
                      key={product.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/marketplace/product/${product.id}`}
                          className="text-sm font-medium text-foreground hover:text-brand hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                          <span>{product.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            {verifiedLevel(manufacturer.status) ? (
                              <VerifiedMark
                                level={verifiedLevel(manufacturer.status) ?? "verified"}
                              />
                            ) : null}
                            {manufacturer.tradingName}
                          </span>
                        </p>
                      </div>
                      <p className="text-xs text-subtle-foreground text-numeric">
                        {enquiryCount} enquir{enquiryCount === 1 ? "y" : "ies"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your trust level</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <AccountLevelLadder level={level} />
              {next && next.needs.length > 0 ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                      To reach {VERIFICATION_LEVEL_LABELS[next.level]}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {next.needs.map((need) => (
                        <li key={need} className="text-xs text-muted-foreground">
                          {need}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}
            </CardBody>
          </Card>

          {searches && searches.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent searches</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {searches.map((term) => (
                    <li key={term}>
                      <Link
                        href={`/marketplace/search?q=${encodeURIComponent(term)}`}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-muted"
                      >
                        <Search
                          className="size-3.5 shrink-0 text-subtle-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate">{term}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {categories.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Categories near you</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {categories.map((facet) => (
                    <Link
                      key={facet.value}
                      href={`/marketplace/search?category=${encodeURIComponent(facet.value)}&region=${encodeURIComponent(customer.region)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-foreground transition-colors hover:border-brand hover:bg-brand-soft"
                    >
                      {facet.value}
                      <span className="text-subtle-foreground text-numeric">
                        {facet.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Arriving with the next phases</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5">
              <p className="text-xs text-muted-foreground">
                Chapter 9 puts four more things on this page. They are named here rather
                than shown as empty widgets, because a wallet you cannot put money into
                is worse than no wallet at all.
              </p>
              <ul className="space-y-1.5 text-xs text-foreground">
                <li>Wallet balance, membership tokens and statements</li>
                <li>Quotations you have sent, and the replies side by side</li>
                <li>Orders, deliveries and your transaction history</li>
                <li>Trust Score, Prestige Profile and the Business Passport</li>
              </ul>
              <Separator />
              <p className="flex items-center gap-1.5 text-xs text-subtle-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                Registered {formatDate(customer.createdAt)}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
