# Back Review

## Objectif

Le frontend a ete bascule en mode API-first.
Les integrations faisables avec le guide `guidefrontend.md` ont ete branchees vers le backend.

Les points ci-dessous bloquent encore une integration 100% backend sur certaines vues ou actions.

## Endpoints Documentes Mais Incomplets Pour Le Front

### `POST /api/v1/professeur/courses/:coursId/reschedule`

- Statut: non integrable proprement
- Blocage: aucun payload officiel n'est documente
- Minimum attendu:
  - `new_date`
  - `new_start_time`
  - `new_end_time`
  - `room` ou `salle` si modifiable
  - `reason` si obligatoire
- Reponse attendue:
  - cours mis a jour
  - message metier

### `POST /api/v1/professeur/courses/:coursId/attendance/regularize`

- Statut: non integrable proprement
- Blocage: payload metier non documente
- Minimum attendu:
  - `student_id`
  - `status` (`present`, `retard`, `absent`)
  - `reason`
  - `pointage_time` optionnel
- Reponse attendue:
  - presence regularisee
  - feuille de presence mise a jour

### `PATCH /api/v1/admin/students/:id`

- Statut: non integrable proprement
- Blocage: schema de mise a jour absent
- Minimum attendu:
  - champs modifiables autorises
  - validation attendue
  - format `multipart/form-data` ou JSON clairement precise

### `POST /api/v1/admin/professors`

- Statut: non integrable proprement
- Blocage: payload de creation non documente
- Minimum attendu:
  - `nom`
  - `prenom`
  - `email`
  - `telephone`
  - `department_id` ou equivalent
  - `photo` si requis

### `PATCH /api/v1/admin/professors/:id`

- Statut: non integrable proprement
- Blocage: payload de mise a jour non documente

### `POST /api/v1/admin/courses`

- Statut: non integrable proprement
- Blocage: payload de creation non documente
- Minimum attendu:
  - `nom`
  - `promotion_id`
  - `professor_id`
  - `room`
  - `date`
  - `start_time`
  - `end_time`

### `POST /api/v1/admin/absences/:suiviId/justify`

- Statut: non integrable proprement
- Blocage: payload de justification non documente
- Minimum attendu:
  - `reason`
  - `document_url` ou fichier si piece jointe
  - `status` final (`approved`, `rejected`, etc.) si necessaire

## Endpoints Ou Contrats Manquants Pour Supprimer Les Derniers Ecrans Locaux

### Dashboard Responsable

- Statut frontend: partiellement raccorde via `GET /admin/students`, `GET /admin/courses`, `GET /admin/absences`
- Manque backend:
  - endpoint de stats agregees responsable
  - endpoint de tendances temporelles
  - endpoint de repartition par promotion / filiere / cours
- Proposition:
  - `GET /api/v1/admin/dashboard/summary`
  - `GET /api/v1/admin/dashboard/trends`

### Notifications Professeur / Responsable

- Statut frontend: aucune source backend documentee
- Impact:
  - la topbar ne peut afficher de vraies notifications que pour l'etudiant
- Proposition:
  - `GET /api/v1/professeur/notifications`
  - `GET /api/v1/responsable/notifications`
  - `PATCH /.../notifications/:id/read`

### Detail Etudiant Cote Responsable

- Statut frontend: fiche de base chargee via `GET /admin/students/:id`, mais analytics detaillees encore locales
- Manque backend:
  - historique detaille de presence par etudiant
  - statistiques par matiere
  - evolution temporelle
- Proposition:
  - `GET /api/v1/admin/students/:id/attendance/history`
  - `GET /api/v1/admin/students/:id/attendance/summary`
  - `GET /api/v1/admin/students/:id/attendance/by-course`

### Detail Matiere Cote Etudiant

- Statut frontend: maintenant derive a partir de `GET /etudiant/attendance/history` et `GET /etudiant/courses`
- Limite:
  - impossible d'afficher une vue riche si l'historique ne contient pas assez de metadonnees
- Si une page detaillee est voulue proprement, proposer:
  - `GET /api/v1/etudiant/courses/:coursId/attendance/history`
  - ou `GET /api/v1/etudiant/subjects/:subjectId`

### Promotions / Parametres / Rapports Responsable

- Statut frontend: encore local
- Raison:
  - aucun endpoint documente pour promotions, parametres globaux, templates de rapports
- Propositions:
  - `GET/POST/PATCH /api/v1/admin/promotions`
  - `GET/PATCH /api/v1/admin/settings`
  - `GET /api/v1/admin/report-templates`
  - `POST /api/v1/admin/reports/generate`

## Contrats Backend A Stabiliser

Pour rendre l'integration robuste, il faut idealement standardiser:

- les noms de champs date/heure:
  - `date`
  - `heure_debut`
  - `heure_fin`
  - `heure_pointage`
- les identifiants:
  - `id`
  - `student_id`
  - `course_id`
- les statuts:
  - `present`
  - `retard`
  - `absent`
  - `programme`
  - `avenir`
  - `termine`
- les reponses d'erreur:
  - `message`
  - `detail`
  - `errors` pour les validations

## Recommandation Backend

- publier un Swagger/OpenAPI complet et a jour
- documenter les payloads exacts pour tous les `POST` et `PATCH`
- fournir au moins un exemple de reponse reelle par endpoint
- clarifier les champs obligatoires vs optionnels
- confirmer les routes et permissions pour `responsable` vs `admin`

## Etat Front Actuel

- les endpoints documentes et suffisamment specifies sont branches
- le mode mock est desactive par defaut
- les points restants sont dus a des contrats backend absents, ambigus ou non documentes
