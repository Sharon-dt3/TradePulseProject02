import {supabase} from "@/lib/supabaseClient";

/**
 * Returns the Authorization header for the current session, or an
 * empty object if no one is signed in. Every outgoing request to
 * gateway/ledger-core/risk-engine should spread this into its headers
 * — this is the one place that knows how to attach a token, so no
 * route call is ever built without it by accident.
 */
export async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {};
  }

  return { Authorization: `Bearer ${session.access_token}` };
}