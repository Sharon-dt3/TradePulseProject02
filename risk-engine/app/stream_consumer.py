"""Phase 7: reusable Redis Streams consumer-group scaffolding.

Python equivalent of ledger-core's AbstractStreamConsumer.java — that
class's own javadoc says it's meant to be extended by "Phase 7's
risk-engine consumer" too, but it's a Java abstract class in ledger-core's
codebase, and risk-engine is a separate Python service. A Python service
can't literally extend a Java class, so this reimplements the same
pattern (idempotent group creation tolerating BUSYGROUP, a blocking
read-loop on a daemon thread, ack only after the handler succeeds) rather
than sharing code across the language boundary.

Delivery semantics: at-least-once, same as the Java version. A record is
only XACK'd after handle_record() returns without raising; if the process
is killed (or handle_record raises) between delivery and ack, the same
record is redelivered to this consumer on its next read. Subclasses must
make handle_record() safe to call more than once for the same record.
"""
import logging
import threading

import redis

logger = logging.getLogger(__name__)


class StreamConsumer:
    def __init__(
        self,
        redis_client: redis.Redis,
        stream_key: str,
        consumer_group: str,
        consumer_name: str,
    ):
        self._redis = redis_client
        self._stream_key = stream_key
        self._consumer_group = consumer_group
        self._consumer_name = consumer_name
        self._running = False
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        """Idempotent — calling this more than once while already running
        has no effect, same contract as the Java version's start()."""
        if self._running:
            return
        self._running = True
        self._ensure_consumer_group_exists()
        self._thread = threading.Thread(
            target=self._run,
            name=f"{self._consumer_group}-{self._consumer_name}",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._running = False

    def _ensure_consumer_group_exists(self) -> None:
        """XGROUP CREATE ... MKSTREAM is not itself idempotent — Redis
        raises a BUSYGROUP error if the group already exists (e.g. after a
        restart, where the group was created on a previous run and never
        removed). That specific failure is expected and safely ignored;
        anything else is a real problem and should propagate."""
        try:
            self._redis.xgroup_create(
                self._stream_key, self._consumer_group, id="0", mkstream=True
            )
            logger.info(
                "Created consumer group '%s' on stream '%s'",
                self._consumer_group,
                self._stream_key,
            )
        except redis.exceptions.ResponseError as ex:
            if "BUSYGROUP" in str(ex):
                logger.debug(
                    "Consumer group '%s' already exists on stream '%s'",
                    self._consumer_group,
                    self._stream_key,
                )
            else:
                raise

    def _run(self) -> None:
        while self._running:
            try:
                response = self._redis.xreadgroup(
                    groupname=self._consumer_group,
                    consumername=self._consumer_name,
                    streams={self._stream_key: ">"},
                    count=50,
                    block=2000,
                )
                if not response:
                    continue

                for _stream_key, messages in response:
                    for record_id, fields in messages:
                        try:
                            self.handle_record(record_id, fields)
                            self._redis.xack(
                                self._stream_key, self._consumer_group, record_id
                            )
                        except Exception:
                            logger.exception(
                                "Failed to handle record %s from stream '%s'",
                                record_id,
                                self._stream_key,
                            )
            except Exception:
                if self._running:
                    logger.exception(
                        "Error reading from stream '%s'", self._stream_key
                    )

    def handle_record(self, record_id: str, fields: dict) -> None:
        """Handle one stream record. Must be idempotent — see the
        module-level delivery-semantics note. Subclasses override this."""
        raise NotImplementedError
