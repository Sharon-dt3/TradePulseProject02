"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { ledgerCoreFetch } from "@/lib/api/client";
import { formatMoney, formatDate } from "@/lib/format";

export default function TransactionsTable() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    ledgerCoreFetch("/ledger/transactions").then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <DataTable
      loading={rows === null}
      rows={rows}
      rowKey="journalEntryId"
      emptyMessage="No transactions yet."
      columns={[
        { key: "createdAt", label: "Date", sortable: true, render: (r) => formatDate(r.createdAt) },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount", render: (r) => formatMoney(r.amount) },
      ]}
    />
  );
}
