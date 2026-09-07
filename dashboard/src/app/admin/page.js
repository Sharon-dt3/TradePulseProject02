"use client";

import { useState } from "react";
import RequireRole from "@/components/RequireRole";
import PageHeader from "@/components/ui/PageHeader";
import UsersTable from "@/components/features/UsersTable";
import AccountsDirectory from "@/components/features/AccountsDirectory";
import AuditLogView from "@/components/features/AuditLogView";
import LedgerAdjustmentsPanel from "@/components/features/LedgerAdjustmentsPanel";
import TabBar from "@/components/ui/TabBar";

const SECTIONS = ["Users", "Accounts", "Audit log", "Ledger adjustments"];

function AdminWorkspace() {
  const [section, setSection] = useState(SECTIONS[0]);

  return (
    <div>
      <PageHeader title="Admin" subtitle="Users, accounts, access grants, and platform-wide oversight." />

      <TabBar tabs={SECTIONS} active={section} onChange={setSection} />

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
