import { PageHeader, PhasePlaceholder } from "@/components/shared/page-header";

export default function CampaignsPage() {
  return (
    <>
      <PageHeader
        title="Regional campaigns"
        description="Pay to be more visible where you actually want to sell."
        breadcrumbs={[{ label: "Connect", href: "/connect/dashboard" }, { label: "Campaigns" }]}
      />
      <PhasePlaceholder
        phase="Phase 2"
        title="Regional targeting"
        summary="Premium and VIP packages let you boost visibility in specific regions — Kakamega versus Kisumu — priced on hardware coverage and turnover potential in each."
        capabilities={[
          "Campaign builder targeting counties and regions, with live reach estimates",
          "Regional pricing derived from hardware shop count and expected turnover",
          "Campaign metrics: impressions, product views, enquiries, orders and conversion",
          "Budget pacing and campaign scheduling",
        ]}
      />
    </>
  );
}
