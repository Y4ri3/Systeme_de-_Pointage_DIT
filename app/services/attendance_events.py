"""Pub/sub en memoire pour notifier les abonnes SSE d'un changement de pointage.

Utilise par le flux Server-Sent Events de suivi de presence (voir
professeur/routes.py:stream_course_attendance) pour remplacer le polling front toutes
les 15s par une notification poussee des qu'un pointage est enregistre ou regularise
sur un cours.

Limitation connue : ce registre vit dans la memoire d'un seul process Python. Avec
plusieurs workers (ex. `gunicorn -w 4`), un evenement publie par le worker qui traite
le pointage n'atteint pas les abonnes SSE connectes a un autre worker. Deploiement
recommande pour ce flux : un seul worker multi-thread (`gunicorn -w 1 --threads N` ou
un worker classe `gthread`), suffisant pour l'usage vise (quelques ecrans de suivi
professeur/responsable en simultane). Pour un usage multi-worker a plus grande echelle,
remplacer ce registre par un backend partage (Redis pub/sub, etc.).
"""

import queue
import threading

_lock = threading.Lock()
_subscribers = {}


def subscribe(cours_id):
    q = queue.Queue()
    with _lock:
        _subscribers.setdefault(cours_id, set()).add(q)
    return q


def unsubscribe(cours_id, q):
    with _lock:
        subscribers = _subscribers.get(cours_id)
        if subscribers is None:
            return
        subscribers.discard(q)
        if not subscribers:
            _subscribers.pop(cours_id, None)


def publish(cours_id):
    with _lock:
        subscribers = list(_subscribers.get(cours_id, ()))
    for q in subscribers:
        q.put(True)
