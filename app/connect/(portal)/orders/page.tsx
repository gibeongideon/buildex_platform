import { PageHeader, PhasePlaceholder } from "@/components/shared/page-header";

export default function OrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders & enquiries"
        description="Requests coming in from hardware shops."
        breadcrumbs={[{ label: "Connect", href: "/connect/dashboard" }, { label: "Orders" }]}
      />
      <PhasePlaceholder
        phase="Phase 2"
        title="Your orders inbox"
        summary="Hardware shops start ordering once the marketplace side of Buildex is live in Phase 4. Enquiry handling lands first, in Phase 2."
        capabilities={[
          "Enquiry inbox with the shop's region, order size and requested delivery date",
          "Quote back against your own price bands, or accept at list",
          "Order acceptance, dispatch confirmation and delivery notes",
          "Fulfilment history feeding your reliability score with hardware shops",
        ]}
      />
    </>
  );
}
