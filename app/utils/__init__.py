from datetime import UTC, datetime


def utcnow():
    """Retourne un datetime UTC naive pour rester compatible avec les colonnes DateTime existantes."""
    return datetime.now(UTC).replace(tzinfo=None)
