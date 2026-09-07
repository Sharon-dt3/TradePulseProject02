"""
Publish Polygon/Massive historical and live aggregate bars to TradePulse.

The producer is an external-provider boundary adapter. Downstream services only
receive the stable Redis `market.ticks` contract:

    symbol: TradePulse symbol, for example AAPL or BTCUSD
    price: verified aggregate close price
    ts: aggregate start time in epoch milliseconds

At startup, recent one-minute aggregate bars are backfilled so the existing
risk-engine history and dashboard can immediately display verified trends after
a refresh. The WebSocket connection then appends live one-minute aggregates.
Provider credentials remain runtime-only and are never written to source.
"""

import json
import os
import time
from datetime import UTC, datetime, timedelta
from typing import Any, Iterable

import redis
import requests
import websocket

STREAM_NAME = "market.ticks"
REST_BASE_URL = os.environ.get("POLYGON_REST_BASE_URL", "https://api.massive.com")
STOCKS_WS_URL = os.environ.get("POLYGON_STOCKS_WS_URL", "wss://socket.massive.com/stocks")
CRYPTO_WS_URL = os.environ.get("POLYGON_CRYPTO_WS_URL", "wss://socket.massive.com/crypto")
BACKFILL_MINUTES = int(os.environ.get("POLYGON_BACKFILL_MINUTES", "60"))
RECONNECT_DELAY_SECONDS = 5

# Provider ticker -> TradePulse symbol. Polygon prefixes crypto pairs with X:.
STOCK_SYMBOLS = ("AAPL", "MSFT", "GOOGL", "TSLA")
CRYPTO_SYMBOLS = {"X:BTCUSD": "BTCUSD"}


def build_redis_client() -> redis.Redis:
    """Create the Redis client used to publish the stable internal tick shape."""
    host = os.environ.get("REDIS_HOST", "localhost")
    port = int(os.environ.get("REDIS_PORT", "6379"))
    return redis.Redis(host=host, port=port, decode_responses=True)


def publish_tick(redis_client: redis.Redis, symbol: str, price: Any, timestamp_ms: Any) -> None:
    """Publish one verified provider aggregate close using TradePulse's tick schema."""
    redis_client.xadd(
        STREAM_NAME,
        {
            "symbol": symbol,
            "price": str(price),
            "ts": str(int(timestamp_ms)),
        },
    )


def provider_symbol(symbol: str) -> str:
    """Return the Polygon/Massive aggregate ticker for a TradePulse symbol."""
    return "X:BTCUSD" if symbol == "BTCUSD" else symbol


def fetch_recent_bars(api_key: str, symbol: str) -> Iterable[dict[str, Any]]:
    """Fetch recent one-minute OHLCV bars in ascending order from Polygon/Massive."""
    now = datetime.now(UTC)
    start = now - timedelta(minutes=BACKFILL_MINUTES)
    url = (
        f"{REST_BASE_URL}/v2/aggs/ticker/{provider_symbol(symbol)}/range/1/minute/"
        f"{start.date().isoformat()}/{now.date().isoformat()}"
    )
    response = requests.get(
        url,
        params={
            "adjusted": "true",
            "sort": "asc",
            "limit": BACKFILL_MINUTES + 10,
        },
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    return payload.get("results", [])


def backfill_history(redis_client: redis.Redis, api_key: str) -> None:
    """Publish recent verified bars for each tracked symbol before streaming begins."""
    for symbol in (*STOCK_SYMBOLS, *CRYPTO_SYMBOLS.values()):
        try:
            bars = list(fetch_recent_bars(api_key, symbol))
            if not bars:
                print(f"No recent bars returned for {symbol}; leaving it awaiting a provider quote.")
                continue

            cutoff_ms = int((datetime.now(UTC) - timedelta(minutes=BACKFILL_MINUTES)).timestamp() * 1000)
            published = 0
            for bar in bars:
                if int(bar["t"]) < cutoff_ms:
                    continue
                publish_tick(redis_client, symbol, bar["c"], bar["t"])
                published += 1
            print(f"Backfilled {published} verified one-minute bars for {symbol}.")
        except requests.HTTPError as error:
            # Continue with other symbols; an unavailable market or plan entitlement
            # must not prevent the remaining subscribed instruments from updating.
            status_code = error.response.status_code if error.response is not None else "unknown"
            if status_code in {401, 403}:
                print(
                    f"Unable to backfill {symbol}: provider authorization was denied "
                    f"(HTTP {status_code}). Check the active API key and market-data plan."
                )
            else:
                print(f"Unable to backfill {symbol}: provider returned HTTP {status_code}.")
        except requests.RequestException:
            print(f"Unable to backfill {symbol}: provider request failed.")


def run_websocket(
    redis_client: redis.Redis,
    api_key: str,
    url: str,
    subscriptions: list[str],
    symbol_map: dict[str, str],
) -> None:
    """Connect, authenticate, and relay one Polygon/Massive aggregate feed."""
    def on_open(ws: websocket.WebSocketApp) -> None:
        ws.send(json.dumps({"action": "auth", "params": api_key}))

    def on_message(ws: websocket.WebSocketApp, raw_message: str) -> None:
        try:
            events = json.loads(raw_message)
        except json.JSONDecodeError:
            print("Ignoring malformed provider WebSocket message.")
            return

        for event in events if isinstance(events, list) else [events]:
            if event.get("ev") == "status":
                status = event.get("status")
                if status == "auth_success":
                    ws.send(json.dumps({"action": "subscribe", "params": ",".join(subscriptions)}))
                    print(f"Authenticated and subscribed to {', '.join(subscriptions)}.")
                elif status in {"auth_failed", "error"}:
                    print(f"Provider authorization failed: {event.get('message', 'unknown error')}")
                    ws.close()
                continue

            # Polygon/Massive identifies minute aggregate events as AM (stocks)
            # and XA (crypto). Aggregate close `c` and start timestamp `s` are
            # the fields translated into TradePulse's established tick schema.
            if event.get("ev") not in {"AM", "XA"}:
                continue

            provider_ticker = event.get("sym")
            symbol = symbol_map.get(provider_ticker)
            if symbol is None:
                continue

            close = event.get("c")
            timestamp_ms = event.get("s")
            if close is None or timestamp_ms is None:
                continue

            publish_tick(redis_client, symbol, close, timestamp_ms)
            print(f"Live {symbol}: {close}")

    def on_error(_: websocket.WebSocketApp, error: Exception) -> None:
        print(f"Provider WebSocket error: {error}")

    def on_close(_: websocket.WebSocketApp, status_code: int | None, message: str | None) -> None:
        print(f"Provider WebSocket closed: {status_code} {message}")

    websocket.WebSocketApp(
        url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    ).run_forever()


def run_with_retries(
    redis_client: redis.Redis,
    api_key: str,
    url: str,
    subscriptions: list[str],
    symbol_map: dict[str, str],
) -> None:
    """Keep a provider stream connected while allowing transient network recovery."""
    while True:
        run_websocket(redis_client, api_key, url, subscriptions, symbol_map)
        print(f"Reconnecting to provider in {RECONNECT_DELAY_SECONDS} seconds.")
        time.sleep(RECONNECT_DELAY_SECONDS)


def main() -> None:
    """Backfill market history and continuously publish live aggregate prices."""
    api_key = os.environ["POLYGON_API_KEY"]
    redis_client = build_redis_client()
    redis_client.ping()

    backfill_history(redis_client, api_key)

    # The stock and crypto feeds are separate provider WebSockets, so keep the
    # crypto stream in a second process when continuous BTCUSD updates are needed.
    # This foreground process covers equities; invoke with POLYGON_FEED=crypto
    # to run the crypto feed instead.
    feed = os.environ.get("POLYGON_FEED", "stocks").lower()
    if feed == "crypto":
        run_with_retries(
            redis_client,
            api_key,
            CRYPTO_WS_URL,
            ["XA.X:BTCUSD"],
            CRYPTO_SYMBOLS,
        )
        return

    run_with_retries(
        redis_client,
        api_key,
        STOCKS_WS_URL,
        [f"AM.{symbol}" for symbol in STOCK_SYMBOLS],
        {symbol: symbol for symbol in STOCK_SYMBOLS},
    )


if __name__ == "__main__":
    main()
