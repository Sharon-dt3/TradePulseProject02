"use client";

/**
 * Displays the consistent heading, supporting context, and optional action
 * area used at the top of each dashboard workspace.
 */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <header className="mb-5 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-[0.63rem] font-extrabold uppercase tracking-[0.15em] text-primary">
          TradePulse
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-[1.75rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
