"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ListingForm } from "@/components/shared/listing-form";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Alert, Card, CardBody, EmptyState, Skeleton } from "@/components/ui/primitives";
import { productRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { canListProducts } from "@/lib/schemas/verification";
import { useCurrentManufacturer } from "../../use-current-manufacturer";

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const router = useRouter();
  const { data: current } = useCurrentManufacturer();
  const { data: product, loading, error, refetch } = useQuery(
    () => productRepo.getById(productId),
    [productId],
  );
  const [submitting, setSubmitting] = React.useState(false);

  if (loading && !product) {
    return (
      <>
        <PageHeader title="Edit listing" />
        <Skeleton className="h-96" />
      </>
    );
  }

  if (!product || !current) {
    return (
      <>
        <PageHeader title="Edit listing" />
        <Card>
          <CardBody className="p-0">
            <EmptyState
              title="Listing not found"
              description="It may have been removed."
              action={
                <Button asChild>
                  <Link href="/connect/catalogue">Back to catalogue</Link>
                </Button>
              }
            />

        <QueryError error={error} onRetry={refetch} />
          </CardBody>
        </Card>
      </>
    );
  }

  const { manufacturer } = current;
  const publishable = canListProducts(manufacturer.status);

  return (
    <>
      <PageHeader
        title={product.name}
        description={`SKU ${product.sku} · last updated ${new Date(product.updatedAt).toLocaleDateString("en-KE")}`}
        breadcrumbs={[
          { label: "Connect", href: "/connect/dashboard" },
          { label: "Catalogue", href: "/connect/catalogue" },
          { label: "Edit" },
        ]}
        actions={
          product.status === "active" ? (
            <Button variant="secondary" asChild>
              <Link href={`/marketplace/product/${product.id}`}>
                <ExternalLink aria-hidden="true" />
                View live
              </Link>
            </Button>
          ) : null
        }
      />

      <ListingForm
        manufacturerName={manufacturer.tradingName}
        verified={manufacturer.status === "approved"}
        submitting={submitting}
        submitLabel="Save changes"
        defaultValues={{
          name: product.name,
          category: product.category,
          sku: product.sku,
          description: product.description,
          unit: product.unit,
          packSize: product.packSize,
          priceBands: product.priceBands,
          moq: product.moq,
          leadTimeDays: product.leadTimeDays,
          availableRegions: product.availableRegions,
        }}
        secondaryAction={
          <Button variant="ghost" asChild>
            <Link href="/connect/catalogue">Cancel</Link>
          </Button>
        }
        banner={
          product.status === "draft" && !publishable ? (
            <Alert tone="info" title="This listing is a draft">
              It publishes automatically once verification clears.
            </Alert>
          ) : undefined
        }
        onSubmit={async (listing) => {
          setSubmitting(true);
          try {
            await productRepo.update(product.id, listing);
            router.push("/connect/catalogue");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </>
  );
}
