"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Superseded by /trader (Phase 20) - this pre-Phase-20 page is kept
 * only as a redirect so any bookmarked/old link still lands somewhere
 * useful instead of 404ing.
 */
export default function OrdersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/trader");
  }, [router]);
  return null;
}
