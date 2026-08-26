import { PageHeader, PhasePlaceholder } from "@/components/shared/page-header";

export default function InsightsPage() {
  return (
    <>
      <PageHeader
        title="Market insights"
        description="What the hardware network is actually buying."
        breadcrumbs={[{ label: "Connect", href: "/connect/dashboard" }, { label: "Insights" }]}
      />
      <PhasePlaceholder
        phase="Phase 2"
        title="Demand and pricing intelligence"
        summary="Available on Premium and VIP. Built on aggregated, consented marketplace and POS data — never on any individual shop's identifiable transactions."
        capabilities={[
          "Category demand by region and how it moves through the year",
          "Where your prices sit against the band for comparable products",
          "Which regions view your listings but do not enquire, and where you are losing them",
          "Product velocity and restocking rhythm across the hardware network",
        ]}
      />
    </>
  );
}
