# Guide d'Intégration Front React JS

## 1. Où Mettre la Clé API ARSA Face

La clé API ARSA Face doit être placée **dans le backend**, dans le fichier `.env` situé à la racine du projet.

Exemple :

```env
ARSA_FACE_API_KEY=ta_cle_api_arsa_face
ARSA_FACE_BASE_URL=https://faceapi.arsa.technology/api/v1
ARSA_FACE_MATCH_THRESHOLD=0.8
ARSA_FACE_LIVENESS_THRESHOLD=0.7
ARSA_FACE_TIMEOUT_SECONDS=20
ATTENDANCE_KIOSK_API_KEY=cle_secrete_de_la_borne_de_pointage
```

### Important

- La clé ARSA Face **ne doit jamais être exposée dans le front React**
- Le front React appelle uniquement **ton backend**
- C'est le backend qui appelle ensuite ARSA Face

Autrement dit :

```text
React -> Backend Systeme_De-Pointage -> ARSA Face
```

## 2. Base URL du Front

En local, le front React doit appeler :

```text
http://127.0.0.1:5000
```

Tous les endpoints API commencent par :

```text
/api/v1
```

## 3. Organisation Conseillée Dans React

Structure simple recommandée :

```text
src/
  api/
    client.js
    auth.js
    attendance.js
    student.js
    professor.js
    admin.js
  hooks/
    useAuth.js
  pages/
    LoginPage.jsx
    ChangePasswordPage.jsx
    StudentCoursesPage.jsx
    StudentAttendancePage.jsx
    NotificationsPage.jsx
    ProfessorCoursesPage.jsx
    AdminStudentsPage.jsx
```

## 4. Client API Centralisé

Exemple avec `fetch` :

```javascript
const API_BASE_URL = "http://127.0.0.1:5000/api/v1";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token");

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw {
      status: response.status,
      data,
    };
  }

  return data;
}
```

## 5. Authentification

### 5.1 Connexion

Endpoint :

```text
POST /api/v1/auth/login
```

Payload :

```json
{
  "email": "etudiant@test.com",
  "password": "Password123!"
}
```

Exemple React :

```javascript
import { apiFetch } from "./client";

export async function login(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}
```

Réponse attendue :

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "role": "etudiant",
  "user_id": 12,
  "must_change_password": true
}
```

### 5.2 Gestion du Premier Login

Après connexion :

- stocker `access_token`
- stocker `role`
- vérifier `must_change_password`
- si `must_change_password === true`, rediriger vers la page de changement de mot de passe

### 5.3 Profil Connecté

Endpoint :

```text
GET /api/v1/auth/me
```

### 5.4 Changement de Mot de Passe

Endpoint :

```text
POST /api/v1/auth/change-password
```

Payload :

```json
{
  "current_password": "mot_de_passe_temporaire",
  "new_password": "NouveauMotDePasse123!"
}
```

Exemple :

```javascript
export async function changePassword(currentPassword, newPassword) {
  return apiFetch("/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}
```

## 5.5 Borne De Pointage Hors Espace Étudiant

Cette partie concerne un écran de pointage dédié, distinct de l'espace étudiant classique.

### Principe recommandé

- le poste de pointage est utilisé dans un cadre supervisé
- le front React de cette borne peut appeler les endpoints de borne avec un **JWT d'un compte staff** (`professeur`, `responsable`, `admin`)
- une clé `X-Attendance-Kiosk-Key` existe aussi pour un usage borne privée ou via proxy backend, mais elle ne doit pas être embarquée dans un build React public

### Endpoints de borne

```text
POST /api/v1/attendance/kiosk/scan
POST /api/v1/attendance/kiosk/checkin
```

### Sécurité côté front

Option recommandée pour React :

- connecter la borne avec un compte staff
- réutiliser le `Bearer token` habituel
- ne pas mettre `ATTENDANCE_KIOSK_API_KEY` dans le code front livré au navigateur

Option dédiée borne privée :

- utiliser `X-Attendance-Kiosk-Key`
- seulement si l'application tourne dans un environnement fermé ou derrière un proxy sécurisé

### 5.5.1 Scan Du Visage Et Chargement Du Profil

Objectif :

- scanner le visage
- identifier l'étudiant
- charger son profil
- récupérer son emploi du temps du jour
- détecter le cours qu'il doit suivre à l'instant

Format attendu :

- `multipart/form-data`
- champ obligatoire `selfie`
- champ optionnel `timestamp`

Exemple React :

```javascript
import { apiFetch } from "./client";

export async function kioskScanStudent(selfieFile) {
  const formData = new FormData();
  formData.append("selfie", selfieFile);
  formData.append("timestamp", new Date().toISOString());

  return apiFetch("/attendance/kiosk/scan", {
    method: "POST",
    body: formData,
  });
}
```

Réponse type :

```json
{
  "success": true,
  "student": {
    "id": 12,
    "nom": "Doe",
    "prenom": "Jane",
    "email": "jane.doe@test.com",
    "role": "etudiant",
    "photo_url": "/uploads/users/etudiant/jane.jpg",
    "promotion": {
      "id": 2,
      "niveau": "L2",
      "annee_academique": "2025-2026",
      "filiere": "Informatique"
    }
  },
  "attendance_context": {
    "scan_timestamp": "2026-07-08T09:15:00",
    "can_checkin_now": true,
    "active_course": {
      "id": 44,
      "date": "2026-07-08",
      "heure_debut": "09:00:00",
      "heure_fin": "11:00:00",
      "statut": "programme"
    },
    "next_course": null,
    "today_courses": []
  },
  "face_verification": {
    "match": true,
    "similarity_score": 0.94,
    "is_real_face": true,
    "liveness_probability": 0.98
  }
}
```

Utilisation UI recommandée :

- afficher immédiatement le nom, prénom, photo et promotion
- afficher le cours actif si `attendance_context.active_course` est présent
- afficher l'emploi du temps du jour avec `today_courses`
- activer le bouton de pointage seulement si `can_checkin_now === true`

### 5.5.2 Pointage Depuis La Borne

Le pointage borne est séparé du pointage dans l'espace étudiant connecté.

Format attendu :

- `multipart/form-data`
- `student_id`
- `course_id`
- `selfie`
- `gps_lat` optionnel
- `gps_lng` optionnel
- `timestamp` optionnel

Exemple React :

```javascript
export async function kioskCheckinStudent({
  studentId,
  courseId,
  selfieFile,
  gpsLat,
  gpsLng,
}) {
  const formData = new FormData();
  formData.append("student_id", String(studentId));
  formData.append("course_id", String(courseId));
  formData.append("selfie", selfieFile);

  if (gpsLat !== undefined && gpsLat !== null) {
    formData.append("gps_lat", String(gpsLat));
  }

  if (gpsLng !== undefined && gpsLng !== null) {
    formData.append("gps_lng", String(gpsLng));
  }

  formData.append("timestamp", new Date().toISOString());

  return apiFetch("/attendance/kiosk/checkin", {
    method: "POST",
    body: formData,
  });
}
```

Flux recommandé :

1. capturer un selfie
2. appeler `/attendance/kiosk/scan`
3. afficher le profil reconnu et le cours actif
4. demander confirmation visuelle si nécessaire
5. appeler `/attendance/kiosk/checkin` avec `student_id`, `course_id` et le selfie

## 5.6 Mot de Passe Oublié

Nouveau flux self-service, disponible pour les **4 rôles** (étudiant, professeur,
responsable, admin) : ils partagent tous la même table `Utilisateur`, donc un seul
couple d'endpoints suffit, quel que soit le rôle de la personne qui a oublié son mot
de passe.

### Principe

1. L'utilisateur saisit son email sur un écran "Mot de passe oublié" (public, sans
   authentification).
2. Le front appelle `POST /api/v1/auth/forgot-password`.
3. Le backend envoie un email contenant un lien vers `FRONTEND_PASSWORD_RESET_URL`
   (variable d'environnement backend, ex. `http://localhost:5177/reset-password`)
   suffixé par `?token=...`. Le token est signé et **expire au bout de 30 minutes**.
4. Le front doit exposer une route publique (ex. `/reset-password`) qui lit le
   paramètre `token` dans l'URL et affiche un formulaire "nouveau mot de passe".
5. Le front appelle `POST /api/v1/auth/reset-password` avec `{ token, new_password }`.
6. En cas de succès, rediriger vers `/login` avec un message de confirmation.

### Sécurité — points importants pour l'UI

- La réponse de `forgot-password` est **toujours `200` avec un message générique**,
  que l'email corresponde ou non à un compte, et même si le compte est désactivé.
  C'est volontaire (anti-énumération de comptes) : **ne jamais afficher "email
  introuvable"**, toujours afficher un message du type *"Si un compte existe pour cet
  email, un lien vient d'être envoyé."*
- Le token est **à usage unique** : une fois utilisé (ou si le mot de passe a changé
  entre-temps par un autre canal), toute nouvelle tentative avec le même token renvoie
  `400 token_deja_utilise`. Un lien déjà cliqué ne doit donc pas être réutilisable côté
  UI — proposer un nouveau lien "mot de passe oublié" en cas d'erreur.

### 5.6.1 Demander le lien

Endpoint :

```text
POST /api/v1/auth/forgot-password
```

Payload :

```json
{ "email": "etudiant@test.com" }
```

Réponse (toujours 200 si email fourni) :

```json
{ "message": "Si un compte existe pour cet email, un lien de reinitialisation vient d'etre envoye." }
```

Exemple React :

```javascript
export async function forgotPassword(email) {
  return apiFetch("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}
```

### 5.6.2 Choisir le nouveau mot de passe

Endpoint :

```text
POST /api/v1/auth/reset-password
```

Payload :

```json
{
  "token": "le-token-extrait-de-l-url",
  "new_password": "NouveauMotDePasse123!"
}
```

Réponses possibles :

| Statut | error                | Sens                                                          |
| ------ | -------------------- | -------------------------------------------------------------- |
| 200    | —                     | Mot de passe change, rediriger vers `/login`                  |
| 400    | `bad_request`         | `token`/`new_password` manquant, ou mot de passe < 8 caracteres |
| 400    | `token_invalide`      | Lien malforme ou signature invalide                            |
| 400    | `token_expire`        | Lien de plus de 30 minutes : proposer d'en redemander un        |
| 400    | `token_deja_utilise`  | Lien deja consomme (ou mot de passe change entre-temps) : proposer d'en redemander un |
| 403    | `account_disabled`    | Compte desactive : rediriger vers un message "contactez l'administration" |

Exemple React :

```javascript
import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiFetch } from "../api/client";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      navigate("/login?reset=success");
    } catch (err) {
      setError(err.data?.error || "reset_failed");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        placeholder="Nouveau mot de passe"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <button type="submit">Reinitialiser mon mot de passe</button>
      {error === "token_expire" && <p>Ce lien a expire, demandez-en un nouveau.</p>}
      {error === "token_deja_utilise" && <p>Ce lien a deja ete utilise, demandez-en un nouveau.</p>}
      {error === "token_invalide" && <p>Ce lien est invalide.</p>}
    </form>
  );
}
```

## 6. Intégration Côté Étudiant

### 6.1 Liste des Cours

Endpoint :

```text
GET /api/v1/etudiant/courses
```

Exemples :

```text
/api/v1/etudiant/courses
/api/v1/etudiant/courses?periode=upcoming
/api/v1/etudiant/courses?statut=programme&page=1&per_page=10
```

Exemple React :

```javascript
export async function getStudentCourses(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/etudiant/courses${query ? `?${query}` : ""}`);
}
```

### 6.2 Historique des Pointages

Endpoint :

```text
GET /api/v1/etudiant/attendance/history
```

### 6.3 Résumé des Absences

Endpoint :

```text
GET /api/v1/etudiant/absences/summary
```

### 6.4 Notifications

Endpoints :

```text
GET /api/v1/etudiant/notifications
PATCH /api/v1/etudiant/notifications/:notificationId/read
```

Exemple :

```javascript
export async function markNotificationAsRead(notificationId) {
  return apiFetch(`/etudiant/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}
```

## 7. Intégration Du Pointage Facial

Le pointage facial est le point le plus important côté front.

> **Déprécié** : ce flow self-service (étudiant connecté sur son propre appareil)
> n'est plus le chemin nominal — voir section 5.5 / `return2.md` section 0. Le
> pointage se fait désormais exclusivement via la borne
> (`/attendance/kiosk/scan` + `/attendance/kiosk/checkin`). La route ci-dessous reste
> fonctionnelle et documentée ici pour référence / intégrations futures, mais renvoie
> un en-tête `Deprecation: true` et ne doit plus être appelée par un nouvel écran.

### 7.1 Endpoint

```text
POST /api/v1/etudiant/attendance/checkin
```

### 7.2 Format Attendu

Le backend attend un `multipart/form-data` avec :

- `course_id`
- `selfie`
- `gps_lat` optionnel
- `gps_lng` optionnel
- `timestamp` optionnel

### 7.3 Exemple React

```javascript
export async function studentCheckin({ courseId, selfieFile, gpsLat, gpsLng }) {
  const formData = new FormData();
  formData.append("course_id", String(courseId));
  formData.append("selfie", selfieFile);

  if (gpsLat !== undefined && gpsLat !== null) {
    formData.append("gps_lat", String(gpsLat));
  }

  if (gpsLng !== undefined && gpsLng !== null) {
    formData.append("gps_lng", String(gpsLng));
  }

  formData.append("timestamp", new Date().toISOString());

  return apiFetch("/etudiant/attendance/checkin", {
    method: "POST",
    body: formData,
  });
}
```

### 7.4 Exemple d'Utilisation Dans un Composant

```javascript
import { useState } from "react";
import { studentCheckin } from "../api/student";

export default function StudentAttendancePage({ courseId }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    try {
      const data = await studentCheckin({
        courseId,
        selfieFile: file,
      });
      setResult(data);
    } catch (err) {
      setError(err.data?.message || "Erreur lors du pointage");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button type="submit">Pointer ma presence</button>

      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
      {error && <p>{error}</p>}
    </form>
  );
}
```

### 7.5 Réponses Possibles

Pointage valide :

```json
{
  "success": true,
  "statut": "present",
  "pointage_id": 10,
  "face_verification": {
    "match": true,
    "similarity_score": 0.93,
    "is_real_face": true,
    "liveness_probability": 0.98
  }
}
```

Pointage invalide :

```json
{
  "success": false,
  "statut": "invalide",
  "raison": "visage_non_reconnu",
  "pointage_id": 11,
  "face_verification": {
    "match": false,
    "is_real_face": true
  }
}
```

### 7.6 Gestion UI Recommandée

- si `success === true`, afficher confirmation
- si `success === false`, afficher la raison métier
- si erreur `503`, afficher un message du type : service de reconnaissance faciale indisponible
- désactiver le bouton pendant l'envoi
- vérifier qu'un fichier est bien sélectionné avant soumission

## 8. Intégration Côté Professeur

### Endpoints utiles

```text
GET /api/v1/professeur/courses
GET /api/v1/professeur/courses/:coursId
GET /api/v1/professeur/courses/:coursId/attendance
GET /api/v1/professeur/courses/:coursId/attendance/stream
GET /api/v1/professeur/courses/:coursId/qr
POST /api/v1/professeur/courses/:coursId/cancel
POST /api/v1/professeur/courses/:coursId/reschedule
POST /api/v1/professeur/courses/:coursId/attendance/regularize
```

### Usages front

- lister les cours du professeur
- consulter les présences d'un cours
- annuler un cours
- reporter un cours
- corriger un pointage

### 8.1 Suivi de Présence en Temps Réel (SSE)

`GET /api/v1/professeur/courses/:coursId/attendance/stream` remplace le polling
regulier de `GET .../attendance` par un flux **Server-Sent Events**
(`text/event-stream`). Utile pour l'ecran `SuiviPresence.jsx` qui sondait
l'endpoint toutes les 15 secondes.

Comportement :

- un premier evenement est envoye **immediatement** a la connexion, avec exactement
  le meme payload que `GET .../attendance`
- un nouvel evenement est pousse des qu'un pointage est enregistre (borne) ou
  regularise sur ce cours
- un commentaire keep-alive est envoye toutes les 15s en l'absence d'activite
- la connexion se ferme au bout de 30 minutes ; `EventSource` reconnecte
  automatiquement cote navigateur, aucune action front necessaire

Exemple React :

```javascript
import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:5000/api/v1";

export function useCourseAttendanceStream(courseId, accessToken) {
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    if (!courseId || !accessToken) return undefined;

    // EventSource natif ne supporte pas les en-tetes personnalises (Authorization) :
    // passer le token en query string, ou proxifier via un endpoint qui l'accepte
    // ainsi. A defaut, revenir au polling existant si le proxy n'est pas en place.
    const url = `${API_BASE_URL}/professeur/courses/${courseId}/attendance/stream?access_token=${accessToken}`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      setAttendance(JSON.parse(event.data));
    };

    source.onerror = () => {
      // EventSource retente seul ; rien a faire ici sauf logguer/afficher un badge
      // "reconnexion en cours" si besoin.
    };

    return () => source.close();
  }, [courseId, accessToken]);

  return attendance;
}
```

**Important** : `EventSource` natif ne permet pas d'ajouter un en-tete
`Authorization: Bearer ...`. Deux options :

1. utiliser une librairie compatible SSE + en-tetes personnalises (ex.
   `@microsoft/fetch-event-source`) pour continuer a passer le JWT en en-tete comme
   partout ailleurs dans ce guide (recommande, coherent avec le reste de l'app) ;
2. si l'option 1 n'est pas souhaitee, le backend devra etre adapte pour accepter le
   token en query string sur cette route precise — **non implemente actuellement**,
   a confirmer si necessaire.

**Limite de scalabilite a connaitre cote ops** : la diffusion des evenements est
geree en memoire, par process Python. En deploiement multi-worker (ex.
`gunicorn -w 4`), un pointage traite par le worker A ne notifie pas les abonnes
connectes au worker B. Deploiement recommande pour ce flux : un seul worker
multi-thread. Si l'appli passe a plusieurs workers/instances a l'avenir, ce flux
devra migrer vers un backend de pub/sub partage (Redis, etc.) — le polling existant
reste une alternative fiable dans l'intervalle.

## 9. Intégration Côté Responsable / Administration

### 9.1 Gestion des Étudiants

Endpoints :

```text
GET /api/v1/admin/students
POST /api/v1/admin/students
GET /api/v1/admin/students/:id
PATCH /api/v1/admin/students/:id
POST /api/v1/admin/students/:id/reset-password
POST /api/v1/admin/students/import
```

Création d'un étudiant :

- utiliser `multipart/form-data`
- envoyer `nom`, `prenom`, `email`, `promotion_id`, `photo`

### 9.2 Gestion des Professeurs

Endpoints :

```text
GET /api/v1/admin/professors
POST /api/v1/admin/professors
GET /api/v1/admin/professors/:id
PATCH /api/v1/admin/professors/:id
POST /api/v1/admin/professors/:id/reset-password
POST /api/v1/admin/professors/import
```

### 9.3 Gestion des Cours

Endpoints :

```text
GET /api/v1/admin/courses
POST /api/v1/admin/courses
GET /api/v1/admin/courses/:id
```

### 9.4 Gestion des Absences

Endpoints :

```text
GET /api/v1/admin/absences
POST /api/v1/admin/absences/:suiviId/justify
```

### 9.5 Exports

Endpoints :

```text
GET /api/v1/admin/exports/absences
GET /api/v1/admin/exports/absences/xlsx
GET /api/v1/admin/exports/courses/:coursId/attendance
GET /api/v1/admin/exports/courses/:coursId/attendance/xlsx
```

Pour les exports, côté React :

- appeler l'endpoint
- récupérer le contenu binaire ou texte
- déclencher un téléchargement

### 9.6 Paramètres, Matières/Salles et Rapports (nouveaux endpoints)

Endpoints désormais disponibles côté backend (répondaient auparavant aux écrans
"Promotions / Paramètres / Rapports" restés en mode local) :

```text
GET/PATCH /api/v1/admin/settings
GET       /api/v1/admin/report-templates
POST      /api/v1/admin/reports/generate
GET/POST/PATCH/DELETE /api/v1/admin/subjects       (alias de /admin/matieres)
GET/POST/PATCH/DELETE /api/v1/admin/subjects/:id
GET/POST/PATCH/DELETE /api/v1/admin/rooms          (alias de /admin/salles)
GET/POST/PATCH/DELETE /api/v1/admin/rooms/:id
```

`/subjects` et `/rooms` sont des alias stricts de `/matieres` et `/salles` (mêmes
données, même comportement) : les corps de réponse utilisaient déjà les clés
anglaises `subjects`/`rooms`, seule l'URL manquait.

**Paramètres globaux** (`GET`/`PATCH /admin/settings`) :

```json
{
  "settings": {
    "id": 1,
    "nom_etablissement": "Institut Demo",
    "seuil_absences": 3,
    "tolerance_retard_minutes_defaut": 10,
    "contact_support_email": null,
    "updated_at": "2026-07-10T09:00:00"
  }
}
```

- `seuil_absences` pilote directement `seuil_atteint` dans `/admin/absences` : le
  modifier **recalcule immédiatement** tous les suivis existants côté backend.
- `tolerance_retard_minutes_defaut` est utilisé par `POST /admin/courses` quand
  `tolerance_retard_minutes` n'est pas fourni à la création.

**Rapports** : `GET /admin/report-templates` liste les modèles disponibles
(`absences_summary`, `course_attendance`) avec leurs paramètres attendus ;
`POST /admin/reports/generate` génère le fichier (`{ template_id, format: "csv"|"xlsx", ... }`)
et régularise sous un contrat unique les exports existants de la section 9.5, qui
restent également disponibles tels quels.

## 10. Gestion des Rôles Dans Le Front

Après connexion, utiliser `role` pour router l'utilisateur :

- `etudiant` vers l'espace étudiant
- `professeur` vers l'espace professeur
- `responsable` vers l'espace de gestion
- `admin` vers l'espace d'administration

Exemple :

```javascript
function redirectAfterLogin(data, navigate) {
  if (data.must_change_password) {
    navigate("/change-password");
    return;
  }

  if (data.role === "etudiant") navigate("/student");
  else if (data.role === "professeur") navigate("/professor");
  else navigate("/admin");
}
```

## 11. Gestion des Erreurs

Prévoir une gestion homogène des erreurs :

- `400` : données invalides (voir aussi `token_invalide` / `token_expire` /
  `token_deja_utilise` pour `/auth/reset-password`, section 5.6.2)
- `401` : token invalide ou identifiants incorrects
- `403` : accès interdit, compte désactivé (`account_disabled`), ou changement de
  mot de passe obligatoire (`password_change_required`)
- `404` : ressource introuvable
- `409` : conflit métier
- `503` : service externe indisponible

Un en-tête `Deprecation: true` peut être présent sur les réponses de
`POST /etudiant/attendance/checkin` (voir section 7) : ce n'est pas une erreur, juste
un signal que la route est dépréciée au profit du flux borne.

Exemple :

```javascript
function getApiErrorMessage(error) {
  return (
    error?.data?.message ||
    error?.message ||
    "Une erreur est survenue"
  );
}
```

## 12. Parcours Front Minimal Recommandé

### Espace Étudiant
- connexion
- changement de mot de passe au premier accès
- liste des cours
- page de pointage facial
- historique des présences
- résumé des absences
- notifications

### Espace Professeur
- liste des cours
- détail d'un cours
- consultation des présences
- annulation ou report
- régularisation

### Espace Responsable
- tableau de bord gestion
- gestion étudiants
- gestion professeurs
- gestion cours
- suivi des absences
- imports et exports

## 13. Recommandations Pratiques Pour React

- stocker le token dans un endroit centralisé
- protéger les routes privées
- prévoir un composant de garde pour `must_change_password`
- utiliser `FormData` pour tous les envois de fichiers
- afficher clairement les messages métier retournés par l'API
- pour le pointage facial, limiter les formats d'image à `jpg`, `jpeg`, `png`

## 14. Résumé Essentiel

- La clé ARSA Face va dans le `.env` du backend, jamais dans React
- Le flux borne hors espace étudiant existe via `/api/v1/attendance/kiosk/scan` et `/api/v1/attendance/kiosk/checkin`, et est désormais le **seul** chemin de pointage nominal (section 5.5 / 7)
- Le pointage self-service étudiant (`/etudiant/attendance/checkin`) est déprécié mais reste fonctionnel (section 7)
- Mot de passe oublié : `/auth/forgot-password` + `/auth/reset-password`, disponible pour les 4 rôles (section 5.6) — le front doit exposer une route publique `/reset-password` lisant `?token=`
- Suivi de présence en temps réel disponible en SSE via `/professeur/courses/:coursId/attendance/stream` (section 8.1), en alternative au polling
- Nouveaux endpoints admin : `settings`, `report-templates`, `reports/generate`, `subjects`, `rooms` (section 9.6)
- Le front React parle uniquement au backend
- Le backend gère la vérification faciale et la logique métier
- Swagger reste disponible pour tester les endpoints avant intégration front
