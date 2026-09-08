"use client";

const BACKDROP_SYMBOLS = ["BTCUSD", "AAPL", "MSFT", "GOOGL", "TSLA", "LIVE"];

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
