# Frontend Examples

## Objectif

Ce dossier contient des fichiers React/Vite de reference a copier dans le
projet front pour brancher correctement l'espace `responsable` sur ce backend.

## Fichiers fournis

- `vite.config.js`
- `src/api/client.js`
- `src/api/admin.js`

## Integration recommandee

1. Copier `vite.config.js` a la racine du projet front Vite.
2. Copier `src/api/client.js` dans `src/api/client.js`.
3. Copier `src/api/admin.js` dans `src/api/admin.js`.
4. Ajouter une variable d'environnement front.

### Option A - Appel direct du backend

Dans `.env.development` du front :

```env
VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1
```

### Option B - Proxy Vite

Dans `.env.development` du front :

```env
VITE_API_BASE_URL=/api/v1
```

Dans ce cas, le `vite.config.js` fourni fera le proxy vers le backend local
`http://127.0.0.1:5000`.

## Plan d'integration rapide

### Etape 1

Brancher le login et stocker :

- `access_token`
- `role`
- `must_change_password`

### Etape 2

Faire router `responsable` et `admin` vers le meme espace :

```text
/admin
```

### Etape 3

Brancher les pages principales avec `src/api/admin.js` :

- Dashboard
- Etudiants
- Professeurs
- Cours
- Absences
- Parametres
- Rapports
- Notifications

### Etape 4

Traiter les exports CSV/XLSX comme des fichiers telecharges, pas comme du JSON.

### Etape 5

Respecter les formats :

- `FormData` pour les creations avec photo
- `JSON` pour les formulaires simples

## Endpoints cibles deja verifies cote backend

```text
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
GET  /api/v1/admin/dashboard/trends
GET  /api/v1/admin/report-templates
GET  /api/v1/admin/notifications
```
