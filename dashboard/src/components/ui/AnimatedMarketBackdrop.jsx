"use client";

const BACKDROP_SYMBOLS = ["BTCUSD", "AAPL", "MSFT", "GOOGL", "TSLA", "LIVE"];
const TICKER_ITEMS = [
  "BTCUSD • MARKET ACTIVE",
  "AAPL • LIVE WATCH",
  "MSFT • QUOTE STREAM",
  "GOOGL • MARKET WATCH",
  "TSLA • LIVE WATCH",
];

/**
 * Renders a decorative, non-interactive animated market backdrop.
 * It is intentionally aria-hidden so it never competes with page content.
 */
export default function AnimatedMarketBackdrop({ className = "" }) {
  return (
    <div className={`animated-market-backdrop ${className}`} aria-hidden="true">
      <div className="animated-market-glow animated-market-glow-one" />
      <div className="animated-market-glow animated-market-glow-two" />
      <div className="animated-market-grid" />
      <div className="animated-market-price-line">
        <span />
      </div>
      {BACKDROP_SYMBOLS.map((symbol, index) => (
        <span key={symbol} className={`animated-market-symbol animated-market-symbol-${index + 1}`}>
          {symbol}
        </span>
      ))}
    </div>
  );
}

// PUBLIC_INTERFACE
/**
 * Renders a prominent decorative market ticker for the top of selected pages.
 * The ticker is visual-only and does not present prices as executable quotes.
 */
export function TopMarketTicker() {
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="top-market-ticker" aria-label="Animated market watch">
      <div className="top-market-ticker-label">
        <span className="top-market-ticker-live-dot" aria-hidden="true" />
        Market watch
      </div>
      <div className="top-market-ticker-window">
        <div className="top-market-ticker-track">
          {tickerItems.map((item, index) => (
            <span key={`${item}-${index}`} className="top-market-ticker-item">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
