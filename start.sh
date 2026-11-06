#!/bin/sh
# Point d'entree du conteneur : applique les migrations avant de lancer Gunicorn,
# pour les hebergeurs sans etape de pre-deploiement (ex. offre gratuite Render).
set -e

flask db upgrade

# Comptes de demonstration (mot de passe Password123!) : a n'activer que pour une demo.
if [ "$SEED_DEMO_DATA" = "true" ]; then
    flask seed-db
fi

# gthread : le flux SSE de suivi de presence garde une connexion ouverte, des threads
# evitent qu'il bloque un worker entier.
exec gunicorn --bind "0.0.0.0:${PORT:-5000}" \
    --workers "${WEB_CONCURRENCY:-2}" --worker-class gthread --threads 8 \
    --timeout 120 run:app
