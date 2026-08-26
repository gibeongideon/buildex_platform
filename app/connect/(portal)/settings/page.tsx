import { PageHeader, PhasePlaceholder } from "@/components/shared/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Company settings"
        description="Your profile, team and payout details."
        breadcrumbs={[{ label: "Connect", href: "/connect/dashboard" }, { label: "Settings" }]}
      />
      <PhasePlaceholder
        phase="Phase 2"
        title="Account administration"
        summary="Company details captured during onboarding are shown on the Verification page. Editing them post-submission goes through the ops console, which arrives in Phase 3."
        capabilities={[
          "Edit trading name, categories, capacity and distribution regions",
          "Invite colleagues with per-role permissions",
          "Bank and M-Pesa settlement details for payouts",
          "Notification preferences for enquiries, orders and verification updates",
        ]}
      />
    </>
  );
}
