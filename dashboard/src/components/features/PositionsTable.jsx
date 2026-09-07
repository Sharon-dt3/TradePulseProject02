import DataTable from "@/components/ui/DataTable";
import { formatMoney, formatNumber, formatPct } from "@/lib/format";

export default function PositionsTable({ positions, prices = [], loading }) {
  const pricedPositions = (positions ?? []).map((position) => {
    const quote = prices.find((price) => price.symbol === position.symbol);
    const marketValue = quote ? Number(position.quantity) * Number(quote.price) : null;
    return { ...position, marketValue, quoteAgeMs: quote?.ageMs ?? null };
  });
  const totalMarketValue = pricedPositions.reduce((total, position) => total + (position.marketValue ?? 0), 0);

  return (
    <DataTable
      loading={loading}
      rows={pricedPositions}
      rowKey="symbol"
      emptyMessage="No open positions."
      columns={[
        { key: "symbol", label: "Symbol", sortable: true },
        { key: "quantity", label: "Quantity", sortable: true, render: (row) => formatNumber(row.quantity) },
        { key: "marketValue", label: "Market value", sortable: true, render: (row) => formatMoney(row.marketValue) },
        {
          key: "allocation",
          label: "Allocation",
          render: (row) => row.marketValue !== null && totalMarketValue > 0 ? formatPct(row.marketValue / totalMarketValue) : "—",
        },
        {
          key: "quoteAgeMs",
          label: "Quote status",
          render: (row) => row.quoteAgeMs === null ? "No quote" : `${Math.round(row.quoteAgeMs / 1000)}s old`,
        },
      ]}
    />
  );
}
