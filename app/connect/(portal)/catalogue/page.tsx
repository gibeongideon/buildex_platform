"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ExternalLink,
  Eye,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Store,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Currency } from "@/components/shared/format";
import { ProductThumb } from "@/components/shared/product-thumb";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  EmptyState,
  Skeleton,
  StatusPill,
  type Tone,
} from "@/components/ui/primitives";
import { productRepo } from "@/lib/data";
import { formatLeadTime, priceRange, type Product } from "@/lib/schemas/product";
import { productLimit, packageMeta } from "@/lib/schemas/subscription";
import { canListProducts } from "@/lib/schemas/verification";
import { cn, formatDate } from "@/lib/utils";
import { useCurrentManufacturer } from "../use-current-manufacturer";

/*
  Catalogue management.

  A manufacturer's working view of everything it sells. The listing status
  column is the important one: `active` means live on the marketplace, `draft`
  means saved but not published, and archived listings stay for reference
  rather than being destroyed — an archived SKU still appears on historic
  enquiries.
*/

const STATUS_META: Record<Product["status"], { label: string; tone: Tone }> = {
  active: { label: "Live", tone: "success" },
  draft: { label: "Draft", tone: "neutral" },
  out_of_stock: { label: "Out of stock", tone: "warning" },
  archived: { label: "Archived", tone: "neutral" },
};

export default function CataloguePage() {
  const { data, loading } = useCurrentManufacturer();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Catalogue" />
        <Skeleton className="h-96" />
      </>
    );
  }
  if (!data) return null;

  const { manufacturer, products } = data;
  const limit = productLimit(manufacturer.subscription?.package ?? "free");
  const live = products.filter((p) => p.status === "active");
  const drafts = products.filter((p) => p.status === "draft");
  const atLimit = limit !== null && live.length >= limit;
  const canPublish = canListProducts(manufacturer.status);

  const filtered = products.filter((product) => {
    if (statusFilter && product.status !== statusFilter) return false;
    if (query.trim()) {
      const haystack = `${product.name} ${product.sku} ${product.category}`.toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  async function setStatus(product: Product, status: Product["status"]) {
    setBusyId(product.id);
    try {
      await productRepo.update(product.id, { status });
    } finally {
      setBusyId(null);
    }
  }

  const cheapest = live.length
    ? Math.min(...live.map((p) => priceRange(p.priceBands).min))
    : 0;

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Everything you sell into the Buildex Connect marketplace."
        breadcrumbs={[
          { label: "Connect", href: "/connect/dashboard" },
          { label: "Catalogue" },
        ]}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href={`/marketplace/manufacturer/${manufacturer.id}`}>
                <Store aria-hidden="true" />
                View store
              </Link>
            </Button>
            <Button asChild disabled={atLimit}>
              <Link href="/connect/catalogue/new">
                <Plus aria-hidden="true" />
                Add product
              </Link>
            </Button>
          </>
        }
      />

      {atLimit ? (
        <Alert
          tone="warning"
          className="mb-6"
          title={`You have reached the ${packageMeta(manufacturer.subscription?.package ?? "free").name} listing limit`}
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/connect/subscription">Compare packages</Link>
            </Button>
          }
        >
          {limit} live listings is the cap on your package. Archive a listing or upgrade
          to add more.
        </Alert>
      ) : null}

      {!canPublish && drafts.length > 0 ? (
        <Alert tone="info" className="mb-6" title="Drafts publish automatically">
          Verification is still in progress, so new listings save as drafts. They go live
          the moment your checks clear — you do not need to come back and publish them.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Live listings"
          tone="success"
          value={live.length}
          hint={limit === null ? "Unlimited on your package" : `of ${limit} allowed`}
          icon={<Eye className="size-4" />}
        />
        <StatCard
          label="Drafts"
          tone="warning"
          value={drafts.length}
          hint={drafts.length ? "Not yet visible to buyers" : "Nothing pending"}
          icon={<Pencil className="size-4" />}
        />
        <StatCard
          label="Categories"
          tone="info"
          value={new Set(products.map((p) => p.category)).size}
          hint="Across your whole range"
          icon={<Package className="size-4" />}
        />
        <StatCard
          label="Entry price"
          tone="info"
          value={cheapest ? <Currency value={cheapest} /> : "—"}
          hint="Cheapest band you publish"
          icon={<Store className="size-4" />}
        />
      </div>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-72">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, SKU or category"
              aria-label="Search catalogue"
              className="h-9 pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
              className="h-9 w-auto"
            >
              <option value="">All statuses</option>
              <option value="active">Live</option>
              <option value="draft">Draft</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="archived">Archived</option>
            </Select>
            <p className="whitespace-nowrap text-sm text-muted-foreground text-numeric">
              {filtered.length} of {products.length}
            </p>
          </div>
        </div>

        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Package className="size-5" />}
              title={products.length === 0 ? "No products yet" : "Nothing matches"}
              description={
                products.length === 0
                  ? "Hardware shops browse by category and region. Your first listing is what makes you findable."
                  : "Try a different search term or clear the status filter."
              }
              action={
                products.length === 0 ? (
                  <Button asChild>
                    <Link href="/connect/catalogue/new">Add your first product</Link>
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setStatusFilter("");
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <div className="scroll-x">
              <table className="w-full min-w-[54rem] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Product
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Category
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      From
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      MOQ
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Lead time
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
                  {filtered.map((product) => {
                    const meta = STATUS_META[product.status];
                    const busy = busyId === product.id;

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
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/connect/catalogue/${product.id}`}
                                className="block truncate font-medium text-foreground hover:text-brand hover:underline"
                              >
                                {product.name}
                              </Link>
                              <p className="text-xs text-muted-foreground text-numeric">
                                {product.sku}
                                {product.packSize ? ` · ${product.packSize}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {product.category}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Currency value={priceRange(product.priceBands).min} />
                          <span className="text-xs text-muted-foreground">
                            /{product.unit}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-numeric text-muted-foreground">
                          {product.moq}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {formatLeadTime(product.leadTimeDays)}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                          {product.status === "active" ? (
                            <p className="mt-1 text-xs text-subtle-foreground">
                              since {formatDate(product.updatedAt)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {product.status === "active" ? (
                              <Button variant="ghost" size="sm" asChild>
                                <Link
                                  href={`/marketplace/product/${product.id}`}
                                  title="View on marketplace"
                                >
                                  <ExternalLink aria-hidden="true" />
                                  <span className="sr-only">
                                    View {product.name} on the marketplace
                                  </span>
                                </Link>
                              </Button>
                            ) : null}
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/connect/catalogue/${product.id}`}>
                                <Pencil aria-hidden="true" />
                                <span className="sr-only">Edit {product.name}</span>
                              </Link>
                            </Button>
                            {product.status === "archived" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setStatus(product, canPublish ? "active" : "draft")
                                }
                                title="Restore"
                              >
                                <RotateCcw aria-hidden="true" />
                                <span className="sr-only">Restore {product.name}</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatus(product, "archived")}
                                title="Archive"
                              >
                                <Archive aria-hidden="true" />
                                <span className="sr-only">Archive {product.name}</span>
                              </Button>
                            )}
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
