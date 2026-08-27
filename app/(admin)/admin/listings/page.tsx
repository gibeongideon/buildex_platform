"use client";

import * as React from "react";
import Link from "next/link";
import { EyeOff, ExternalLink, Package, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Currency } from "@/components/shared/format";
import { ProductThumb } from "@/components/shared/product-thumb";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Select } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { adminRepo, productRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { PRODUCT_CATEGORIES } from "@/lib/schemas/common";
import {
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_TONE,
  priceRange,
  type Product,
} from "@/lib/schemas/product";
import { canListProducts } from "@/lib/schemas/verification";
import { cn } from "@/lib/utils";
import { FilterBar } from "@/components/ui/filter-bar";

/*
  Listing moderation.

  Drafts sort first, because they are the ones that might need something: a
  draft held behind an unverified supplier is waiting on ops, not on the
  supplier. Unpublishing an active listing is the one write here — it is the
  lighter tool than suspending the whole supplier.
*/

export default function AdminListingsPage() {
  const { data: rows, loading, error, refetch } = useQuery(() => adminRepo.listingRows(), []);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const all = rows ?? [];

  const filtered = all.filter(({ product, manufacturer }) => {
    if (status && product.status !== status) return false;
    if (category && product.category !== category) return false;
    if (query.trim()) {
      const haystack = [product.name, product.sku, manufacturer.tradingName]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  const live = all.filter((r) => r.product.status === "active").length;
  const drafts = all.filter((r) => r.product.status === "draft");
  // A draft whose supplier is already cleared is the supplier's choice; one
  // whose supplier is not is waiting on verification.
  const heldByVerification = drafts.filter(
    (r) => !canListProducts(r.manufacturer.status),
  ).length;

  async function setProductStatus(id: string, next: Product["status"]) {
    setBusyId(id);
    try {
      await productRepo.update(id, { status: next });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Listings"
        description="Every listing on the platform, drafts included."
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Listings" },
        ]}
      />

      <QueryError error={error} onRetry={refetch} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Live on the marketplace"
          tone="success" value={live} icon={<Package className="size-4" />} />
        <StatCard
          label="Drafts"
          tone="warning"
          value={drafts.length}
          hint={
            heldByVerification
              ? `${heldByVerification} held behind verification`
              : "All by supplier choice"
          }
          icon={<EyeOff className="size-4" />}
        />
        <StatCard
          label="Categories in use"
          tone="info"
          value={new Set(all.map((r) => r.product.category)).size}
          hint={`of ${PRODUCT_CATEGORIES.length}`}
          icon={<Package className="size-4" />}
        />
      </div>

      {heldByVerification > 0 ? (
        <Alert
          tone="info"
          className="mt-6"
          title={`${heldByVerification} listings are waiting on a verification decision`}
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/admin/verification">Open the queue</Link>
            </Button>
          }
        >
          These publish automatically once their supplier clears. Nobody has to come back
          and press publish.
        </Alert>
      ) : null}

      <Card className="mt-6">
        <FilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Listing, SKU or supplier",
            label: "Search listings",
          }}
          shown={filtered.length}
          total={all.length}
        >
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
            className="h-9 w-auto"
          >
            <option value="">All statuses</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PRODUCT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter by category"
            className="h-9 w-auto"
          >
            <option value="">All categories</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FilterBar>

        <CardBody className="p-0">
          {loading && !rows ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Package className="size-5" />}
              title="No listings match"
              description="Try clearing a filter."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setStatus("");
                    setCategory("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="scroll-x">
              <table className="w-full min-w-[62rem] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Listing
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Supplier
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Category
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      Band spread
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(({ product, manufacturer }) => {
                    const range = priceRange(product.priceBands);
                    
                    const busy = busyId === product.id;
                    const held =
                      product.status === "draft" &&
                      !canListProducts(manufacturer.status);

                    return (
                      <tr
                        key={product.id}
                        className={cn("align-middle", busy && "opacity-50")}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ProductThumb
                              productId={product.id}
                              category={product.category}
                              className="size-10 shrink-0 rounded-md border border-border"
                              iconClassName="size-4"
                              sizes="40px"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {product.name}
                              </p>
                              <p className="text-xs text-muted-foreground text-numeric">
                                {product.sku}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/admin/manufacturers/${manufacturer.id}`}
                            className="text-muted-foreground hover:text-brand hover:underline"
                          >
                            {manufacturer.tradingName}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {product.category}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Currency value={range.min} />
                          {range.max !== range.min ? (
                            <>
                              <span aria-hidden="true">–</span>
                              <Currency value={range.max} hideSymbol />
                            </>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill tone={PRODUCT_STATUS_TONE[product.status]}>
                            {PRODUCT_STATUS_LABELS[product.status]}
                          </StatusPill>
                          {held ? (
                            <p className="mt-1 text-xs text-warning">
                              Waiting on verification
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {product.status === "active" ? (
                              <>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link
                                    href={`/marketplace/product/${product.id}`}
                                    title="View on the marketplace"
                                  >
                                    <ExternalLink aria-hidden="true" />
                                    <span className="sr-only">
                                      View {product.name}
                                    </span>
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setProductStatus(product.id, "archived")}
                                  title="Unpublish"
                                >
                                  <EyeOff aria-hidden="true" />
                                  <span className="sr-only">
                                    Unpublish {product.name}
                                  </span>
                                </Button>
                              </>
                            ) : product.status === "archived" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setProductStatus(product.id, "active")}
                                title="Restore"
                              >
                                <RotateCcw aria-hidden="true" />
                                <span className="sr-only">Restore {product.name}</span>
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
