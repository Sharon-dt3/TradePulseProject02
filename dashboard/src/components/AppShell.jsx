"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { navItemsForRoles } from "@/lib/roles";

export default function AppShell({ children }) {
  const { user, roles, signOut } = useAuth();
  const pathname = usePathname();
  const navItems = navItemsForRoles(roles);

  if (!user) return children;

  const initial = user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-[#0a2540] text-white/90">
        <div className="border-b border-white/10 px-5 py-5">
          <span className="font-serif-display text-lg font-semibold tracking-tight text-white">
            TradePulse
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative block rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/65 hover:bg-white/5 hover:text-white/90"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-white" />
                )}
                {item.label}
              </Link>
            );
          })}
          {navItems.length === 0 && (
            <p className="px-3.5 py-2 text-xs text-white/50">No roles assigned yet.</p>
          )}
        </nav>
        <div className="border-t border-white/10 p-3 text-[0.7rem] uppercase tracking-[0.08em] text-white/35">
          TradePulse demo environment
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {initial}
            </span>
            <span className="text-sm text-fg">{user.email}</span>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-primary-soft hover:text-fg"
          >
            Sign out
          </button>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden bg-bg p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
