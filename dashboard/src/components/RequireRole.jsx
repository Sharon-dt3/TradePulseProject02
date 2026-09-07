"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Client-side echo of the backend's own permission checks - NOT a
 * replacement for them. Every endpoint still enforces its own
 * permission on every request regardless of what this shows; this
 * only avoids rendering a page that would just immediately error, and
 * sends a user without any of `roles` back to the sign-in/landing page.
 */
export default function RequireRole({ roles, children }) {
  const { user, roles: userRoles, loading } = useAuth();
  const router = useRouter();

  const authorized = roles.some((r) => userRoles.includes(r));

  useEffect(() => {
    if (loading) return;
    if (!user || !authorized) {
      router.replace("/");
    }
  }, [loading, user, authorized, router]);

  if (loading || !user || !authorized) {
    return (
      <div className="flex h-64 items-center justify-center text-muted">
        {loading ? "Loading..." : "Redirecting..."}
      </div>
    );
  }

  return children;
}
