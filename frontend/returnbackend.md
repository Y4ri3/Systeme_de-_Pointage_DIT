# Guide d'Integration Backend Vers Front - Retour 2

## Objectif

Ce document complete `guide_integration_front_react.md` a partir du retour du frontend.
Il liste ce qui a ete clarifie, ce qui a ete ajoute, et la maniere recommandee d'integrer les endpoints restants sans garder d'ecrans purement locaux.

## 1. Synthese Des Avancees

Les points suivants sont maintenant traites :

- contrat clarifie pour le report de cours professeur
- contrat clarifie pour la regularisation manuelle d'un pointage
- analytics responsable ajoutes pour le dashboard
- endpoints de notifications ajoutes pour professeur et responsable/admin
- endpoints detail etudiant ajoutes pour le suivi des presences cote responsable
- endpoint de detail historique par cours ajoute cote etudiant
- contrat de justification d'absence clarifie
- Swagger mis a jour

## 2. Endpoints Ajoutes

### Dashboard Responsable

- `GET /api/v1/admin/dashboard/summary`
- `GET /api/v1/admin/dashboard/trends?days=7`

### Notifications

- `GET /api/v1/professeur/notifications`
- `PATCH /api/v1/professeur/notifications/:notificationId/read`
- `GET /api/v1/admin/notifications`
- `PATCH /api/v1/admin/notifications/:notificationId/read`

### Detail Etudiant Cote Responsable

- `GET /api/v1/admin/students/:id/attendance/history`
- `GET /api/v1/admin/students/:id/attendance/summary`
- `GET /api/v1/admin/students/:id/attendance/by-course`

### Detail Cours Cote Etudiant

- `GET /api/v1/etudiant/courses/:coursId/attendance/history`

## 3. Endpoints Existants Maintenant Clarifies

### `POST /api/v1/professeur/courses/:coursId/reschedule`

Le backend accepte maintenant :

- champs canoniques :
  - `date`
  - `heure_debut`
  - `heure_fin`
  - `motif`
  - `salle_id` optionnel
- alias front acceptes :
  - `new_date`
  - `new_start_time`
  - `new_end_time`
  - `reason`
  - `room_id`

Exemple :

```json
{
  "new_date": "2026-07-20",
  "new_start_time": "13:30:00",
  "new_end_time": "15:30:00",
  "reason": "Salle indisponible",
  "room_id": 2
}
```

Reponse :

```json
{
  "message": "Cours reporte avec succes.",
  "course": {},
  "normalized_payload": {
    "date": "2026-07-20",
    "heure_debut": "13:30:00",
    "heure_fin": "15:30:00",
    "motif": "Salle indisponible",
    "salle_id": 2
  }
}
```

### `POST /api/v1/professeur/courses/:coursId/attendance/regularize`

Le backend accepte maintenant :

- champs canoniques :
  - `etudiant_id`
  - `statut`
  - `justificatif`
  - `pointage_time` optionnel
- alias front acceptes :
  - `student_id`
  - `status`
  - `reason`
  - `attendance_time`

Statuts autorises :

- `present`
- `retard`
- `absent`
- `absence_justifiee`

Exemple :

```json
{
  "student_id": 24,
  "status": "retard",
  "reason": "Retard accepte",
  "pointage_time": "2026-07-08T09:12:00"
}
```

Reponse :

```json
{
  "message": "Pointage regularise avec succes.",
  "attendance": {},
  "attendance_summary": {
    "present": 1,
    "retard": 1,
    "absent": 0,
    "invalide": 0,
    "non_pointer": 0
  }
}
```

### `POST /api/v1/admin/courses`

Le backend accepte maintenant les noms canoniques et plusieurs alias front :

- canoniques :
  - `matiere_id`
  - `professeur_id`
  - `salle_id`
  - `promotion_id`
  - `date`
  - `heure_debut`
  - `heure_fin`
- alias acceptes :
  - `subject_id`
  - `professor_id`
  - `room_id`
  - `start_time`
  - `end_time`
  - `reason` pour `motif_changement`

Exemple :

```json
{
  "subject_id": 3,
  "professor_id": 7,
  "room_id": 2,
  "promotion_id": 4,
  "date": "2026-07-20",
  "start_time": "08:00:00",
  "end_time": "10:00:00",
  "tolerance_retard_minutes": 15
}
```

### `POST /api/v1/admin/absences/:suiviId/justify`

Le backend continue de justifier une absence disponible, et accepte maintenant un payload optionnel pour standardiser le contrat front :

- `reason`
- `document_url`
- `status`

Exemple :

```json
{
  "reason": "Piece justificative recue",
  "document_url": "https://example.test/justificatif.pdf",
  "status": "approved"
}
```

Reponse :

```json
{
  "message": "Absence justifiee avec succes.",
  "absence_tracking": {},
  "justification": {
    "reason": "Piece justificative recue",
    "document_url": "https://example.test/justificatif.pdf",
    "status": "approved"
  }
}
```

## 4. Notifications Cote Front

### Professeur

Utiliser :

- `GET /api/v1/professeur/notifications`
- `PATCH /api/v1/professeur/notifications/:notificationId/read`

### Responsable

Le responsable utilise l'espace d'administration. Il faut donc appeler :

- `GET /api/v1/admin/notifications`
- `PATCH /api/v1/admin/notifications/:notificationId/read`

Remarque :

- il n'existe pas de namespace REST separe `/responsable/...`
- le role `responsable` consomme les endpoints `admin`

## 5. Analytics Responsable

### `GET /api/v1/admin/dashboard/summary`

Retourne :

- `totals`
- `distribution.by_promotion`
- `distribution.by_department`
- `distribution.by_subject`

Cas d'usage front :

- cards KPI
- tableaux repartition promotions / filieres
- widgets de pilotage

### `GET /api/v1/admin/dashboard/trends?days=7`

Retourne des lignes journalieres :

- `date`
- `courses_count`
- `present_count`
- `retard_count`
- `absence_justifiee_count`
- `invalide_count`

Cas d'usage front :

- courbes d'activite
- evolution du volume de pointage
- suivi journalier

## 6. Detail Etudiant Cote Responsable

### `GET /api/v1/admin/students/:id/attendance/history`

Retourne :

- `student`
- `history`
- pagination

### `GET /api/v1/admin/students/:id/attendance/summary`

Retourne :

- `student`
- `totals`
- `by_subject`

### `GET /api/v1/admin/students/:id/attendance/by-course`

Retourne :

- `student`
- `rows`
- chaque ligne contient :
  - `attendance`
  - `course`

Usages front :

- onglet historique
- cartes statistiques
- tableau des presences par cours

## 7. Detail Matiere / Cours Cote Etudiant

### `GET /api/v1/etudiant/courses/:coursId/attendance/history`

Retourne :

- `course`
- `history`
- pagination

Usage front :

- page detail d'un cours
- affichage du pointage de l'etudiant pour ce cours
- reprise des justificatifs et metadonnees de pointage

## 8. Contrat Des Mises A Jour Utilisateurs

### `PATCH /api/v1/admin/students/:id`

Formats acceptes :

- `application/json`
- `multipart/form-data`

Champs modifiables :

- `nom`
- `prenom`
- `email`
- `statut`
- `promotion_id`
- `photo`

### `PATCH /api/v1/admin/professors/:id`

Formats acceptes :

- `application/json`
- `multipart/form-data`

Champs modifiables :

- `nom`
- `prenom`
- `email`
- `statut`
- `photo`

## 9. Creation Des Professeurs

### `POST /api/v1/admin/professors`

Le backend supporte actuellement :

- `nom`
- `prenom`
- `email`
- `photo`

Important :

- `telephone` n'existe pas encore dans le modele backend
- `department_id` n'existe pas encore dans le modele backend

Donc le front ne doit pas considerer ces deux champs comme obligatoires tant que le modele metier n'a pas ete etendu.

## 10. Recommandations D Integration Front

- utiliser les noms canoniques du backend quand c'est possible
- garder les alias seulement pour accelerer la migration du front existant
- router le responsable sur les endpoints `/api/v1/admin/...`
- utiliser `/api/v1/professeur/...` pour la vue enseignant
- exploiter `return2.md` et Swagger ensemble pour verrouiller les contrats

## 11. Verification Conseillee Cote Front

Avant de fermer totalement les ecrans locaux, verifier :

- dashboard responsable branche sur `/admin/dashboard/summary` et `/admin/dashboard/trends`
- topbar responsable branchee sur `/admin/notifications`
- topbar professeur branchee sur `/professeur/notifications`
- fiche detail etudiant branchee sur les 3 endpoints `/attendance/...`
- page detail cours etudiant branchee sur `/etudiant/courses/:coursId/attendance/history`
- formulaires de report et regularisation alignes sur les champs documentes ici

## 12. Source De Verite

La source de verite pour le contrat HTTP devient :

- `swagger.yml`
- `guide_integration_front_react.md`
- `return2.md`
