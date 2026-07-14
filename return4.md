# Guide d'Integration Backend Vers Front - Retour 5

## Objectif

Ce document fait suite a `erreur.md` (bug `/admin/settings`) et couvre aussi un
changement de securite sur le pointage QR etudiant, decide independamment de ce
rapport. `guide_integration_front_react.md` a ete mis a jour en consequence
(sections 6.5, 7, 11, 14).

## 1. Bug `/admin/settings` (`erreur.md`) — Resolu

### Cause confirmee

Reproduit et confirme : la table `parametres` de la base SQLite locale utilisee pour
les tests etait bien en retard sur le modele `Parametre` (colonnes
`tolerance_retard_minutes_defaut` et `contact_support_email` absentes). La migration
Alembic actuelle (`ce09f258c38a`) cree pourtant ces colonnes des la premiere
installation — le probleme ne vient donc pas d'une migration manquante dans le
depot, mais d'un environnement local dont la base a ete initialisee via l'ancien
script `init_db.py` (qui appelait `db.create_all()` directement, en contournant
Alembic) a un moment ou le modele avait moins de colonnes, puis jamais remise a
niveau depuis.

### Corrections apportees

1. **`init_db.py` a ete supprime.** Ce script faisait doublon avec `flask seed-db`
   et, plus grave, permettait de creer une base hors du suivi Alembic — exactement
   la cause de ce bug. Seul `flask db upgrade` + `flask seed-db` doit desormais etre
   utilise pour initialiser une base de developpement (deja documente dans
   `README.md`).
2. **Le mecanisme d'auto-reparation du schema SQLite de dev** (`_repair_local_sqlite_schema`,
   deja en place pour une colonne sur `utilisateurs`) a ete etendu pour couvrir
   egalement `parametres`. Concretement : **un simple redemarrage du serveur suffit
   maintenant** a corriger une base locale degradee comme celle du rapport — aucune
   commande manuelle a lancer. Ce comportement est couvert par un nouveau test
   (`tests/test_schema_repair.py`) qui reproduit exactement le scenario du rapport.
3. Reponse a la question 3 du rapport (autres tables recentes) : `subjects`/`rooms`
   sont des alias stricts de `matieres`/`salles` (memes tables, meme migration —
   aucun risque separe) ; `report-templates` ne correspond a aucune table en base
   (liste statique cote code) — aucun risque de derive de schema possible sur cet
   endpoint ; `promotions` existe depuis la toute premiere migration, comme
   `parametres`, mais n'a pas ete signalee en erreur donc a priori non affectee sur
   votre environnement. Aucune action necessaire de votre cote au-dela d'un
   redemarrage du serveur backend.

### A faire cote front

Rien. Comme note dans `erreur.md` section 6, aucun bug frontend n'etait en cause ;
`ParametresTab.jsx` fonctionnera sans modification des que le backend repond
normalement (deja verifie : `GET`/`PATCH /admin/settings` repondent `200`).

## 2. Pointage QR Etudiant — Restriction Reseau Ajoutee

Independamment du rapport ci-dessus, une decision produit a ete prise concernant le
pointage par QR code (section 6.5 du guide) : **il est desormais lui aussi restreint
au reseau Wi-Fi dedie de l'etablissement** (`KIOSK_ALLOWED_NETWORKS`), au meme titre
que la borne (section 5.5).

### Ce qui change

- `POST /api/v1/etudiant/attendance/checkin-qr` renvoie maintenant `403
  kiosk_network_forbidden` si l'etudiant n'est pas connecte au reseau autorise —
  **meme avec un JWT etudiant valide et un QR non expire**.
- Cette restriction est verifiee **avant** la validation du token QR et du JWT : une
  requete hors reseau echoue toujours en `403`, jamais en `400 qr_invalide_ou_expire`.

### Pourquoi

Le QR seul (identite via JWT + fraicheur du token 120s) laissait un scenario
residuel : un etudiant present pourrait photographier l'ecran et l'envoyer a un
absent avant expiration. Le reseau Wi-Fi dedie apporte une preuve de presence
supplementaire qu'aucun des deux autres mecanismes ne peut fournir seul.

### A faire cote front

- Le scan QR ne fonctionnera plus en 4G/donnees mobiles — uniquement sur le Wi-Fi de
  l'etablissement. **Prevoir un message explicite** sur l'ecran de scan en cas de
  `403 kiosk_network_forbidden` (ex. *"Connectez-vous au Wi-Fi de l'etablissement
  pour pointer"*), plutot que d'afficher le message brut de l'API.
- Aucun changement sur le flux borne (section 5.5), deja restreint depuis la
  livraison precedente.
- Voir `guide_integration_front_react.md` section 6.5 (mise a jour) et section
  6.5.3 pour le code d'erreur complet.
