"use client";

/**
 * Renders a consistently styled dashboard content card with optional header
 * content and actions.
 */
export default function Card({ title, action, className = "", children }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-card)] transition-[box-shadow,border-color] hover:border-[#ccd8e8] hover:shadow-[var(--shadow-card-hover)] ${className}`}
    >
      {(title || action) && (
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-line bg-[#fbfcfe] px-5 py-3.5">
          {title && (
            <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#52627c]">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
