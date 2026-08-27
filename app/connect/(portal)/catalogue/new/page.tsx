"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ListingForm } from "@/components/shared/listing-form";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/primitives";
import { productRepo } from "@/lib/data";
import { canListProducts } from "@/lib/schemas/verification";
import { useCurrentManufacturer } from "../../use-current-manufacturer";
import { QueryError } from "@/components/ui/query-state";

export default function NewListingPage() {
  const { data, loading, error, refetch } = useCurrentManufacturer();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Add a product" />
        <Skeleton className="h-96" />
      </>
    );
  }
  if (!data) return null;

  const { manufacturer } = data;
  const publishable = canListProducts(manufacturer.status);

  return (
    <>
      <PageHeader
        title="Add a product"
        description="Price it the way you actually sell it. The preview shows exactly what a hardware shop will see."
        breadcrumbs={[
          { label: "Connect", href: "/connect/dashboard" },
          { label: "Catalogue", href: "/connect/catalogue" },
          { label: "Add product" },
        ]}
      />

        <QueryError error={error} onRetry={refetch} />

      <ListingForm
        manufacturerName={manufacturer.tradingName}
        verified={manufacturer.status === "approved"}
        submitting={submitting}
        submitLabel={publishable ? "Publish listing" : "Save as draft"}
        secondaryAction={
          <Button variant="ghost" asChild>
            <Link href="/connect/catalogue">Cancel</Link>
          </Button>
        }
        banner={
          publishable ? undefined : (
            <Alert tone="info" title="This will save as a draft">
              Verification is still in progress. The listing goes live automatically once
              your checks clear.
            </Alert>
          )
        }
        onSubmit={async (listing) => {
          setSubmitting(true);
          try {
            await productRepo.create({
              ...listing,
              manufacturerId: manufacturer.id,
              imageUrls: [],
              status: publishable ? "active" : "draft",
            });
            router.push("/connect/catalogue");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </>
  );
}
