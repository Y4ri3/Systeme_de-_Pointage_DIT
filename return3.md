# Guide d'Integration Backend Vers Front - Retour 4

## 0. Objectif

Ce document fait suite a `return2.md`. Il couvre deux livraisons backend
supplementaires qui n'existaient pas encore :

1. Un flow self-service **"mot de passe oublie"**, disponible pour les 4 roles
   (etudiant, professeur, responsable, admin).
2. Le canal push **SSE** pour le suivi de presence en temps reel, evoque comme
   amelioration non bloquante en section 5 de `return2.md`.

Il rappelle aussi, pour memoire, l'etat des points ouverts de `return2.md` qui ont
deja ete traites (section 3 ci-dessous) et un point qui reste a trancher cote front
avant d'utiliser le SSE en production (section 2.3).

`guide_integration_front_react.md` a ete mis a jour en consequence (nouvelles
sections 5.6, 8.1, 9.6, et rappels dans les sections 7, 11, 14).

## 1. Mot De Passe Oublie (Nouveau)

### Contexte

Avant cette livraison, un utilisateur qui oubliait son mot de passe n'avait aucun
recours self-service : seul un responsable/admin pouvait regenerer un mot de passe
temporaire via `/admin/students/:id/reset-password` ou
`/admin/professors/:id/reset-password`. Cela ne couvrait ni les responsables ni les
admins eux-memes, et necessitait une intervention manuelle a chaque fois.

### Nouveaux endpoints

```text
POST /api/v1/auth/forgot-password   { email }
POST /api/v1/auth/reset-password    { token, new_password }
```

Ces deux routes sont publiques (pas de JWT requis) et fonctionnent pour les 4 roles,
puisqu'ils partagent tous la meme table `Utilisateur`.

### Comportement a connaitre cote front

- `forgot-password` repond **toujours 200** avec un message generique, que l'email
  existe ou non, et meme si le compte est desactive. C'est volontaire
  (anti-enumeration de comptes). Le front ne doit jamais afficher "cet email n'existe
  pas".
- Le lien envoye par email pointe vers `FRONTEND_PASSWORD_RESET_URL` (variable
  d'environnement backend, ex. `http://localhost:5177/reset-password`) suffixe de
  `?token=...`. **Le front doit exposer une route publique a cette adresse** qui lit
  le token dans l'URL et affiche le formulaire de nouveau mot de passe. A coordonner :
  quelle URL exacte utiliser en dev / staging / prod pour que `FRONTEND_PASSWORD_RESET_URL`
  soit configure en accord des deux cotes.
- Le token expire au bout de **30 minutes** et est **a usage unique** (toute
  reutilisation, ou tout changement de mot de passe entre-temps par un autre canal,
  l'invalide). Codes d'erreur distincts a gerer cote UI :
  `token_invalide`, `token_expire`, `token_deja_utilise` (tous en 400), et
  `account_disabled` (403) si le compte a ete desactive entre-temps.

Voir `guide_integration_front_react.md` section 5.6 pour les exemples React complets
(formulaire "email oublie" + page `/reset-password`).

### Non couvert par cette livraison

- Pas de limitation de frequence sur `forgot-password` (coherent avec le reste de
  l'API, qui n'a de rate limiting nulle part actuellement — a signaler si un usage
  abusif est constate).
- Pas de page "email envoye, verifiez votre boite" imposee par le backend : le
  message generique retourne suffit a construire cet ecran cote front.

## 2. Suivi De Presence En Temps Reel (SSE) — Reponse A `return2.md` Section 5

### Nouvel endpoint

```text
GET /api/v1/professeur/courses/:coursId/attendance/stream
```

Reponse `text/event-stream`, memes droits d'acces que
`GET /professeur/courses/:coursId/attendance` (professeur proprietaire du cours, ou
responsable/admin).

### Comportement

- Un premier evenement `data:` est envoye **immediatement** a la connexion, avec
  exactement le meme payload JSON que `GET .../attendance` (meme forme, donc
  reutilisable avec le rendu existant de `SuiviPresence.jsx`).
- Un nouvel evenement est pousse des qu'un pointage est enregistre (borne) ou
  regularise (professeur) sur ce cours — plus besoin de sonder toutes les 15s.
- Un commentaire `: keep-alive` est envoye toutes les 15s en l'absence d'activite
  (garde la connexion ouverte a travers les proxys).
- La connexion se ferme au bout de 30 minutes ; `EventSource` reconnecte seul, rien a
  gerer cote front au-dela de l'ecoute standard `onmessage`/`onerror`.

### 2.3 Point a trancher cote front avant adoption

`EventSource` natif du navigateur **ne supporte pas l'ajout d'en-tetes personnalises**
(`Authorization: Bearer ...`), contrairement a tous les autres appels de ce guide.
Deux options, a votre choix :

1. **Recommande** : utiliser une librairie compatible SSE + en-tetes (ex.
   `@microsoft/fetch-event-source`), pour rester coherent avec l'authentification par
   Bearer token utilisee partout ailleurs. Aucun changement backend necessaire.
2. Passer le token en query string sur cette route precise. **Non implemente
   actuellement cote backend** (le decorateur `role_required` en place attend le JWT
   dans l'en-tete `Authorization`) — a demander explicitement si cette option est
   preferee, car cela demande une adaptation backend et a des implications de
   securite (token expose dans les logs d'acces/proxy).

Le polling existant reste fonctionnel et n'a pas ete retire : le SSE est une
amelioration optionnelle, adoptable ecran par ecran.

### Limite operationnelle a connaitre (pas bloquante pour du dev/staging simple)

La diffusion des evenements est geree **en memoire, par process Python**. En
deploiement multi-worker (`gunicorn -w 4` par exemple), un pointage traite par le
worker qui recoit la requete kiosque ne notifie pas les abonnes SSE connectes a un
autre worker. Deploiement recommande pour ce flux : un seul worker multi-thread. Si
l'infra passe a plusieurs workers/instances, ce flux devra migrer vers un backend de
pub/sub partage (Redis, etc.) cote backend — sans impact sur le contrat front dans ce
cas (meme evenements, meme format).

## 3. Rappel : Endpoints De `return2.md` Section 2, Desormais Implementes

Pour memoire (deja livres, mentionnes ici pour que ce document seul suffise a faire
le point) :

| Endpoint | Statut |
| --- | --- |
| `GET/POST/PATCH /api/v1/admin/promotions` | Deja disponible avant `return2.md` |
| `GET/PATCH /api/v1/admin/settings` | Implemente |
| `GET /api/v1/admin/report-templates` | Implemente |
| `POST /api/v1/admin/reports/generate` | Implemente |
| `GET /api/v1/admin/subjects` (+ POST/PATCH/DELETE) | Implemente (alias de `/matieres`) |
| `GET /api/v1/admin/rooms` (+ POST/PATCH/DELETE) | Implemente (alias de `/salles`) |

Details et exemples : `guide_integration_front_react.md` section 9.6.

## 4. Rappel : Comportement Borne (`return2.md` Section 4)

Deja livre : `attendance_context.can_checkin_now` passe desormais a `false` (nouveau
champ `already_checked_in: true`) des qu'un etudiant a deja un pointage
present/retard sur le cours actif, pour eviter un double scan cote borne.

## 5. Statut De `/etudiant/attendance/checkin`

Conserve fonctionnel (`return2.md` section 0 laissait le choix au backend), mais
desormais explicitement marque deprecie :

- en-tete de reponse `Deprecation: true`
- `deprecated: true` dans le Swagger
- log d'avertissement serveur a chaque appel

Le front n'a rien a faire de plus s'il n'appelle deja plus cette route (c'est le cas
depuis `return2.md` section 0).

## 6. Source De Verite

Comme precedemment : `swagger.yml` (mis a jour avec tous les endpoints ci-dessus),
`guide_integration_front_react.md`, `return2.md`, et desormais ce fichier.
