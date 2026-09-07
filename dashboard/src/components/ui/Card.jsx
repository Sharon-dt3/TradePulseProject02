"use client";

/**
 * Renders a consistent dashboard content panel with optional header content
 * and actions. The intentionally quiet treatment prioritizes financial data.
 */
export default function Card({ title, action, className = "", children }) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-[#cba5ad] hover:shadow-[var(--shadow-card-hover)] ${className}`}
    >
      {(title || action) && (
        <div className="flex min-h-12 items-center justify-between gap-4 border-b border-line bg-[#fdf8f6] px-4 py-2.5">
          {title && (
            <h3 className="text-[0.67rem] font-extrabold uppercase tracking-[0.11em] text-[#67464e]">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
