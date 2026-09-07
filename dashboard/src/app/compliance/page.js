"use client";

import { useState } from "react";
import RequireRole from "@/components/RequireRole";
import PageHeader from "@/components/ui/PageHeader";
import AccountsDirectory from "@/components/features/AccountsDirectory";
import RiskAggregateView from "@/components/features/RiskAggregateView";
import ComplianceCasesPanel from "@/components/features/ComplianceCasesPanel";
import AuditLogView from "@/components/features/AuditLogView";

const SECTIONS = ["Accounts", "Cases", "Risk", "Audit log"];

function ComplianceWorkspace() {
  const [section, setSection] = useState(SECTIONS[0]);

  return (
    <div>
      <PageHeader title="Compliance" subtitle="Accounts, cases, firm-wide risk, and the audit trail." />

      <div className="mb-4 flex gap-1 border-b border-line">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-3 py-2 text-sm font-medium ${
              section === s ? "border-b-2 border-primary text-primary" : "text-muted hover:text-fg"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

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
