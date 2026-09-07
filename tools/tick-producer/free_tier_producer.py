"""
Publish free-tier live market data to TradePulse's Redis tick stream.

Finnhub provides real-time U.S. equity trades when supplied with a free
FINNHUB_API_KEY. Coinbase Exchange provides public BTC-USD ticker updates
without credentials. Both provider formats are translated at this boundary
into TradePulse's stable Redis ``market.ticks`` contract:

    symbol: TradePulse symbol, such as AAPL or BTCUSD
    price: verified provider price
    ts: provider event timestamp in epoch milliseconds

Run this script once to keep both feeds connected. Equity trades are only
expected while the relevant U.S. exchange is open; BTCUSD can update 24/7.
"""

import json
import os
import threading
import time
from datetime import UTC, datetime
from typing import Any

import redis
import websocket

STREAM_NAME = "market.ticks"
RECONNECT_DELAY_SECONDS = 5
FINNHUB_WS_URL = "wss://ws.finnhub.io"
COINBASE_WS_URL = "wss://ws-feed.exchange.coinbase.com"
EQUITY_SYMBOLS = ("AAPL", "MSFT", "GOOGL", "TSLA")


def build_redis_client() -> redis.Redis:
    """Create the Redis client used to publish the stable internal tick shape."""
    host = os.environ.get("REDIS_HOST", "localhost")
    port = int(os.environ.get("REDIS_PORT", "6379"))
    return redis.Redis(host=host, port=port, decode_responses=True)


def publish_tick(redis_client: redis.Redis, symbol: str, price: Any, timestamp_ms: int) -> None:
    """Publish one provider quote using TradePulse's established Redis contract."""
    redis_client.xadd(
        STREAM_NAME,
        {
            "symbol": symbol,
            "price": str(price),
            "ts": str(timestamp_ms),
        },
    )


def iso_timestamp_to_milliseconds(value: str | None) -> int:
    """Convert a provider ISO-8601 timestamp to epoch milliseconds safely."""
    if not value:
        return int(datetime.now(UTC).timestamp() * 1000)

    try:
        return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)
    except ValueError:
        return int(datetime.now(UTC).timestamp() * 1000)


def run_finnhub(redis_client: redis.Redis, api_key: str) -> None:
    """Connect to Finnhub and relay subscribed U.S. equity trade events."""
    def on_open(ws: websocket.WebSocketApp) -> None:
        for symbol in EQUITY_SYMBOLS:
            ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))
        print(f"Finnhub subscribed to {', '.join(EQUITY_SYMBOLS)}.")

    def on_message(_: websocket.WebSocketApp, raw_message: str) -> None:
        try:
            message = json.loads(raw_message)
        except json.JSONDecodeError:
            print("Ignoring malformed Finnhub message.")
            return

        if message.get("type") != "trade":
            return

        for trade in message.get("data", []):
            symbol = trade.get("s")
            price = trade.get("p")
            timestamp_ms = trade.get("t")
            if symbol not in EQUITY_SYMBOLS or price is None or timestamp_ms is None:
                continue

            publish_tick(redis_client, symbol, price, int(timestamp_ms))
            print(f"Live {symbol}: {price}")

    def on_error(_: websocket.WebSocketApp, error: Exception) -> None:
        print(f"Finnhub WebSocket error: {error}")

    def on_close(_: websocket.WebSocketApp, status_code: int | None, message: str | None) -> None:
        print(f"Finnhub WebSocket closed: {status_code} {message}")

    websocket.WebSocketApp(
        f"{FINNHUB_WS_URL}?token={api_key}",
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    ).run_forever()


def run_coinbase(redis_client: redis.Redis) -> None:
    """Connect to Coinbase's public ticker feed and relay BTC-USD as BTCUSD."""
    def on_open(ws: websocket.WebSocketApp) -> None:
        ws.send(
            json.dumps(
                {
                    "type": "subscribe",
                    "product_ids": ["BTC-USD"],
                    "channels": ["ticker"],
                },
            )
        )
        print("Coinbase subscribed to BTC-USD ticker.")

    def on_message(_: websocket.WebSocketApp, raw_message: str) -> None:
        try:
            message = json.loads(raw_message)
        except json.JSONDecodeError:
            print("Ignoring malformed Coinbase message.")
            return

        if message.get("type") != "ticker" or message.get("product_id") != "BTC-USD":
            return

        price = message.get("price")
        if price is None:
            return

        publish_tick(redis_client, "BTCUSD", price, iso_timestamp_to_milliseconds(message.get("time")))
        print(f"Live BTCUSD: {price}")

    def on_error(_: websocket.WebSocketApp, error: Exception) -> None:
        print(f"Coinbase WebSocket error: {error}")

    def on_close(_: websocket.WebSocketApp, status_code: int | None, message: str | None) -> None:
        print(f"Coinbase WebSocket closed: {status_code} {message}")

    websocket.WebSocketApp(
        COINBASE_WS_URL,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    ).run_forever()


def run_with_retries(name: str, runner: Any, *arguments: Any) -> None:
    """Keep one provider connection alive while recovering from transient errors."""
    while True:
        try:
            runner(*arguments)
        except Exception as error:  # Connection libraries can fail outside callbacks.
            print(f"{name} feed stopped unexpectedly: {error}")

        print(f"Reconnecting to {name} in {RECONNECT_DELAY_SECONDS} seconds.")
        time.sleep(RECONNECT_DELAY_SECONDS)


def main() -> None:
    """Start the public Coinbase BTCUSD feed and optional Finnhub equities."""
    api_key = os.environ.get("FINNHUB_API_KEY")
    redis_client = build_redis_client()
    redis_client.ping()

    if not api_key:
        print("FINNHUB_API_KEY is not configured; starting Coinbase BTCUSD feed only.")
        run_with_retries("Coinbase", run_coinbase, redis_client)
        return

    finnhub_thread = threading.Thread(
        target=run_with_retries,
        args=("Finnhub", run_finnhub, redis_client, api_key),
        daemon=True,
    )
    finnhub_thread.start()

    print("Starting Coinbase BTCUSD feed and Finnhub equities. Press Ctrl+C to stop.")
    run_with_retries("Coinbase", run_coinbase, redis_client)


if __name__ == "__main__":
    main()
