"use client";

import Link from "next/link";
import RequireRole from "@/components/RequireRole";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";

const INVESTMENT_OPTIONS = [
  {
    title: "Individual stocks & ETFs",
    status: "Available",
    tone: "success",
    description:
      "Use the Trader workspace to submit market or limit orders for symbols supported by the current market-data feed.",
    detail: "A current quote and the appropriate account permissions are required.",
  },
  {
    title: "Government, municipal & corporate bonds",
    status: "Planned",
    tone: "info",
    description:
      "Fixed-income investing requires bond terms, pricing or inventory, settlement handling, and suitability disclosures.",
    detail: "Bond execution is not currently available.",
  },
  {
    title: "CDs, Treasury bills, money-market funds & cash",
    status: "Planned",
    tone: "info",
    description:
      "Cash-management products require product terms, settlement processes, and account-servicing support.",
    detail: "Cash products cannot currently be purchased through this platform.",
  },
  {
    title: "Retirement & target-date portfolios",
    status: "Planned",
    tone: "info",
    description:
      "Retirement products need account eligibility, contribution handling, and portfolio-product data.",
    detail: "No retirement accounts or target-date portfolios are active yet.",
  },
  {
    title: "Managed & robo-advised portfolios",
    status: "Planned",
    tone: "info",
    description:
      "Managed investing needs an advisory workflow, objectives, rebalancing rules, and applicable disclosures.",
    detail: "The platform does not currently provide investment advice.",
  },
  {
    title: "Options strategies",
    status: "Approval required",
    tone: "warning",
    description:
      "Options require account approval, suitability checks, option-chain pricing, and product-specific risk controls.",
    detail: "Options trading is not currently enabled.",
  },
  {
    title: "REITs, commodities & selected alternatives",
    status: "Planned",
    tone: "info",
    description:
      "Alternative products require product-specific data, permissions, disclosures, and regulatory review.",
    detail: "Only supported quoted symbols can be traded today.",
  },
  {
    title: "Crypto-related products",
    status: "Limited data",
    tone: "warning",
    description:
      "The configured market-data feed may provide selected crypto-related symbols for monitoring.",
    detail: "Availability does not imply custody, execution, or suitability approval.",
  },
];

function InvestmentOption({ option }) {
  return (
    <article className="rounded-xl border border-line bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">{option.title}</h2>
        <Badge tone={option.tone}>{option.status}</Badge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {option.description}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted">{option.detail}</p>
    </article>
  );
}

function MarketsWorkspace() {
  return (
    <div>
      <PageHeader
        title="Markets"
        subtitle="Explore investment categories and understand what is available in the current trading workflow."
        action={
          <Link
            href="/trader"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-opacity hover:opacity-90"
          >
            Open Trader
          </Link>
        }
      />

      <Card title="Investment marketplace">
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Browse the investment options planned for this brokerage experience.
          Orders can only be submitted for symbols with a supported current quote
          through the existing Trader workflow.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {INVESTMENT_OPTIONS.map((option) => (
            <InvestmentOption key={option.title} option={option} />
          ))}
        </div>
      </Card>

      <Card title="Current trading access" className="mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-fg">Available today</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              The existing Trader workspace supports the established market and
              limit-order workflow for symbols available from the configured
              market-data feed.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">
              Before new products can be enabled
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Each category needs its required instrument data, account controls,
              risk rules, disclosures, and execution or servicing capability.
            </p>
          </div>
        </div>
      </Card>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        This marketplace is informational and does not provide investment advice,
        research, product approval, real-time market-data entitlement guarantees,
        or execution for products not explicitly supported by the Trader workflow.
      </p>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <RequireRole roles={["trader"]}>
      <MarketsWorkspace />
    </RequireRole>
  );
}
