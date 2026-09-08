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
    title: "Connected trading operations",
    lead: "TradePulse connects market information, investment decisions, execution, portfolio intelligence, and operational oversight in one traceable workflow.",
    sections: [
      {
        title: "The lifecycle",
        items: [
          "Live market quote",
          "Portfolio and risk review",
          "Order submission",
          "Execution or Working status",
          "Cash, holdings, and risk updates",
          "Transaction and audit evidence",
        ],
      },
    ],
  },
  {
    eyebrow: "Secure access",
    title: "Sign in to the right workspace",
    lead: "Users select a workspace, sign in with email and password, and enter only when their assigned role authorizes that workspace.",
    sections: [
      {
        title: "Available demo workspaces",
        items: ["Trader", "Viewer", "Risk Manager", "Compliance", "Admin"],
      },
      {
        title: "How access is protected",
        items: [
          "Supabase authenticates the email-and-password sign-in.",
          "The session is refreshed after sign-in to obtain current role claims.",
          "The dashboard checks the JWT user_role claim before navigation.",
          "Backend services enforce permissions again for every protected request.",
        ],
      },
    ],
  },
  {
    eyebrow: "Trader",
    title: "Make informed trading decisions",
    lead: "The Trader workspace brings together portfolio value, cash, holdings, market context, orders, transactions, and advisory risk information.",
    sections: [
      {
        title: "What a Trader can do",
        items: [
          "Review portfolio value, cash available, holdings, and open orders.",
          "Explore price context and observed movement.",
          "Place market or limit buy and sell orders.",
          "Cancel eligible Working orders.",
          "Review orders, trades, transactions, and statements.",
        ],
      },
    ],
  },
  {
    eyebrow: "Market data",
    title: "Symbols, live feeds, and demo values",
    lead: "The order ticket supports BTCUSD, AAPL, MSFT, GOOGL, and TSLA, but only a usable server-side quote can support live execution.",
    sections: [
      {
        title: "Data sources",
        items: [
          "BTCUSD is supplied through Coinbase and is the most dependable live-demo symbol.",
          "AAPL, MSFT, GOOGL, and TSLA use Finnhub when the feed is configured and active.",
          "Equity values labeled Simulated or Demo only are browser-generated display values.",
        ],
      },
      {
        title: "Important boundary",
        items: [
          "Simulated quotes do not create backend market data.",
          "They do not execute orders, persist positions, or change risk calculations.",
        ],
      },
    ],
  },
  {
    eyebrow: "Order workflow",
    title: "Place a trade in seven steps",
    lead: "Every order is reviewed before submission so the Trader can confirm the instruction, estimated value, and available advisory risk context.",
    sections: [
      {
        title: "Order steps",
        items: [
          "1. Select a symbol.",
          "2. Choose Buy or Sell.",
          "3. Select Market or Limit.",
          "4. Enter a positive quantity.",
          "5. Enter a limit price when needed.",
          "6. Review estimated value and projected risk.",
          "7. Submit the order.",
        ],
      },
      {
        title: "Demo example",
        items: ["BTCUSD", "Buy", "Market", "Quantity: 0.001"],
      },
    ],
  },
  {
    eyebrow: "Order types",
    title: "Market versus limit orders",
    lead: "Market orders prioritize execution speed; limit orders prioritize price control.",
    sections: [
      {
        title: "Market order",
        items: [
          "Attempts to execute immediately at the freshest available quote.",
          "Final execution price may differ from the displayed estimate.",
          "Can be rejected when no fresh quote is available, the account is frozen, a sale exceeds holdings, or an exposure control is breached.",
        ],
      },
      {
        title: "Limit order",
        items: [
          "A limit buy sets the highest acceptable purchase price.",
          "A limit sell sets the lowest acceptable sale price.",
          "The order remains Working if the market has not reached the chosen price.",
          "A Working order may fill later, be cancelled, or expire.",
        ],
      },
    ],
  },
  {
    eyebrow: "Trade outcome",
    title: "When a buy order fills",
    lead: "A filled buy shifts value from cash into an investment holding and creates records for execution, ledger activity, and later oversight.",
    sections: [
      {
        title: "Buy effects",
        items: [
          "Cash available decreases by the actual filled value.",
          "The purchased symbol quantity increases in holdings.",
          "The order becomes Filled.",
          "A Trade record and ledger-facing Transaction are created.",
          "The purchased asset can become a larger share of the portfolio.",
        ],
      },
      {
        title: "Example",
        items: [
          "Buying 0.001 BTCUSD near $79,000 costs approximately $79.",
          "Cash falls by approximately $79 and BTCUSD holdings rise by 0.001.",
        ],
      },
    ],
  },
  {
    eyebrow: "Trade outcome",
    title: "When a sell order fills",
    lead: "A filled sell reduces the held quantity and converts the completed amount back into available cash.",
    sections: [
      {
        title: "Sell effects",
        items: [
          "The sold asset quantity decreases in holdings.",
          "Cash available increases by the actual filled value.",
          "The order becomes Filled.",
          "A corresponding Trade and Transaction are recorded.",
          "Exposure to that asset generally decreases.",
        ],
      },
      {
        title: "Position protection",
        items: [
          "Non-margin accounts cannot sell more of an asset than they own.",
          "A sale that would reduce a position below zero is rejected.",
        ],
      },
    ],
  },
  {
    eyebrow: "Portfolio intelligence",
    title: "Cash, holdings, and market value",
    lead: "TradePulse keeps cash and investments distinct so users can understand both account composition and market-driven value.",
    sections: [
      {
        title: "Key terms",
        items: [
          "Cash available: cash balance in the account.",
          "Holding: an owned symbol and quantity.",
          "Market value: holding quantity × latest usable quote.",
          "Holdings value: combined value of positions with usable quotes.",
          "Portfolio value: cash available + quoted holdings value.",
        ],
      },
      {
        title: "Allocation",
        items: [
          "Allocation is a position's share of quoted holdings value.",
          "A 100% allocation means it is the only currently quoted holding; it does not mean the account has no cash.",
        ],
      },
    ],
  },
  {
    eyebrow: "Risk analytics",
    title: "Understand how trades change exposure",
    lead: "Risk analytics provide advisory decision support using current positions and persisted price history; they do not guarantee outcomes or independently approve a trade.",
    sections: [
      {
        title: "Measures to explain",
        items: [
          "Concentration: how much depends on the largest position.",
          "Volatility: observed variation in portfolio returns.",
          "95% VaR: modeled one-period downside threshold.",
          "Historical VaR: downside estimate from historical outcomes.",
          "Expected Shortfall: average loss beyond the VaR tail threshold.",
        ],
      },
      {
        title: "Trade impact",
        items: [
          "Buying more of a large holding can increase concentration and downside sensitivity.",
          "Selling part of a large holding generally reduces that asset-specific exposure.",
          "Results depend on sufficient, relevant persisted price history.",
        ],
      },
    ],
  },
  {
    eyebrow: "Viewer",
    title: "Read-only account visibility",
    lead: "Viewer is for a client, supervisor, or reporting user who needs authorized account visibility without transaction authority.",
    sections: [
      {
        title: "Viewer can",
        items: [
          "Open an account that has been granted to them.",
          "Review the account summary.",
          "View orders, positions, and trades.",
        ],
      },
      {
        title: "Viewer cannot",
        items: [
          "Place or cancel orders.",
          "Change roles or account access.",
          "Freeze accounts or create ledger adjustments.",
        ],
      },
    ],
  },
  {
    eyebrow: "Risk Manager",
    title: "Independent firm-wide risk oversight",
    lead: "Risk Managers assess exposure patterns across the firm without receiving an order-entry workspace.",
    sections: [
      {
        title: "Risk Manager can",
        items: [
          "Review firm-wide risk aggregates.",
          "Inspect exposure and risk-position information.",
          "Monitor concentration, volatility, VaR, and downside patterns.",
          "Use available live updates to identify issues for escalation.",
        ],
      },
      {
        title: "Separation of duties",
        items: [
          "The Risk workspace does not provide trade placement or cancellation.",
          "This keeps risk assessment independent from trading execution.",
        ],
      },
    ],
  },
  {
    eyebrow: "Compliance",
    title: "Controls and investigations",
    lead: "Compliance users monitor activity, investigate cases, review evidence, and apply account restrictions when a control action is required.",
    sections: [
      {
        title: "Compliance can",
        items: [
          "Review accounts and firm-wide risk information.",
          "Open and manage compliance cases.",
          "Inspect the compliance audit log.",
          "Freeze or unfreeze accounts with a required reason.",
        ],
      },
      {
        title: "What an account freeze does",
        items: [
          "Blocks new orders.",
          "Preserves positions and historical records.",
          "Records the stated reason in the audit trail.",
        ],
      },
    ],
  },
  {
    eyebrow: "Admin",
    title: "Access and operational governance",
    lead: "Admins govern who can use the system, which accounts are visible, and how exceptional operational actions are controlled.",
    sections: [
      {
        title: "Admin can",
        items: [
          "View users and assign or remove individual roles.",
          "Review accounts and manage account access grants.",
          "Freeze or unfreeze accounts with a reason.",
          "Review the platform-wide audit log.",
          "Propose and approve eligible ledger adjustments.",
        ],
      },
      {
        title: "Role updates",
        items: [
          "Removing one role does not remove a user's other roles.",
          "The affected user should refresh their session or sign in again to use updated role claims.",
        ],
      },
    ],
  },
  {
    eyebrow: "Dual control",
    title: "Controlled ledger adjustments",
    lead: "Ledger adjustments are exceptional cash corrections, not normal trading activity, and require two different administrators.",
    sections: [
      {
        title: "The dual-control workflow",
        items: [
          "1. Admin A proposes an adjustment with account ID, amount, and reason.",
          "2. The proposal does not change the cash balance.",
          "3. Admin B reviews and approves it.",
          "4. Approval changes cash and creates ledger and audit evidence.",
          "5. A reversal requires a new compensating adjustment.",
        ],
      },
      {
        title: "Control safeguard",
        items: ["The same Admin cannot both propose and approve the adjustment."],
      },
    ],
  },
  {
    eyebrow: "Close",
    title: "One traceable control story",
    lead: "TradePulse connects execution speed with clear accountability: market quote to informed order, controlled execution, updated portfolio and risk context, and audit-ready oversight.",
    sections: [
      {
        title: "The people behind the lifecycle",
        items: [
          "Traders make and monitor investment decisions.",
          "Viewers inspect approved accounts without transaction authority.",
          "Risk Managers assess firm-wide exposure independently.",
          "Compliance users investigate activity and apply account controls.",
          "Admins govern identities, access, and controlled operations.",
        ],
      },
    ],
  },
];

/**
 * Renders the authenticated, presentation-ready TradePulse Guide.
 * Slides can be advanced with the visible controls or keyboard arrow keys.
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
        subtitle="A presentation-ready walkthrough of the trading lifecycle, platform controls, and role-specific workspaces."
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
            Presentation in motion
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
 * Exposes the TradePulse Guide to authenticated dashboard users.
 */
export default function GuidePage() {
  return (
    <RequireRole roles={ALL_ROLES}>
      <TradePulseGuide />
    </RequireRole>
  );
}
