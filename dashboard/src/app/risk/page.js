"use client";

import RequireRole from "@/components/RequireRole";
import PageHeader from "@/components/ui/PageHeader";
import RiskAggregateView from "@/components/features/RiskAggregateView";

function RiskWorkspace() {
  return (
    <div>
      <PageHeader title="Risk Manager" subtitle="Firm-wide risk, live." />
      <RiskAggregateView />
    </div>
  );
}

export default function RiskPage() {
  return (
    <RequireRole roles={["risk_manager"]}>
      <RiskWorkspace />
    </RequireRole>
  );
}
