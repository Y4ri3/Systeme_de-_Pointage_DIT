# Guide d'Integration Backend Vers Front - Retour 3

## Objectif

Ce document complete `guide_integration_front_react.md`, `return2.md` (repris ici sous `returnbackend.md`) et `backreview.md`. Il porte sur trois sujets :

1. **Mise a jour importante (voir section 0)** : le pointage etudiant "self-service" decrit plus bas a ete retire. Le pointage se fait desormais exclusivement via la borne securisee.
2. L'historique du changement de flow qui a precede cette decision (section 1, conserve pour tracabilite).
3. L'etat des endpoints proposes dans `backreview.md` (promotions, parametres, rapports, matieres, salles) qui restent non confirmes.

## 0. Mise A Jour : Le Pointage Self-Service Est Retire (Decision Securite)

Apres reflexion produit, le pointage facial **n'est plus accessible depuis l'espace personnel de l'etudiant**, pour une raison de securite : un etudiant connecte sur son propre telephone pourrait potentiellement importer une ancienne photo au lieu de se scanner en direct, ou pointer pour un cours sans etre physiquement present.

### Nouveau modele

Le pointage se fait desormais **uniquement** via la borne (`/borne-pointage`, deja documentee section 5.5 du guide) :

- La borne est ouverte par un compte staff (`professeur`, `responsable`, `admin`), qui reste connecte sur l'appareil (telephone ou tablette partage, place sous le controle du responsable).
- Chaque etudiant qui se presente scanne son visage **en direct via la camera de l'appareil** (plus d'import de fichier possible cote front sur cet ecran ; seule la capture camera live est proposee, avec repli sur import de fichier uniquement si la camera est indisponible techniquement).
- `POST /api/v1/attendance/kiosk/scan` identifie l'etudiant et renvoie son profil + `attendance_context` (cours du jour, cours actif, `can_checkin_now`) -- deja documente, aucun changement necessaire cote backend.
- `POST /api/v1/attendance/kiosk/checkin` confirme la presence -- deja documente, aucun changement necessaire cote backend.

### Consequence Sur La Proposition Precedente

**La proposition `GET /api/v1/etudiant/attendance/today-context` (section 1 ci-dessous) est retiree.** Elle n'est plus necessaire puisque le contexte "cours actif du jour" est desormais toujours obtenu via `kiosk/scan`, qui le fournit deja. Inutile de l'implementer cote backend sauf si un futur besoin la justifie a nouveau.

`POST /api/v1/etudiant/attendance/checkin` (pointage authentifie individuel) n'est plus appele par le front. Nous laissons la decision au backend de le conserver (utile pour d'autres integrations futures) ou de le marquer deprecie.

### Nouveau Point A Verifier Cote Backend

- Confirmer que `POST /api/v1/attendance/kiosk/scan` fonctionne bien pour un etudiant **quelconque** a partir d'un JWT **staff** unique (celui qui a ouvert la borne), sans requerir de re-authentification par etudiant. C'est le comportement suppose par ce nouveau flow.
- Confirmer qu'il n'y a pas de limite de frequence (rate limit) cote backend qui bloquerait des scans repetes rapproches sur le meme compte staff (plusieurs etudiants scannes a la suite en quelques minutes).

## 1. Historique : Ancien Flow De Pointage Etudiant Self-Service (Retire, Conserve Pour Tracabilite)

### Avant

L'ecran `/etudiant/scan` demandait a l'etudiant de choisir manuellement un cours dans une liste, puis d'envoyer un selfie pour ce cours via `POST /etudiant/attendance/checkin`.

### Version Intermediaire (Retiree Depuis)

Une version intermediaire avait introduit un flow "scan facial d'abord" directement dans l'espace etudiant (reconnaissance -> profil -> cours du jour detecte par l'heure -> pointage), avec une proposition d'endpoint `GET /api/v1/etudiant/attendance/today-context`. **Cet ecran et cette proposition sont retires** au profit du modele borne-only decrit en section 0.

## 2. Rappel : Endpoints Proposes Dans `backreview.md` Toujours Non Confirmes

Statut inchange depuis le dernier retour, a confirmer ou implementer :

- `GET/POST/PATCH /api/v1/admin/promotions`
- `GET/PATCH /api/v1/admin/settings`
- `GET /api/v1/admin/report-templates`
- `POST /api/v1/admin/reports/generate`
- `GET /api/v1/admin/subjects`
- `GET /api/v1/admin/rooms`

## 3. Comportement Front Sur Les Endpoints Non Confirmes

Cote front, les endpoints de la section 2 sont appeles reellement en priorite. S'ils ne repondent pas (404, 500, reseau -- quel que soit le code d'erreur, y compris en dehors du mode `VITE_ENABLE_API_FALLBACK`), le front bascule automatiquement sur un calcul ou des donnees locales **et affiche un badge "Mode demo local"** visible par le responsable, pour ne jamais laisser croire qu'une donnee est persistee cote serveur alors qu'elle ne l'est pas. Des que ces routes existeront reellement, l'affichage bascule automatiquement sur les vraies donnees, sans changement cote front necessaire.

## 4. Verification Conseillee Cote Front

- Borne de pointage : verifier que `attendance_context.active_course` de `POST /attendance/kiosk/scan` renvoie bien `null` en dehors des heures de cours, et le bon cours pendant un creneau.
- Verifier que `can_checkin_now` passe a `false` une fois l'etudiant deja pointe sur le cours actif (pour eviter un double pointage cote UI).
- Confirmer si `tolerance_retard_minutes` doit etendre la fenetre `active_course` au-dela de `heure_fin`, ou si un cours en retard doit rester `active_course` jusqu'a la fin de la tolerance.
- Confirmer qu'un meme compte staff peut enchainer plusieurs `kiosk/scan` + `kiosk/checkin` pour des etudiants differents sans se reconnecter (voir section 0).

## 5. Suggestion D'Amelioration (Non Bloquante)

L'ecran professeur de suivi de presence (`SuiviPresence.jsx`, ex-`GenerationQR.jsx`) sonde `GET /professeur/courses/:coursId/attendance` toutes les 15 secondes tant que le suivi est ouvert, pour donner une vue "temps reel" des pointages a la borne. Si le backend expose un jour un canal push (WebSocket / Server-Sent Events) pour les evenements de pointage par cours, ce serait plus efficace qu'un polling regulier -- mais ce n'est pas bloquant, le polling actuel est fonctionnel.

## 6. Source De Verite

Comme precedemment : `swagger.yml`, `guide_integration_front_react.md`, `returnbackend.md`, et desormais ce fichier pour le flow de pointage revise (borne uniquement).
