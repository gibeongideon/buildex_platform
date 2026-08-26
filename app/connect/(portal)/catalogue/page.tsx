import { PageHeader, PhasePlaceholder } from "@/components/shared/page-header";

export default function CataloguePage() {
  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Everything you sell into the Buildex hardware network."
        breadcrumbs={[{ label: "Connect", href: "/connect/dashboard" }, { label: "Catalogue" }]}
      />
      <PhasePlaceholder
        phase="Phase 2"
        title="Catalogue management is next"
        summary="Your first listing was created during onboarding and appears on the dashboard. Full catalogue management arrives in the next phase."
        capabilities={[
          "Create, edit and archive listings with the same price-band validation used at onboarding",
          "Bulk price-list import from CSV, with a preview and per-row error report",
          "Stock status and lead-time updates without re-editing the whole listing",
          "Per-product view and enquiry counts for Basic packages and above",
        ]}
      />
    </>
  );
}
