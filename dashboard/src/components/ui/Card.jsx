"use client";

/**
 * Renders a consistent, elevated dashboard content card with optional header
 * content and actions.
 */
export default function Card({ title, action, className = "", children }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-[#263754] bg-surface/95 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-[#365071] hover:shadow-[var(--shadow-card-hover)] ${className}`}
    >
      {(title || action) && (
        <div className="flex min-h-12 items-center justify-between gap-4 border-b border-[#22324a] bg-[#111f34] px-4 py-2.5">
          {title && (
            <h3 className="text-[0.67rem] font-extrabold uppercase tracking-[0.12em] text-[#aab9d0]">
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
