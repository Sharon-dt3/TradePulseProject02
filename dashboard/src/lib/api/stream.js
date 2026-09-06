import { ledgerCoreFetch } from "@/lib/api/client";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8081";

/**
 * Opens a ticket-authenticated SSE connection to the gateway. Never
 * puts the raw JWT in the URL — EventSource can't set an Authorization
 * header, so ledger-core mints a short-lived, single-use ticket over a
 * normal Bearer-authenticated REST call first (see StreamTicketService
 * on ledger-core), and only that opaque ticket goes in the query
 * string. The gateway's ticket middleware consumes it on first use, so
 * this must only ever be called once per connection attempt — opening
 * two EventSources from the same ticket will make the second one fail.
 */
export async function openLiveStream() {
  const { ticket } = await ledgerCoreFetch("/stream/tickets", {
    method: "POST",
  });
  return new EventSource(`${GATEWAY_URL}/sse?ticket=${ticket}`);
}
