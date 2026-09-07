"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { navItemsForRoles } from "@/lib/roles";

/**
 * Provides the authenticated application frame, responsive navigation, and
 * account controls used by every TradePulse workspace.
 */
export default function AppShell({ children }) {
  const { user, roles, signOut } = useAuth();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const navItems = navItemsForRoles(roles);

  if (!user) return children;

  const initial = user.email?.[0]?.toUpperCase() ?? "?";
  const nav = (
    <nav aria-label="Primary navigation" className="space-y-1 p-3">
      <p className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#71809b]">
        Workspace
      </p>
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setNavOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-fg shadow-sm"
                : "text-[#52627c] hover:bg-white hover:text-fg hover:shadow-sm"
            }`}
          >
            <span className={`mr-2 h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-[#aab7cb]"}`} />
            {item.label}
          </Link>
        );
      })}
      {navItems.length === 0 && (
        <p className="px-3.5 py-2 text-xs text-muted">No roles assigned yet.</p>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded bg-surface px-4 py-2 text-sm font-semibold text-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#d8e1ed] bg-[#edf3fb] md:flex">
        <div className="border-b border-[#d8e1ed] px-5 py-6">
          <span className="font-serif-display text-xl font-semibold tracking-tight text-[#193b70]">
            TradePulse
          </span>
          <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#71809b]">
            Brokerage workspace
          </p>
        </div>
        <div className="flex-1">{nav}</div>
        <div className="m-3 rounded-lg border border-[#d8e1ed] bg-white/70 px-3 py-2.5 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#71809b]">
          Demo environment
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-7">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg shadow-sm hover:bg-primary-soft md:hidden"
            aria-label="Open navigation"
            aria-expanded={navOpen}
          >
            Menu
          </button>
          <div className="hidden text-xs font-medium text-muted md:block">
            Secure account workspace
          </div>
          <div className="flex items-center gap-3 md:ml-auto">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
              {initial}
            </span>
            <span className="hidden max-w-56 truncate text-sm font-medium text-fg sm:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-primary-soft hover:text-fg"
            >
              Sign out
            </button>
          </div>
        </header>

        {navOpen && (
          <div
            className="fixed inset-0 z-50 bg-[#14213a]/25 backdrop-blur-[1px] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <aside className="flex h-full w-72 flex-col border-r border-[#d8e1ed] bg-[#edf3fb] shadow-xl">
              <div className="flex items-center justify-between border-b border-[#d8e1ed] px-5 py-5">
                <div>
                  <span className="font-serif-display text-xl font-semibold text-[#193b70]">
                    TradePulse
                  </span>
                  <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#71809b]">
                    Brokerage workspace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  className="rounded-lg px-2 py-1 text-lg text-muted hover:bg-white hover:text-fg"
                  aria-label="Close navigation"
                >
                  ×
                </button>
              </div>
              <div className="flex-1">{nav}</div>
            </aside>
          </div>
        )}

        <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-7">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
