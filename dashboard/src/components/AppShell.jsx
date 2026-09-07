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

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-4 py-4">
          <span className="text-sm font-bold tracking-tight text-fg">TradePulse</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-fg" : "text-fg hover:bg-line/40"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {navItems.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">No roles assigned yet.</p>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <span className="text-sm text-muted">{user.email}</span>
          <button
            onClick={signOut}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-fg hover:bg-line/40"
          >
            Sign out
          </button>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
