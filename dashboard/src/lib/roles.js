/**
 * Decodes the "user_role" claim out of a Supabase JWT client-side (no
 * extra network call - the claim is already in the token AuthContext
 * already holds). A JWT is header.payload.signature in base64url; only
 * the payload needs decoding, and only to read one claim - this never
 * verifies the signature (that's the backend's job, on every request).
 */
export function decodeRoles(accessToken) {
  if (!accessToken) return [];
  try {
    const payload = accessToken.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    const claims = JSON.parse(json);
    return claims.user_role ?? [];
  } catch {
    return [];
  }
}

/** The 8 valid roles, in the order they appear in nav. */
export const ALL_ROLES = [
  "trader",
  "viewer",
  "delegated_viewer",
  "compliance",
  "risk_manager",
  "admin",
  "support",
  "auditor",
];

/**
 * Nav entries this dashboard actually has a route for. Support/Auditor
 * hold real permissions but have no backend read endpoints yet (Phase
 * 20 plan, §7.6) - deliberately absent here rather than linking to a
 * page that would only ever show empty/broken state.
 */
export const NAV_ITEMS = [
  { role: "trader", href: "/trader", label: "Overview" },
  { role: "trader", href: "/markets", label: "Markets" },
  { role: "viewer", href: "/viewer", label: "Investments" },
  { role: "delegated_viewer", href: "/viewer", label: "Investments" },
  { role: "compliance", href: "/compliance", label: "Compliance" },
  { role: "risk_manager", href: "/risk", label: "Risk" },
  { role: "admin", href: "/admin", label: "Admin" },
  { href: "/guide", label: "TradePulse Guide" },
];

/** Nav items for a set of held roles, de-duplicated by href. */
export function navItemsForRoles(roles) {
  const seen = new Set();
  const items = [];
  for (const item of NAV_ITEMS) {
    if ((!item.role || roles.includes(item.role)) && !seen.has(item.href)) {
      seen.add(item.href);
      items.push(item);
    }
  }
  return items;
}
