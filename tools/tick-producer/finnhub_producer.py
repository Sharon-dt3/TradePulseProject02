"""
Phase 3 tick producer: relays real trade ticks from Finnhub's WebSocket
feed onto the Redis stream "market.ticks".

This is NOT one of TradePulse's real services (ledger-core, risk-engine,
gateway, dashboard) - it's the boundary adapter between an external market
data provider and TradePulse's own internal stream contract. Nothing
downstream (ledger-core's tick consumer, built later in this phase) ever
needs to know Finnhub is the source, or care about Finnhub's own symbol
naming - that translation happens entirely here, in SYMBOL_MAP.

Each republished tick carries the same three explicit fields the
simulated producer (producer.py) used, so the two are drop-in
replacements for each other from the consumer's point of view:
  symbol - TradePulse's own internal ticker name (e.g. "AAPL", "BTCUSD")
  price  - the actual trade price Finnhub reported, as a string
  ts     - epoch milliseconds Finnhub reported the trade at (its own "t"
           field), not when this script or Redis received it - the same
           "tick's own origin time" reasoning as producer.py.

Note on market hours: Finnhub only streams STOCK trades while the
relevant exchange is actually open (e.g. NYSE/NASDAQ ~9:30am-4pm ET,
weekdays) - equities simply go quiet outside that window because no real
trades are happening, not because of a bug here. Its crypto trades
(aggregated from exchanges like Binance) stream 24/7, which is why
BINANCE:BTCUSDT is included - it's the one symbol guaranteed to keep
ticking regardless of when this is run, useful for testing staleness
logic (ledger.max-price-age-ms) at any time of day.
"""

import json
import os

import redis
import websocket

STREAM_NAME = "market.ticks"

# Finnhub's own symbol name -> TradePulse's internal symbol name.
# Everything downstream of this script only ever sees the right-hand
# side; Finnhub's naming conventions (e.g. exchange-prefixed crypto
# pairs) never leak past this boundary.
SYMBOL_MAP = {
    "AAPL": "AAPL",
    "MSFT": "MSFT",
    "GOOGL": "GOOGL",
    "TSLA": "TSLA",
    "BINANCE:BTCUSDT": "BTCUSD",
}


def build_redis_client() -> redis.Redis:
    host = os.environ.get("REDIS_HOST", "localhost")
    port = int(os.environ.get("REDIS_PORT", "6379"))
    return redis.Redis(host=host, port=port, decode_responses=True)


def on_open(ws: websocket.WebSocketApp) -> None:
    for finnhub_symbol in SYMBOL_MAP:
        ws.send(json.dumps({"type": "subscribe", "symbol": finnhub_symbol}))
    print(f"Subscribed to {list(SYMBOL_MAP.keys())}")


def make_on_message(redis_client: redis.Redis):
    def on_message(ws: websocket.WebSocketApp, raw_message: str) -> None:
        message = json.loads(raw_message)

        if message.get("type") != "trade":
            # Finnhub also sends non-trade control messages (e.g. "ping")
            # on this same socket - only "trade" messages carry ticks.
            return

        for trade in message.get("data", []):
            finnhub_symbol = trade["s"]
            internal_symbol = SYMBOL_MAP.get(finnhub_symbol)
            if internal_symbol is None:
                continue  # a symbol we never subscribed to; ignore

            redis_client.xadd(
                STREAM_NAME,
                {
                    "symbol": internal_symbol,
                    "price": str(trade["p"]),
                    "ts": str(trade["t"]),
                },
            )
            print(f"  {internal_symbol}: {trade['p']}")

    return on_message


def on_error(ws: websocket.WebSocketApp, error: Exception) -> None:
    print(f"WebSocket error: {error}")


def on_close(ws: websocket.WebSocketApp, status_code: int, message: str) -> None:
    print(f"WebSocket closed: {status_code} {message}")


def main() -> None:
    api_key = os.environ["FINNHUB_API_KEY"]  # fail fast if not set, rather
    # than silently connecting with an invalid/missing token

    redis_client = build_redis_client()
    redis_client.ping()  # fail fast if Redis isn't reachable

    ws = websocket.WebSocketApp(
        f"wss://ws.finnhub.io?token={api_key}",
        on_open=on_open,
        on_message=make_on_message(redis_client),
        on_error=on_error,
        on_close=on_close,
    )
    print("Connecting to Finnhub... Ctrl+C to stop.")
    ws.run_forever()


if __name__ == "__main__":
    main()
