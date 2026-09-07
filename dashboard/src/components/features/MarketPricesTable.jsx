"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import Card from "@/components/ui/Card";
import { ledgerCoreFetch } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";

export default function MarketPricesTable() {
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    ledgerCoreFetch("/market/prices").then(setPrices).catch(() => setPrices([]));
  }, []);

  return (
    <Card title="Market prices">
      <DataTable
        loading={prices === null}
        rows={prices}
        rowKey="symbol"
        emptyMessage="No prices available."
        columns={[
          { key: "symbol", label: "Symbol", sortable: true },
          { key: "price", label: "Price", render: (r) => formatMoney(r.price) },
          { key: "ageMs", label: "Age", render: (r) => `${Math.round(r.ageMs / 1000)}s ago` },
        ]}
      />
    </Card>
  );
}
