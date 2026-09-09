"use client";

import { useEffect, useState } from "react";
import RequireRole from "@/components/RequireRole";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { ALL_ROLES } from "@/lib/roles";

const MARKET_SYMBOLS = ["BTCUSD", "AAPL", "MSFT", "GOOGL", "TSLA", "BUY", "SELL", "VaR"];

const SLIDES = [
  {
    eyebrow: "TradePulse Guide",
    title: "TradePulse at a glance",
    lead: "TradePulse brings together market context, portfolio management, controlled order execution, and accountable oversight in one role-based platform.",
    sections: [
      {
        title: "The lifecycle",
        items: [
          "Review current market quotes and portfolio context.",
          "Submit a controlled market or limit order.",
          "Record the execution, financial effect, and audit evidence.",
          "Make updated exposure available for independent oversight.",
        ],
      },
    ],
  },
  {
    eyebrow: "Secure access",
    title: "Role-based access",
    lead: "A user's assigned role controls which workspace and actions are available. The dashboard and backend services both enforce that access.",
    sections: [
      {
        title: "Role workspaces",
        items: [
          "Trader: manages supported orders, positions, and account activity.",
          "Viewer: reviews authorized accounts without trading authority.",
          "Risk Manager: monitors firm-wide exposure independently.",
          "Compliance and Admin: handle investigations, controls, and access governance.",
        ],
      },
    ],
  },
  {
    eyebrow: "Trader",
    title: "Portfolio and market context",
    lead: "Before acting, a Trader can review available cash, quoted holdings, open orders, current market information, and advisory risk context.",
    sections: [
      {
        title: "What the overview explains",
        items: [
          "Portfolio value combines available cash with holdings that have usable quotes.",
          "Allocation is based on quoted holdings, not cash.",
          "Market Pulse displays quotes the platform has actually received.",
          "BTCUSD is the most dependable live-demo symbol because it uses Coinbase data.",
        ],
      },
    ],
  },
  {
    eyebrow: "Risk analytics",
    title: "Risk analysis",
    lead: "Risk metrics support informed decisions, while server-side controls enforce the actual order and account rules.",
    sections: [
      {
        title: "Measures to explain",
        items: [
          "Concentration shows how much exposure depends on one asset.",
          "Volatility measures observed changes in prices or returns.",
          "Value at Risk estimates a downside threshold at a chosen confidence level.",
          "Expected Shortfall estimates average losses beyond the Value at Risk threshold.",
        ],
      },
    ],
  },
  {
    eyebrow: "Order workflow",
    title: "Small market order",
    lead: "Use a small BTCUSD market buy to demonstrate how TradePulse validates and records a trading instruction.",
    sections: [
      {
        title: "Demo example",
        items: [
          "Symbol: BTCUSD.",
          "Action: Buy.",
          "Order type: Market.",
          "Quantity: 0.001.",
          "A fresh quote and account controls are required before acceptance.",
        ],
      },
    ],
  },
  {
    eyebrow: "Traceability",
    title: "Order-to-audit traceability",
    lead: "TradePulse keeps the requested instruction, execution result, financial effect, and audit evidence distinct but connected.",
    sections: [
      {
        title: "When an order fills",
        items: [
          "The order status becomes Filled and an execution is recorded as a Trade.",
          "Cash and position balances reflect the actual filled amount.",
          "A ledger-facing Transaction records the financial effect.",
          "Audit evidence preserves a traceable path from quote to order to outcome.",
        ],
      },
    ],
  },
  {
    eyebrow: "Governance",
    title: "Independent oversight",
    lead: "Oversight roles can review risk, cases, records, and access without receiving a Trader's order-entry authority.",
    sections: [
      {
        title: "Separation of duties",
        items: [
          "Viewers inspect authorized account information without placing orders.",
          "Risk Managers assess firm-wide exposure and downside patterns.",
          "Compliance users investigate activity and apply authorized controls.",
          "Administrators govern identities, roles, account access, and controlled operations.",
        ],
      },
    ],
  },
  {
    eyebrow: "Close",
    title: "Closing message",
    lead: "TradePulse combines informed decisions with enforceable controls and independent review.",
    sections: [
      {
        title: "One accountable workflow",
        items: [
          "Traders use current quotes and advisory risk context to make decisions.",
          "Ledger Core validates and records the financial outcome.",
          "Risk and Compliance review activity independently.",
          "Admin governs access so users receive only the powers required for their responsibilities.",
        ],
      },
    ],
  },
];

/**
 * Renders the authenticated, presentation-ready eight-slide TradePulse Guide.
 * Slides can be advanced with visible controls, slide selectors, or keyboard keys.
 */
function TradePulseGuide() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = SLIDES[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === SLIDES.length - 1;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight" && !isLastSlide) {
        setCurrentSlide((index) => index + 1);
      }

      if (event.key === "ArrowLeft" && !isFirstSlide) {
        setCurrentSlide((index) => index - 1);
      }

      if (event.key === "Home") {
        setCurrentSlide(0);
      }

      if (event.key === "End") {
        setCurrentSlide(SLIDES.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFirstSlide, isLastSlide]);

  return (
    <div className="guide-workspace">
      <div className="guide-market-background" aria-hidden="true">
        <div className="guide-orb guide-orb-one" />
        <div className="guide-orb guide-orb-two" />
        <div className="guide-grid" />
        {MARKET_SYMBOLS.map((symbol, index) => (
          <span key={symbol} className={`guide-market-symbol guide-symbol-${index + 1}`}>
            {symbol}
          </span>
        ))}
      </div>

      <PageHeader
        title="TradePulse Guide"
        subtitle="A concise walkthrough of the trading lifecycle, platform controls, and role-specific workspaces."
        action={
          <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
            {currentSlide + 1} of {SLIDES.length}
          </span>
        }
      />

      <section
        className="guide-deck relative overflow-hidden rounded-2xl border border-[#ba8591] p-5 shadow-[0_14px_35px_rgba(92,30,48,0.14)] sm:p-8"
        aria-label={`Slide ${currentSlide + 1}: ${slide.title}`}
      >
        <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[#f0bdc7]/50 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-[#c98e9d]/35 blur-3xl" />

        <div key={slide.title} className="guide-slide-content relative">
          <div className="guide-market-ticker" aria-hidden="true">
            <div className="guide-market-ticker-track">
              {[...MARKET_SYMBOLS, ...MARKET_SYMBOLS].map((symbol, index) => (
                <span key={`${symbol}-${index}`} className="guide-market-ticker-item">
                  <span className="guide-market-ticker-dot" />
                  {symbol}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
            <span className="guide-live-indicator" aria-hidden="true" />
            Presentation guide
          </div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{slide.eyebrow}</p>
          <h2 className="mt-4 max-w-4xl font-serif-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            {slide.title}
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#51323a] sm:text-lg">{slide.lead}</p>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {slide.sections.map((section) => (
              <article key={section.title} className="rounded-xl border border-[#d0a0aa] bg-[#fffaf9]/85 p-5 shadow-sm">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-primary">{section.title}</h3>
                <ul className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-fg">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2" aria-label="Slide navigation">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCurrentSlide((index) => Math.max(0, index - 1))}
            disabled={isFirstSlide}
          >
            Previous
          </Button>
          <Button
            type="button"
            onClick={() => setCurrentSlide((index) => Math.min(SLIDES.length - 1, index + 1))}
            disabled={isLastSlide}
          >
            Next
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" aria-label="Choose a slide">
          {SLIDES.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all ${
                currentSlide === index ? "w-7 bg-primary" : "w-2.5 bg-[#d9bcc1] hover:bg-[#ab6c7b]"
              }`}
              aria-label={`Go to slide ${index + 1}: ${item.title}`}
              aria-current={currentSlide === index ? "step" : undefined}
            />
          ))}
        </div>

        <p className="text-xs text-muted">Use ← / → arrows, Home, or End to present.</p>
      </div>

      <div className="guide-slide-progress mt-3" aria-hidden="true">
        <span style={{ width: `${((currentSlide + 1) / SLIDES.length) * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * Exposes the TradePulse Guide to all authenticated dashboard roles.
 */
export default function GuidePage() {
  return (
    <RequireRole roles={ALL_ROLES}>
      <TradePulseGuide />
    </RequireRole>
  );
}
