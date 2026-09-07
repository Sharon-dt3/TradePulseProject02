"use client";

import { useState } from "react";
import RequireRole from "@/components/RequireRole";
import PageHeader from "@/components/ui/PageHeader";
import UsersTable from "@/components/features/UsersTable";
import AccountsDirectory from "@/components/features/AccountsDirectory";
import AuditLogView from "@/components/features/AuditLogView";
import LedgerAdjustmentsPanel from "@/components/features/LedgerAdjustmentsPanel";

const SECTIONS = ["Users", "Accounts", "Audit log", "Ledger adjustments"];

function AdminWorkspace() {
  const [section, setSection] = useState(SECTIONS[0]);

  return (
    <div>
      <PageHeader title="Admin" subtitle="Users, accounts, access grants, and platform-wide oversight." />

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

      {section === "Users" && <UsersTable />}
      {section === "Accounts" && <AccountsDirectory canFreeze canManageGrants />}
      {section === "Audit log" && <AuditLogView endpoint="/admin/audit-log" />}
      {section === "Ledger adjustments" && <LedgerAdjustmentsPanel />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminWorkspace />
    </RequireRole>
  );
}
