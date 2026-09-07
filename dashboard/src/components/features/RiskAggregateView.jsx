"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import LiveDot from "@/components/ui/LiveDot";
import DataTable from "@/components/ui/DataTable";
import { formatMoney, formatNumber, formatDate, isInsufficientHistory } from "@/lib/format";
import { riskEngineFetch } from "@/lib/api/client";
import { openLiveStream } from "@/lib/api/stream";

/**
 * Firm-wide risk (GET /risk/aggregate, gated by risk.aggregate.read -
 * shared by Risk Manager and Compliance). Loaded once on mount, then
 * live-patched per-account by the same risk_update SSE event Trader's
 * RiskPanel uses - the only difference is the ticket here carries
 * firmWideRisk=true (StreamTicketController checks risk.aggregate.read),
 * so gateway forwards every account's update instead of filtering to
 * one. The SSE payload only carries var95/volatility/sharpe/
 * insufficientHistory/computedAt (no portfolioValue) - byAccount rows
 * are patched in place, byAccount/highRiskAccountCount/
 * totalPortfolioValue summary figures are left as last computed on
 * load until the next full refresh, since the live event can't
 * recompute those.
 */
export default function RiskAggregateView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [flashIds, setFlashIds] = useState(new Set());
  const flashTimers = useRef({});

  const load = () =>
    riskEngineFetch("/risk/aggregate")
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let eventSource;

    openLiveStream()
      .then((es) => {
        if (cancelled) {
          es.close();
          return;
        }
        eventSource = es;
        eventSource.addEventListener("connected", () => setLiveConnected(true));
        eventSource.addEventListener("risk_update", (e) => {
          const patch = JSON.parse(e.data);
          setData((prev) => {
            if (!prev) return prev;
            const byAccount = prev.byAccount.map((row) =>
              row.accountId === patch.accountId
                ? {
                    ...row,
                    var95: patch.var95,
                    volatility: patch.volatility,
                    insufficientHistory: isInsufficientHistory(patch.insufficientHistory),
                    computedAt: patch.computedAt,
                  }
                : row
            );
            return { ...prev, byAccount };
          });
          setFlashIds((prev) => new Set(prev).add(patch.accountId));
          clearTimeout(flashTimers.current[patch.accountId]);
          flashTimers.current[patch.accountId] = setTimeout(() => {
            setFlashIds((prev) => {
              const next = new Set(prev);
              next.delete(patch.accountId);
              return next;
            });
          }, 1500);
        });
        eventSource.onerror = () => setLiveConnected(false);
      })
      .catch(() => setLiveConnected(false));

    return () => {
      cancelled = true;
      eventSource?.close();
      Object.values(flashTimers.current).forEach(clearTimeout);
    };
  }, []);

  const accountColumns = [
    { key: "accountId", label: "Account ID" },
    { key: "portfolioValue", label: "Portfolio value", render: (r) => formatMoney(r.portfolioValue), sortable: true },
    {
      key: "var95",
      label: "VaR (95%)",
      render: (r) => (isInsufficientHistory(r.insufficientHistory) ? "—" : formatNumber(r.var95)),
    },
    {
      key: "volatility",
      label: "Volatility",
      render: (r) => (isInsufficientHistory(r.insufficientHistory) ? "—" : formatNumber(r.volatility)),
    },
    {
      key: "highRisk",
      label: "Risk",
      render: (r) =>
        isInsufficientHistory(r.insufficientHistory) ? (
          <Badge tone="neutral">insufficient history</Badge>
        ) : r.highRisk ? (
          <Badge tone="danger">high</Badge>
        ) : (
          <Badge tone="success">normal</Badge>
        ),
    },
    { key: "computedAt", label: "As of", render: (r) => formatDate(r.computedAt) },
  ];

  const symbolColumns = [
    { key: "symbol", label: "Symbol", sortable: true },
    { key: "netQuantity", label: "Net quantity", render: (r) => formatNumber(r.netQuantity, 2) },
    { key: "latestPrice", label: "Latest price", render: (r) => formatMoney(r.latestPrice) },
    { key: "notionalValue", label: "Notional value", render: (r) => formatMoney(r.notionalValue) },
  ];

  return (
    <div className="space-y-4">
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Total portfolio value">
          <div className="text-2xl font-semibold text-fg">{data ? formatMoney(data.totalPortfolioValue) : "—"}</div>
        </Card>
        <Card title="Accounts">
          <div className="text-2xl font-semibold text-fg">{data ? data.accountCount : "—"}</div>
        </Card>
        <Card title="High-risk accounts" action={<LiveDot connected={liveConnected} />}>
          <div className="text-2xl font-semibold text-danger">{data ? data.highRiskAccountCount : "—"}</div>
          {data && <div className="text-xs text-muted">threshold: VaR &gt; {formatNumber(data.highRiskThresholdPct * 100, 1)}% of portfolio value</div>}
        </Card>
      </div>

      <Card title="Risk by account">
        <DataTable
          columns={accountColumns}
          rows={data?.byAccount}
          loading={!data}
          rowKey="accountId"
          emptyMessage="No account risk snapshots yet."
          rowClassName={(row) => (flashIds.has(row.accountId) ? "bg-info-bg" : "")}
        />
      </Card>

      <Card title="Net exposure by symbol">
        <DataTable
          columns={symbolColumns}
          rows={data?.bySymbol}
          loading={!data}
          rowKey="symbol"
          emptyMessage="No open positions firm-wide."
        />
      </Card>
    </div>
  );
}
