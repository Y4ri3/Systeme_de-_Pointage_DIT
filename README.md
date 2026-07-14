# Système de Pointage DIT

API Flask de gestion de présence étudiante par reconnaissance faciale (JWT, PostgreSQL). Voir [description.md](description.md) pour la présentation fonctionnelle complète du projet.

## Stack technique

- Python 3.12, Flask 3, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Migrate (Alembic)
- PostgreSQL 16 (SQLite en développement/tests)
- Documentation API : OpenAPI 3.0.3 servie via Swagger UI (`/swagger`)

## Prérequis

- Python 3.12+
- Docker et Docker Compose (pour PostgreSQL, et pour lancer l'app en conteneur)

## Installation locale (sans Docker pour l'app)

```bash
python -m venv .venv
.venv/Scripts/activate      # Windows
# source .venv/bin/activate  # Linux/Mac

pip install -r requirements.txt

cp .env.example .env
# éditer .env : renseigner au minimum SECRET_KEY, JWT_SECRET_KEY,
# les identifiants PostgreSQL et DATABASE_URL
```

### Base de données

Démarrer uniquement PostgreSQL via Docker :

```bash
docker compose up -d db
```

Appliquer les migrations puis peupler la base avec des comptes de démonstration :

```bash
flask db upgrade
flask seed-db
```

`flask seed-db` crée des comptes de test (étudiant, professeur, responsable, admin) avec le mot de passe `Password123!` — à utiliser uniquement en développement.

### Lancer le serveur de développement

```bash
python run.py
```

L'API est disponible sur `http://localhost:5000`, la documentation Swagger sur `http://localhost:5000/swagger`.

## Lancer avec Docker Compose (stack complète)

```bash
cp .env.example .env
# éditer .env avec de vraies valeurs (SECRET_KEY, JWT_SECRET_KEY, mots de passe...)

docker compose up --build
```

Le service `web` exécute l'application avec `ProductionConfig` (variable `FLASK_CONFIG=production`) : celle-ci **échoue au démarrage** si `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `KIOSK_ALLOWED_NETWORKS` ou `REDIS_URL` ne sont pas définis, afin d'éviter un déploiement avec des secrets par défaut, une borne de pointage accessible depuis n'importe où, ou un flux SSE non partagé entre workers.

## Configuration (variables d'environnement)

Voir `.env.example` pour la liste complète. Principales variables :

| Variable | Description |
|---|---|
| `SECRET_KEY` / `JWT_SECRET_KEY` | Secrets de signature (obligatoires en production) |
| `DATABASE_URL` | URL de connexion PostgreSQL (obligatoire en production) |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Compte SMTP pour l'envoi des mots de passe temporaires |
| `ARSA_FACE_API_KEY` / `ARSA_FACE_BASE_URL` | Accès au service de reconnaissance faciale |
| `ATTENDANCE_KIOSK_API_KEY` | Clé d'accès pour la borne de pointage (kiosk) |
| `KIOSK_ALLOWED_NETWORKS` | CIDR (séparés par des virgules) autorisés à appeler `/attendance/kiosk/*` — obligatoire en production |
| `TRUSTED_PROXY_HOPS` | Nombre de reverse proxies de confiance devant Flask, pour lire la vraie IP cliente via `X-Forwarded-For` |
| `REDIS_URL` | URL Redis utilisée pour le pub/sub des flux SSE de suivi de présence — obligatoire en production |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées (séparées par des virgules) |

### Sécurité de la borne et du pointage QR

Les endpoints `/api/v1/attendance/kiosk/scan`, `/kiosk/checkin` (tablette physique en salle) **et** `/api/v1/etudiant/attendance/checkin-qr` (pointage QR étudiant) sont protégés par une restriction réseau : toute requête dont l'IP cliente n'appartient pas à `KIOSK_ALLOWED_NETWORKS` reçoit un `403 kiosk_network_forbidden`, **y compris avec un JWT valide** (staff ou étudiant selon l'endpoint). Ça suppose que les appareils autorisés (tablettes et étudiants sur place) soient sur un réseau Wi-Fi dédié (VLAN/VPN) dont le CIDR est déclaré dans cette variable — la mise en place réseau elle-même (VLAN, VPN, pare-feu) est hors du périmètre de ce dépôt.

Si l'application est déployée derrière un reverse proxy (nginx, load balancer), `TRUSTED_PROXY_HOPS` doit être positionné (`1` dans le cas d'un seul proxy) pour que `request.remote_addr` reflète l'IP réelle du client et non celle du proxy.

### Deux méthodes de pointage

- **Reconnaissance faciale** (`/attendance/kiosk/scan` + `/kiosk/checkin`) : la tablette identifie l'étudiant par selfie.
- **QR code** (`POST /api/v1/etudiant/attendance/checkin-qr`) : le professeur/la borne affiche un QR de cours (`GET /api/v1/professeur/courses/<id>/qr`, token signé, expire en 120s), l'étudiant le scanne depuis son propre téléphone connecté à son compte et l'envoie à cet endpoint.

Les deux méthodes sont soumises à la même restriction réseau ci-dessus : l'étudiant doit être connecté au Wi-Fi dédié de l'établissement pour pointer, en 4G/données mobiles le pointage QR échoue systématiquement (`403 kiosk_network_forbidden`), même avec un token QR valide.

## Tests

```bash
pytest
```

## Structure du projet

```
app/
  blueprints/    # Routes par domaine : auth, attendance (kiosk), etudiant, professeur, admin
  models/        # Modèles SQLAlchemy
  services/      # Logique métier (pointage, reconnaissance faciale, emails, exports...)
  utils/         # Décorateurs, helpers de sérialisation/pagination
migrations/      # Migrations Alembic
tests/           # Tests pytest
swagger.yml      # Spécification OpenAPI
```
