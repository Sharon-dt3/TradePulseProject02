"use client";

import DataTable from "@/components/ui/DataTable";
import Card from "@/components/ui/Card";
import { formatMoney } from "@/lib/format";

/** prices comes from the shared useMarketPriceHistory() poll (see trader/page.js) - not fetched here directly, so this table and MarketPriceSparklines read one shared poll instead of two independent ones. */
export default function MarketPricesTable({ prices }) {
  return (
    <Card title="Market prices" action={<span className="text-xs text-muted">refreshes every 5s</span>}>
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
