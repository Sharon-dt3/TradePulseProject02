"use client";

/**
 * Renders a consistent, elevated dashboard content card with optional header
 * content and actions.
 */
export default function Card({ title, action, className = "", children }) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-white/80 bg-surface/90 shadow-[var(--shadow-card)] backdrop-blur-sm transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-[#cfd5fb] hover:shadow-[var(--shadow-card-hover)] ${className}`}
    >
      {(title || action) && (
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[#e8ebf5] bg-gradient-to-r from-[#fbfcff] to-[#f5f4ff] px-5 py-3.5">
          {title && (
            <h3 className="text-[0.7rem] font-extrabold uppercase tracking-[0.11em] text-[#58637e]">
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
