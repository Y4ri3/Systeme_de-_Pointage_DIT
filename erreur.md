# Rapport D'Erreur Backend - `/api/v1/admin/settings`

## Resume

`GET /api/v1/admin/settings` et `PATCH /api/v1/admin/settings` renvoient tous les
deux une erreur `500` avec le code `database_schema_outdated`. Tous les autres
endpoints responsable/admin testes fonctionnent normalement (voir section 3).

## 1. Reproduction

Authentification :

```bash
curl -s -X POST http://127.0.0.1:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"responsable@test.com","password":"Password123!"}'
```

Appel en echec :

```bash
curl -s -i -H "Authorization: Bearer <token>" \
  http://127.0.0.1:5000/api/v1/admin/settings
```

## 2. Reponse Obtenue

```
HTTP/1.1 500 INTERNAL SERVER ERROR
Content-Type: application/json

{
  "details": {
    "hint": "Relance le serveur ou mets a jour la base de developpement."
  },
  "error": "database_schema_outdated",
  "message": "La base locale n est pas a jour par rapport au schema courant."
}
```

Meme resultat sur `PATCH /api/v1/admin/settings` (teste avec un payload
`{ "nom_etablissement": "Test" }`).

## 3. Perimetre Verifie

Endpoints testes avec le meme compte responsable, tous en `200 OK` sauf
`/admin/settings` :

```
GET /auth/me
GET /admin/dashboard/summary
GET /admin/dashboard/trends?days=7
GET /admin/students
GET /admin/students/1
GET /admin/professors
GET /admin/courses
GET /admin/absences
GET /admin/notifications
GET /admin/promotions
GET /admin/subjects
GET /admin/rooms
GET /admin/report-templates
```

Seuls `GET` et `PATCH /admin/settings` echouent. Le probleme est donc isole a la
table/au modele utilise par cet endpoint precis, pas a l'ensemble de la base.

## 4. Cause Probable

Le message et l'indice ("mets a jour la base de developpement") suggerent que le
modele `Settings`/`Parametres` documente comme disponible dans
`returnbackend3.md` (section "Endpoints Confirmes") a ete ajoute au code, mais
la migration correspondante n'a pas ete appliquee sur la base SQLite locale de
developpement -- le schema reel de la table ne correspond plus a ce que le
modele SQLAlchemy attend (colonne manquante, table absente, ou version de
migration en retard).

## 5. Action Demandee

- Appliquer la migration manquante sur la base de developpement (`flask db
  upgrade` ou equivalent selon le setup du projet), ou recreer la base locale si
  plus simple en dev.
- Confirmer qu'un redemarrage du serveur suffit une fois la migration appliquee,
  ou s'il faut une action supplementaire.
- Si possible, verifier qu'aucune autre table recemment ajoutee (`subjects`,
  `rooms`, `report_templates`, `promotions`) n'a le meme probleme sur d'autres
  environnements (staging/prod) avant deploiement, meme si elles repondent
  correctement en local actuellement.

## 6. Impact Cote Front

Aucun bug frontend associe : `ParametresTab.jsx` (via `getAdminSettings` /
`updateAdminSettings` dans `src/api/admin.js`) relaie correctement le message
d'erreur retourne par le backend dans la banniere d'alerte. Des que l'endpoint
repond normalement, l'ecran fonctionnera sans modification supplementaire.

## 7. Source De Verite

Comme precedemment : `swagger.yml`, `guide_integration_front_react.md`,
`returnbackend.md` a `returnbackend4.md`, et ce fichier pour le suivi de ce bug
precis.
