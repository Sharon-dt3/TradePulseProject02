"use client";

import { useState } from "react";
import RequireRole from "@/components/RequireRole";
import PageHeader from "@/components/ui/PageHeader";
import AccountsDirectory from "@/components/features/AccountsDirectory";
import RiskAggregateView from "@/components/features/RiskAggregateView";
import ComplianceCasesPanel from "@/components/features/ComplianceCasesPanel";
import AuditLogView from "@/components/features/AuditLogView";
import TabBar from "@/components/ui/TabBar";

const SECTIONS = ["Accounts", "Cases", "Risk", "Audit log"];

function ComplianceWorkspace() {
  const [section, setSection] = useState(SECTIONS[0]);

  return (
    <div>
      <PageHeader title="Compliance" subtitle="Accounts, cases, firm-wide risk, and the audit trail." />

      <TabBar tabs={SECTIONS} active={section} onChange={setSection} />

      {section === "Accounts" && <AccountsDirectory canFreeze />}
      {section === "Cases" && <ComplianceCasesPanel />}
      {section === "Risk" && <RiskAggregateView />}
      {section === "Audit log" && <AuditLogView endpoint="/compliance/audit-log" />}
    </div>
  );
}

export default function CompliancePage() {
  return (
    <RequireRole roles={["compliance"]}>
      <ComplianceWorkspace />
    </RequireRole>
  );
}
