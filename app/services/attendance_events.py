"""Pub/sub pour notifier les abonnes SSE d'un changement de pointage.

En production, un backend Redis partage permet aux workers Gunicorn de publier et
recevoir les evenements sur un meme canal. En developpement/tests (ou si Redis est
absent), un registre en memoire reste disponible pour conserver un fonctionnement
simple sans infrastructure supplementaire.
"""

import queue
import threading
import time

from flask import current_app, has_app_context
from redis import from_url
from redis.exceptions import RedisError

_lock = threading.Lock()
_subscribers = {}
_redis_clients = {}


class _MemorySubscription:
    def __init__(self, cours_id, q):
        self.cours_id = cours_id
        self._queue = q

    def get(self, timeout):
        return self._queue.get(timeout=timeout)

    def close(self):
        with _lock:
            subscribers = _subscribers.get(self.cours_id)
            if subscribers is None:
                return
            subscribers.discard(self._queue)
            if not subscribers:
                _subscribers.pop(self.cours_id, None)


class _RedisSubscription:
    def __init__(self, pubsub, channel):
        self._pubsub = pubsub
        self._channel = channel

    def get(self, timeout):
        deadline = time.monotonic() + timeout
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise queue.Empty

            message = self._pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=min(remaining, 1.0),
            )
            if message is not None:
                return message.get("data")

    def close(self):
        self._pubsub.unsubscribe(self._channel)
        self._pubsub.close()


def _channel_name(cours_id):
    return f"attendance:cours:{cours_id}"


def _redis_url():
    if not has_app_context():
        return None
    return current_app.config.get("REDIS_URL")


def _get_redis_client():
    redis_url = _redis_url()
    if not redis_url:
        return None

    with _lock:
        client = _redis_clients.get(redis_url)
        if client is None:
            client = from_url(redis_url, decode_responses=True)
            _redis_clients[redis_url] = client
        return client


def _log_redis_fallback(message):
    if has_app_context():
        current_app.logger.warning(message)


def subscribe(cours_id):
    client = _get_redis_client()
    if client is not None:
        channel = _channel_name(cours_id)
        try:
            pubsub = client.pubsub(ignore_subscribe_messages=True)
            pubsub.subscribe(channel)
            return _RedisSubscription(pubsub, channel)
        except RedisError:
            _log_redis_fallback(
                "Redis indisponible pour le flux SSE, repli sur le registre local en memoire."
            )

    q = queue.Queue()
    with _lock:
        _subscribers.setdefault(cours_id, set()).add(q)
    return _MemorySubscription(cours_id, q)


def unsubscribe(cours_id, subscription):
    subscription.close()


def publish(cours_id):
    client = _get_redis_client()
    if client is not None:
        try:
            client.publish(_channel_name(cours_id), "1")
            return
        except RedisError:
            _log_redis_fallback(
                "Redis indisponible pour publier un evenement SSE, repli sur le registre local en memoire."
            )

    with _lock:
        subscribers = list(_subscribers.get(cours_id, ()))
    for q in subscribers:
        q.put(True)
