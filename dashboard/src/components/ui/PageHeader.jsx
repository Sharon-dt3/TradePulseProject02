"use client";

/**
 * Displays the consistent heading, supporting context, and optional action
 * area used at the top of each dashboard workspace.
 */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <header className="mb-5 flex flex-col gap-3 border-b border-[#22324a] pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(45,212,191,0.9)]" />
          <p className="text-[0.63rem] font-extrabold uppercase tracking-[0.16em] text-primary">
            TradePulse terminal
          </p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
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
