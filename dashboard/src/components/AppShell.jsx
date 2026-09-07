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
      <p className="px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#7a82a1]">
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
            className={`group flex items-center rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
              active
                ? "bg-gradient-to-r from-[#4f46e5] to-[#6857e9] text-white shadow-[0_7px_18px_rgba(79,70,229,0.24)]"
                : "text-[#59647f] hover:translate-x-0.5 hover:bg-white/80 hover:text-[#26324e] hover:shadow-sm"
            }`}
          >
            <span
              className={`mr-2.5 h-1.5 w-1.5 rounded-full transition-colors ${
                active ? "bg-[#dddafe]" : "bg-[#b7c0d6] group-hover:bg-primary"
              }`}
            />
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
        className="sr-only z-[60] rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-fg shadow-lg focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/70 bg-[#e8ecfa]/85 backdrop-blur-xl md:flex">
        <div className="border-b border-white/80 px-5 py-6">
          <div className="inline-flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#5b52ed] to-[#3d72d6] text-sm font-bold text-white shadow-md">
              T
            </span>
            <span className="font-serif-display text-xl font-semibold tracking-tight text-[#28365b]">
              TradePulse
            </span>
          </div>
          <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.13em] text-[#7a82a1]">
            Brokerage workspace
          </p>
        </div>
        <div className="flex-1">{nav}</div>
        <div className="m-3 rounded-xl border border-white/90 bg-white/55 px-3 py-2.5 text-[0.68rem] font-bold uppercase tracking-[0.09em] text-[#707a98] shadow-sm">
          Demo environment
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between border-b border-white/70 bg-white/65 px-4 py-3 backdrop-blur-xl md:px-7">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-xl border border-line bg-white/80 px-3 py-1.5 text-sm font-semibold text-fg shadow-sm hover:bg-primary-soft md:hidden"
            aria-label="Open navigation"
            aria-expanded={navOpen}
          >
            Menu
          </button>
          <div className="hidden items-center gap-2 text-xs font-semibold text-muted md:flex">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_0_4px_rgba(20,128,94,0.12)]" />
            Secure account workspace
          </div>
          <div className="flex items-center gap-3 md:ml-auto">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ecebff] to-[#dbeeff] text-xs font-bold text-primary ring-1 ring-white">
              {initial}
            </span>
            <span className="hidden max-w-56 truncate text-sm font-semibold text-fg sm:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-muted hover:bg-white hover:text-fg hover:shadow-sm"
            >
              Sign out
            </button>
          </div>
        </header>

        {navOpen && (
          <div
            className="fixed inset-0 z-50 bg-[#1e1b4b]/25 backdrop-blur-sm md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <aside className="flex h-full w-72 flex-col border-r border-white/80 bg-[#edf0fc]/95 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/80 px-5 py-5">
                <div>
                  <span className="font-serif-display text-xl font-semibold text-[#28365b]">
                    TradePulse
                  </span>
                  <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#7a82a1]">
                    Brokerage workspace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  className="rounded-xl px-2.5 py-1 text-lg text-muted hover:bg-white hover:text-fg"
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
