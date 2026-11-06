# Back Review

## Objectif

Le frontend a ete bascule en mode API-first.
Les integrations faisables avec le guide `guidefrontend.md` ont ete branchees vers le backend.

Les points ci-dessous bloquent encore une integration 100% backend sur certaines vues ou actions.

## Contrats Maintenant Integres

Les clarifications suivantes ont ete appliquees cote frontend et ne sont plus des blocages actifs :

- `POST /api/v1/professeur/courses/:coursId/reschedule`
- `POST /api/v1/professeur/courses/:coursId/attendance/regularize`
- `GET /api/v1/admin/dashboard/summary`
- `GET /api/v1/admin/dashboard/trends`
- `GET/PATCH /api/v1/professeur/notifications`
- `GET/PATCH /api/v1/admin/notifications`
- `GET /api/v1/admin/students/:id/attendance/history`
- `GET /api/v1/admin/students/:id/attendance/summary`
- `GET /api/v1/admin/students/:id/attendance/by-course`
- `GET /api/v1/etudiant/courses/:coursId/attendance/history`
- `POST /api/v1/admin/absences/:suiviId/justify`
- `POST /api/v1/admin/courses`
- `POST /api/v1/admin/professors`
- `PATCH /api/v1/admin/students/:id`
- `PATCH /api/v1/admin/professors/:id`
- `GET/POST/PATCH /api/v1/admin/promotions`
- `GET /api/v1/admin/subjects`
- `POST /api/v1/admin/subjects`
- `PATCH /api/v1/admin/subjects/:id`
- `DELETE /api/v1/admin/subjects/:id`
- `GET /api/v1/admin/rooms`
- `POST /api/v1/admin/rooms`
- `PATCH /api/v1/admin/rooms/:id`
- `DELETE /api/v1/admin/rooms/:id`
- `GET/PATCH /api/v1/admin/settings`
- `GET /api/v1/admin/report-templates`
- `POST /api/v1/admin/reports/generate`

## Points Restants A Verifier Cote Backend

### Stabilite De `GET/PATCH /api/v1/admin/settings`

- Statut frontend: integre et appele depuis l'onglet Parametres
- Point d'attention:
  - cet endpoint a deja ete observe comme instable ou indisponible selon les environnements
  - le frontend limite son chargement a l'ouverture de l'onglet pour eviter de polluer les autres vues
- Attendu backend:
  - disponibilite stable
  - format de reponse coherent pour `settings`
  - validation claire sur `PATCH`

### Permissions `responsable` vs `admin`

- Statut frontend:
  - le role `responsable` consomme les endpoints `/api/v1/admin/...`
  - le role `admin` est maintenant autorise sur les routes responsable cote front
- Point d'attention:
  - les permissions backend doivent rester alignees avec cette convention
  - un compte `admin` doit pouvoir ouvrir et utiliser les memes routes metier que `responsable`

### Robustesse Des Reponses Metier

- Statut frontend: integre
- Point d'attention:
  - plusieurs ecrans tolerant aujourd'hui plusieurs variantes de champs (`nom`, `prenom`, `promotion`, `promotion_name`, etc.)
  - il reste preferable de stabiliser un contrat unique pour limiter la normalisation cote front

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
- confirmer la stabilite des endpoints admin nouvellement exposes:
  - `promotions`
  - `subjects`
  - `rooms`
  - `settings`
  - `report-templates`
  - `reports/generate`

## Etat Front Actuel

- les endpoints documentes et suffisamment specifies sont branches
- le mode mock est desactive par defaut
- les onglets responsable `promotions`, `cours`, `parametres` et `rapports` sont maintenant relies aux endpoints admin associes
- les points restants concernent surtout la stabilite backend, la normalisation fine des contrats et l'alignement des permissions
