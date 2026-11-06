# Système de Pointage DIT

Plateforme de gestion de la présence étudiante par **reconnaissance faciale** et **QR code**, développée pour Dakar Institute of Technology (DIT). Ce dépôt contient l'API backend (Flask, JWT, PostgreSQL).

Pour la présentation fonctionnelle détaillée, voir [description.md](description.md).

## Contexte et objectif

L'appel oral ou la feuille d'émargement fait perdre du temps en début de séance, laisse passer la fraude (signature à la place d'un camarade) et ne donne pas aux responsables de vision consolidée de l'assiduité.

Le Système de Pointage DIT numérise ce processus :

- l'étudiant pointe par **selfie**, comparé à la photo de référence de son compte, avec une **détection de vivacité** (anti-photo / anti-écran) ;
- ou en scannant le **QR code** du cours affiché par le professeur (jeton signé, valable 120 s) ;
- le statut (présent, en retard, absent) est calculé automatiquement selon l'heure de pointage et la tolérance du cours ;
- les absences sont consolidées, les seuils d'alerte détectés, et les données exportables.

## Fonctionnalités

| Profil | Possibilités |
|---|---|
| **Étudiant** | Consulter ses cours, pointer (QR), suivre son historique et ses absences, recevoir des notifications |
| **Professeur** | Consulter ses cours, afficher le QR de pointage, suivre les présences en temps réel (SSE), annuler/reporter un cours, régulariser un pointage |
| **Responsable / Admin** | Gérer comptes, filières, promotions, matières, salles et cours ; import en masse (Excel/CSV) ; justifier les absences ; exports |
| **Borne (kiosk)** | Tablette en salle identifiant les étudiants par reconnaissance faciale |

Autres points notables :

- création de compte avec mot de passe temporaire envoyé par email et changement obligatoire à la première connexion ;
- réinitialisation du mot de passe oublié par lien email ;
- restriction réseau des endpoints de pointage (Wi-Fi dédié de l'établissement) ;
- documentation OpenAPI interactive via Swagger UI.

## Stack technique

- **Backend** : Python 3.12, Flask 3, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Migrate (Alembic)
- **Base de données** : PostgreSQL 16 (SQLite en développement/tests)
- **Temps réel** : Server-Sent Events, Redis (pub/sub entre workers)
- **Reconnaissance faciale** : API [ARSA Face](https://faceapi.arsa.technology) (comparaison de visages + liveness)
- **Déploiement** : Docker, Docker Compose, Gunicorn
- **Qualité** : pytest, flake8, black, CI GitHub Actions

## Prérequis

- Python 3.12+
- Docker et Docker Compose (pour PostgreSQL/Redis, ou pour lancer toute la stack)
- Une clé API ARSA Face (facultative : sans elle, seul le pointage facial est indisponible)

## Installation locale

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # Linux/Mac

pip install -r requirements.txt

cp .env.example .env
# éditer .env : renseigner au minimum SECRET_KEY et JWT_SECRET_KEY
```

### Base de données

Par défaut, le développement local utilise SQLite. Pour utiliser PostgreSQL, démarrer le conteneur et décommenter `DATABASE_URL` dans `.env` :

```bash
docker compose up -d db
```

Appliquer les migrations puis peupler la base avec des données de démonstration :

```bash
flask db upgrade
flask seed-db
```

`flask seed-db` crée des promotions, salles, matières, cours et des comptes de test (étudiant, professeur, responsable, admin) avec le mot de passe `Password123!` — **à utiliser uniquement en développement**.

### Lancer le serveur

```bash
python run.py
```

- API : `http://localhost:5000/api/v1`
- Swagger UI : `http://localhost:5000/swagger`

## Lancer avec Docker Compose

```bash
cp .env.example .env
# éditer .env avec de vraies valeurs (secrets, mots de passe, réseaux autorisés...)

docker compose up --build
```

La stack comprend trois services : `db` (PostgreSQL), `redis` et `web` (l'application avec `FLASK_CONFIG=production`).

En production, l'application **refuse de démarrer** si `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `KIOSK_ALLOWED_NETWORKS` ou `REDIS_URL` ne sont pas définis. Cela évite un déploiement avec des secrets par défaut, une borne accessible depuis n'importe où ou un flux SSE non partagé entre workers.

## Configuration

La liste complète et commentée se trouve dans [.env.example](.env.example). Principales variables :

| Variable | Description |
|---|---|
| `SECRET_KEY` / `JWT_SECRET_KEY` | Secrets de signature (obligatoires en production) |
| `DATABASE_URL` | URL PostgreSQL (obligatoire en production) |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Compte SMTP (Gmail, mot de passe d'application) pour les emails |
| `ARSA_FACE_API_KEY` / `ARSA_FACE_BASE_URL` | Accès au service de reconnaissance faciale |
| `ARSA_FACE_MATCH_THRESHOLD` / `ARSA_FACE_LIVENESS_THRESHOLD` | Seuils de similarité et de vivacité (0–1) |
| `ATTENDANCE_KIOSK_API_KEY` | Clé d'accès de la borne de pointage |
| `KIOSK_ALLOWED_NETWORKS` | CIDR autorisés à pointer (obligatoire en production) |
| `TRUSTED_PROXY_HOPS` | Nombre de reverse proxies de confiance devant Flask |
| `REDIS_URL` | Redis pour le flux SSE (obligatoire en production) |
| `FRONTEND_PASSWORD_RESET_URL` | Page front de réinitialisation du mot de passe |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées (séparées par des virgules) |

## Aperçu de l'API

Toutes les routes sont préfixées par `/api/v1` ; la référence complète est dans [swagger.yml](swagger.yml).

| Préfixe | Rôle |
|---|---|
| `/auth` | Connexion, changement et réinitialisation du mot de passe |
| `/etudiant` | Cours, pointage QR, historique, absences, notifications |
| `/professeur` | Cours, QR de séance, suivi des présences (SSE), annulation/report, régularisations |
| `/admin` | Gestion des comptes, référentiels académiques, cours, absences, imports et exports |
| `/attendance/kiosk` | Borne de pointage par reconnaissance faciale |

## Sécurité du pointage

### Deux méthodes de pointage

- **Reconnaissance faciale** (`/attendance/kiosk/scan` puis `/kiosk/checkin`) : la tablette en salle identifie l'étudiant par selfie.
- **QR code** (`POST /etudiant/attendance/checkin-qr`) : le professeur ou la borne affiche le QR du cours (`GET /professeur/courses/<id>/qr`, jeton signé expirant en 120 s) ; l'étudiant le scanne depuis son téléphone, connecté à son compte.

### Restriction réseau

Les endpoints de pointage (kiosk et QR) n'acceptent que les requêtes dont l'IP appartient à `KIOSK_ALLOWED_NETWORKS`. Toute autre requête reçoit `403 kiosk_network_forbidden`, **même avec un JWT valide**. L'étudiant doit donc être connecté au Wi-Fi dédié de l'établissement : en 4G, le pointage QR échoue systématiquement. La mise en place réseau (VLAN, VPN, pare-feu) est hors du périmètre de ce dépôt.

Derrière un reverse proxy (nginx, load balancer), positionner `TRUSTED_PROXY_HOPS` (`1` pour un seul proxy) afin que l'IP réelle du client soit prise en compte.

## Tests et qualité

```bash
pip install -r requirements-dev.txt

pytest              # tests
flake8 .            # lint
black --check .     # formatage
```

Ces trois étapes sont exécutées par la CI GitHub Actions à chaque push et pull request sur `main`.

## Structure du projet

```
app/
  blueprints/    # Routes par domaine : auth, attendance (kiosk), etudiant, professeur, admin
  models/        # Modèles SQLAlchemy (utilisateurs, cours, pointages, absences...)
  services/      # Logique métier (pointage, reconnaissance faciale, QR, emails, exports...)
  utils/         # Décorateurs, helpers, restriction réseau
migrations/      # Migrations Alembic
tests/           # Tests pytest
frontend_examples/  # Exemples d'intégration côté client React
swagger.yml      # Spécification OpenAPI 3.0.3
config.py        # Configurations développement / test / production
run.py           # Point d'entrée
```

## Auteures

- **Fatoumata Yarie Camara** — Licence 3 Big Data, Dakar Institute of Technology
- **Khadidiatou Cissokho** — Licence 3 Big Data, Dakar Institute of Technology
