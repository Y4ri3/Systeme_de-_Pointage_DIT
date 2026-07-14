# Guide De Correction Front React Pour Le Role Responsable

## 1. Objectif

Ce document explique quoi corriger cote front React pour que l'espace
`responsable` fonctionne proprement avec le backend actuel.

Il complete `guide_integration_front_react.md`, mais avec un angle plus
pratique :

- configuration locale correcte
- client API robuste
- bonnes routes et bons payloads
- gestion des erreurs metier
- points specifiques a l'espace responsable

Ce guide est base sur ce qui a ete verifie cote backend :

- migration appliquee avec succes (`flask db upgrade`)
- endpoints `responsable` testes en integration
- smoke test reel sur les routes principales admin/gestion

## 2. Ce Qui A Ete Verifie Cote Backend

Les endpoints suivants ont ete verifies et repondent correctement pour un
compte `responsable` :

```text
POST /api/v1/auth/login
GET  /api/v1/admin/students
GET  /api/v1/admin/professors
GET  /api/v1/admin/courses
GET  /api/v1/admin/promotions
GET  /api/v1/admin/matieres
GET  /api/v1/admin/salles
GET  /api/v1/admin/filieres
GET  /api/v1/admin/absences
GET  /api/v1/admin/settings
GET  /api/v1/admin/dashboard
GET  /api/v1/admin/dashboard/summary
GET  /api/v1/admin/dashboard/trends?days=5
GET  /api/v1/admin/report-templates
GET  /api/v1/admin/notifications
GET  /api/v1/admin/courses/:id
GET  /api/v1/admin/exports/absences
GET  /api/v1/admin/exports/absences/xlsx
GET  /api/v1/admin/exports/courses/:id/attendance
GET  /api/v1/admin/exports/courses/:id/attendance/xlsx
POST /api/v1/admin/filieres
PATCH /api/v1/admin/filieres/:id
DELETE /api/v1/admin/filieres/:id
```

Les tests backend qui couvrent largement l'espace `responsable` sont aussi
verts :

- `tests/test_profiles.py`
- `tests/test_professeur_associations.py`
- `tests/test_absences.py`

## 3. Corriger La Base URL Du Front

### Probleme frequent

Dans le navigateur, tu peux voir des erreurs de ce type :

```text
GET http://localhost:5173/api/v1/admin/professors 500
```

Il faut bien distinguer 2 modes possibles cote front :

1. Appel direct du backend sur `http://127.0.0.1:5000`
2. Appel relatif via le serveur Vite `http://localhost:5173` avec proxy `/api`

### Option A - La plus simple : appel direct du backend

Dans le front, configure :

```env
VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1
```

Puis :

```javascript
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api/v1";
```

Dans ce mode, le front appelle directement le backend.

### Option B - Via proxy Vite

Si tu veux garder des appels comme :

```text
/api/v1/admin/professors
```

alors il faut configurer `vite.config.js` ou `vite.config.ts` :

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/swagger": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});
```

Dans ce mode :

- le front tourne sur `http://localhost:5173`
- Vite relaie `/api/*` vers `http://127.0.0.1:5000`
- les images `/uploads/...` marchent aussi

### Recommendation

En developpement, choisis une seule strategie et garde-la partout.

- soit `API_BASE_URL = http://127.0.0.1:5000/api/v1`
- soit `API_BASE_URL = /api/v1` + proxy Vite correct

Ne melange pas les deux.

## 4. Client API A Corriger

Le client front doit gerer proprement :

- le token JWT
- les JSON
- les `FormData`
- les erreurs backend
- les fichiers CSV/XLSX

### Exemple recommande

```javascript
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api/v1";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type") && options.body != null) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.blob();

  if (!response.ok) {
    const error = new Error(
      isJson ? data.message || "Erreur API" : `Erreur HTTP ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return {
    data,
    headers: response.headers,
    status: response.status,
  };
}
```

### Pourquoi cette version

- elle n'ajoute pas `Content-Type: application/json` sur un `FormData`
- elle sait recuperer un `Blob` pour les exports
- elle remonte `status` et `data.error`
- elle centralise l'authentification

## 5. Authentification Et Routage

Apres `POST /auth/login`, stocker :

- `access_token`
- `role`
- `must_change_password`

### Regle de redirection

```javascript
function redirectAfterLogin(payload, navigate) {
  if (payload.must_change_password) {
    navigate("/change-password");
    return;
  }

  if (payload.role === "responsable" || payload.role === "admin") {
    navigate("/admin");
    return;
  }

  if (payload.role === "professeur") {
    navigate("/professor");
    return;
  }

  navigate("/student");
}
```

### Point important

`responsable` et `admin` utilisent le meme espace de gestion backend
`/api/v1/admin/*`.

Ne fais pas de branchement vers un namespace `/responsable/*` qui n'existe pas.

## 6. Structure Front Recommandee

```text
src/
  api/
    client.js
    auth.js
    admin.js
    professor.js
    student.js
  pages/admin/
    DashboardPage.jsx
    StudentsPage.jsx
    StudentDetailPage.jsx
    ProfessorsPage.jsx
    CoursesPage.jsx
    CourseDetailPage.jsx
    AbsencesPage.jsx
    SettingsPage.jsx
    ReportsPage.jsx
    PromotionsPage.jsx
    SubjectsPage.jsx
    RoomsPage.jsx
    NotificationsPage.jsx
  components/admin/
    StudentForm.jsx
    ProfessorForm.jsx
    CourseForm.jsx
    AbsenceJustifyModal.jsx
    ExportButton.jsx
```

## 7. Mapping Des Ecrans Responsable Vers Les Routes Backend

### Dashboard

Utiliser :

```text
GET /api/v1/admin/dashboard
GET /api/v1/admin/dashboard/summary
GET /api/v1/admin/dashboard/trends?days=5
```

### Etudiants

Utiliser :

```text
GET  /api/v1/admin/students
POST /api/v1/admin/students
GET  /api/v1/admin/students/:id
PATCH /api/v1/admin/students/:id
POST /api/v1/admin/students/:id/reset-password
POST /api/v1/admin/students/import
GET  /api/v1/admin/students/:id/attendance/history
GET  /api/v1/admin/students/:id/attendance/summary
GET  /api/v1/admin/students/:id/attendance/by-course
```

### Professeurs

Utiliser :

```text
GET  /api/v1/admin/professors
POST /api/v1/admin/professors
GET  /api/v1/admin/professors/:id
PATCH /api/v1/admin/professors/:id
POST /api/v1/admin/professors/:id/reset-password
POST /api/v1/admin/professors/import
```

### Cours

Utiliser :

```text
GET /api/v1/admin/courses
POST /api/v1/admin/courses
GET /api/v1/admin/courses/:id
```

### Absences

Utiliser :

```text
GET  /api/v1/admin/absences
POST /api/v1/admin/absences/:suiviId/justify
```

### Referentiels

Utiliser :

```text
GET/POST/PATCH/DELETE /api/v1/admin/filieres
GET/POST/PATCH/DELETE /api/v1/admin/matieres
GET/POST/PATCH/DELETE /api/v1/admin/salles
GET/POST/PATCH/DELETE /api/v1/admin/promotions
GET/POST/PATCH/DELETE /api/v1/admin/subjects
GET/POST/PATCH/DELETE /api/v1/admin/rooms
```

### Parametres Et Rapports

Utiliser :

```text
GET/PATCH /api/v1/admin/settings
GET       /api/v1/admin/report-templates
POST      /api/v1/admin/reports/generate
GET       /api/v1/admin/exports/absences
GET       /api/v1/admin/exports/absences/xlsx
GET       /api/v1/admin/exports/courses/:id/attendance
GET       /api/v1/admin/exports/courses/:id/attendance/xlsx
```

## 8. Payloads A Respecter Absolument

## 8.1 Creer Un Etudiant

Format : `multipart/form-data`

Champs :

- `nom`
- `prenom`
- `email`
- `promotion_id`
- `photo`

Exemple :

```javascript
export async function createStudent(payload) {
  const form = new FormData();
  form.append("nom", payload.nom);
  form.append("prenom", payload.prenom);
  form.append("email", payload.email);
  form.append("promotion_id", String(payload.promotionId));
  form.append("photo", payload.photoFile);

  return apiFetch("/admin/students", {
    method: "POST",
    body: form,
  });
}
```

## 8.2 Creer Un Professeur

Format : `multipart/form-data`

Champs :

- `nom`
- `prenom`
- `email`
- `photo`
- `matiere_ids` optionnel
- `promotion_ids` optionnel

Important :

- en `FormData`, envoyer `matiere_ids` et `promotion_ids` sous forme `"1,2,3"`
- en `PATCH` JSON, envoyer des tableaux `[1, 2, 3]`

Exemple :

```javascript
export async function createProfessor(payload) {
  const form = new FormData();
  form.append("nom", payload.nom);
  form.append("prenom", payload.prenom);
  form.append("email", payload.email);
  form.append("photo", payload.photoFile);

  if (payload.matiereIds?.length) {
    form.append("matiere_ids", payload.matiereIds.join(","));
  }

  if (payload.promotionIds?.length) {
    form.append("promotion_ids", payload.promotionIds.join(","));
  }

  return apiFetch("/admin/professors", {
    method: "POST",
    body: form,
  });
}
```

## 8.3 Mettre A Jour Un Professeur

Format possible :

- JSON si pas de photo
- `multipart/form-data` si remplacement de photo

Attention :

- `PATCH` remplace les associations envoyees
- si tu envoies `matiere_ids`, envoie la liste finale voulue
- si tu envoies `promotion_ids`, envoie la liste finale voulue

## 8.4 Creer Un Cours

Format : JSON

Champs attendus :

- `matiere_id`
- `professeur_id`
- `salle_id`
- `promotion_id`
- `date`
- `heure_debut`
- `heure_fin`
- `tolerance_retard_minutes` optionnel

Aliases acceptes aussi :

- `subject_id`
- `professor_id`
- `room_id`
- `start_time`
- `end_time`
- `reason`

Exemple :

```javascript
export async function createCourse(payload) {
  return apiFetch("/admin/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      matiere_id: payload.matiereId,
      professeur_id: payload.professeurId,
      salle_id: payload.salleId,
      promotion_id: payload.promotionId,
      date: payload.date,
      heure_debut: payload.heureDebut,
      heure_fin: payload.heureFin,
      tolerance_retard_minutes: payload.toleranceRetardMinutes,
    }),
  });
}
```

### Correction front indispensable sur le formulaire de creation de cours

Avant d'autoriser la selection d'un professeur, filtre la liste a ceux qui :

- enseignent la matiere choisie
- sont rattaches a la promotion choisie

Sinon tu recevras :

- `400 professeur_matiere_non_associee`
- `400 professeur_promotion_non_associee`

Exemple :

```javascript
export function getEligibleProfessors(professors, { matiereId, promotionId }) {
  return professors.filter(
    (prof) =>
      prof.matieres_enseignees?.some((m) => m.id === matiereId) &&
      prof.promotions_en_charge?.some((p) => p.id === promotionId)
  );
}
```

## 8.5 Justifier Une Absence

Format : JSON

Payload recommande :

```json
{
  "reason": "Certificat medical",
  "document_url": "https://...",
  "status": "justified"
}
```

Le backend accepte aussi `justificatif`.

## 8.6 Parametres

`PATCH /api/v1/admin/settings`

Payload possible :

```json
{
  "nom_etablissement": "Institut Demo",
  "seuil_absences": 4,
  "tolerance_retard_minutes_defaut": 15,
  "contact_support_email": "support@example.com"
}
```

## 9. Gestion Des Exports CSV/XLSX

Les endpoints d'export ne renvoient pas du JSON.

Il faut traiter la reponse comme un `Blob`.

Exemple :

```javascript
export async function downloadFile(path, filename) {
  const { data } = await apiFetch(path, { method: "GET" });
  const url = window.URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
```

Exemples d'usage :

```javascript
await downloadFile("/admin/exports/absences", "suivi_absences.csv");
await downloadFile(`/admin/exports/courses/${courseId}/attendance/xlsx`, "presence.xlsx");
```

## 10. Gestion D'Erreurs A Uniformiser

Le front doit afficher des messages utiles selon `error.status` et `error.data.error`.

### Regles recommandees

- `400 bad_request`
  afficher le message backend tel quel
- `401 unauthorized` ou `invalid_token`
  deconnecter et renvoyer vers login
- `403 forbidden`
  afficher "acces refuse"
- `403 password_change_required`
  rediriger vers `/change-password`
- `403 account_disabled`
  afficher "compte desactive"
- `404 not_found`
  afficher "ressource introuvable"
- `409 conflict`
  afficher le message metier
- `409 conflit_horaire`
  afficher la liste des conflits retournee dans `details.conflicts`
- `500 internal_server_error`
  afficher un message generique et logger les details
- `503`
  afficher "service temporairement indisponible"

Exemple :

```javascript
export function getApiErrorMessage(error) {
  const code = error?.data?.error;

  if (code === "password_change_required") {
    return "Vous devez changer votre mot de passe avant de continuer.";
  }

  if (code === "account_disabled") {
    return "Ce compte est desactive.";
  }

  if (code === "conflit_horaire") {
    return "Ce cours chevauche un autre cours existant.";
  }

  return error?.data?.message || "Une erreur est survenue.";
}
```

## 11. Points Front A Corriger En Priorite

## Priorite 1 - Base technique

- corriger `API_BASE_URL`
- verifier le proxy Vite si tu utilises `/api/v1`
- centraliser le client API
- gerer correctement `FormData`

## Priorite 2 - Espace responsable

- utiliser uniquement `/api/v1/admin/*`
- afficher les vrais messages backend
- corriger les formulaires `students`, `professors`, `courses`
- gerer les exports en `Blob`
- filtrer les professeurs eligibles dans la creation de cours

## Priorite 3 - UX robuste

- ajout d'un guard `must_change_password`
- affichage des conflits horaires
- affichage du champ `warning` si `email_sent === false`
- affichage de pagination sur les listes

## 12. Checklist De Validation Front

- login responsable OK
- redirection vers l'espace admin OK
- liste etudiants OK
- liste professeurs OK
- liste cours OK
- dashboard OK
- settings GET/PATCH OK
- absences GET/justify OK
- CRUD filieres OK
- CRUD matieres OK
- CRUD salles OK
- CRUD promotions OK
- exports CSV/XLSX OK
- notifications OK
- creation et mise a jour professeur avec associations OK
- creation cours avec filtrage professeur OK

## 13. Recommandation Finale

Si tu veux un front stable rapidement :

1. corrige d'abord la base URL et le client API
2. branche ensuite les pages `responsable` uniquement sur `/api/v1/admin/*`
3. respecte strictement les formats `JSON` vs `FormData`
4. traite les exports comme des fichiers, pas comme du JSON
5. affiche les erreurs metier retournees par le backend au lieu d'un message generique

Une fois ces points appliques, l'espace `responsable` peut fonctionner de facon
propre avec le backend actuel.
