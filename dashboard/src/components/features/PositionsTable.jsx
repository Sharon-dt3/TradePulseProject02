"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import { formatMoney, formatNumber, formatPct } from "@/lib/format";

/**
 * Displays the account's current positions with quote-derived allocation and
 * allows the Trader workspace to open position details or a prefilled ticket.
 */
export default function PositionsTable({ positions, prices = [], loading, onSelectPosition, onTrade }) {
  const [query, setQuery] = useState("");

  const pricedPositions = useMemo(
    () =>
      (positions ?? []).map((position) => {
        const quote = prices.find((price) => price.symbol === position.symbol);
        const marketValue = quote ? Number(position.quantity) * Number(quote.price) : null;
        return { ...position, marketValue, quoteAgeMs: quote?.ageMs ?? null };
      }),
    [positions, prices],
  );
  const totalMarketValue = pricedPositions.reduce((total, position) => total + (position.marketValue ?? 0), 0);
  const normalizedQuery = query.trim().toUpperCase();
  const visiblePositions = normalizedQuery
    ? pricedPositions.filter((position) => position.symbol.toUpperCase().includes(normalizedQuery))
    : pricedPositions;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="min-w-52 flex-1 text-sm text-muted">
          <span className="sr-only">Search positions</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search holdings by symbol"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <p className="text-xs text-muted">
          {loading ? "Loading holdings…" : `${visiblePositions.length} of ${pricedPositions.length} position${pricedPositions.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <DataTable
        loading={loading}
        rows={visiblePositions}
        rowKey="symbol"
        emptyMessage={normalizedQuery ? "No positions match this symbol." : "No open positions."}
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
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <div className="flex items-center gap-2">
                {onSelectPosition && (
                  <Button type="button" size="sm" variant="secondary" onClick={() => onSelectPosition(row.symbol)}>
                    Details
                  </Button>
                )}
                {onTrade && (
                  <Button type="button" size="sm" onClick={() => onTrade(row.symbol)}>
                    Trade
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
