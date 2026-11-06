# Guide d'Integration Backend Vers Front - Retour 5

## Objectif

Ce document fait suite a `returnbackend3.md` (votre "Retour 4"). Il confirme ce qui a
ete branche cote front pour les deux livraisons decrites, prend la decision demandee
en section 2.3 de votre document, et remonte deux points a clarifier.

## 1. Mot De Passe Oublie — Integre

- `POST /auth/forgot-password` et `POST /auth/reset-password` sont branches.
- Nouvel ecran public `/forgot-password` (formulaire email, message generique unique
  quel que soit le resultat reel, jamais de "cet email n'existe pas").
- Nouvel ecran public `/reset-password?token=...` (nouveau mot de passe + confirmation,
  gestion des 4 codes d'erreur documentes).
- Lien "Mot de passe oublie ?" ajoute sur l'ecran de connexion.

### A Clarifier : Nom Exact Du Champ D'Erreur

Le document liste les codes `token_invalide`, `token_expire`, `token_deja_utilise`,
`account_disabled`, mais ne precise pas le nom du champ JSON qui les porte. Le front
essaie actuellement, dans l'ordre : `data.code`, `data.error_code`, `data.error`,
`data.type`. Si aucun de ces noms ne correspond a la reponse reelle du backend, merci
de confirmer le bon champ (ou de l'aligner sur l'un de ceux-ci) -- sinon le front
affichera le message generique de fallback (`data.message` / `data.detail`) plutot que
le message specifique au code, ce qui reste correct mais moins precis pour
l'utilisateur.

### A Coordonner : `FRONTEND_PASSWORD_RESET_URL`

La route front est `/reset-password` (suffixee de `?token=...` par le lien email).
Merci de configurer `FRONTEND_PASSWORD_RESET_URL` a `{origine_du_front}/reset-password`
pour chaque environnement (ex. `http://localhost:5173/reset-password` en dev local --
le port exact depend de l'instance Vite lancee, `http://127.0.0.1:5177` dans certains
de nos environnements de dev, a verifier ensemble pour la valeur exacte en staging/prod).

## 2. Suivi De Presence Temps Reel (SSE) — Integre, Decision Prise Sur 2.3

Decision retenue : **option 1 recommandee**, sans ajouter de dependance externe.
Plutot que `@microsoft/fetch-event-source`, le front lit directement le flux via
`fetch()` + `ReadableStream` (le protocole SSE est simple a re-parser a la main :
frames separees par `\n\n`, lignes `data:` accumulees et parsees en JSON). Cela
permet d'envoyer `Authorization: Bearer <token>` comme sur tous les autres appels,
sans dependance supplementaire au bundle.

Comportement cote front (`SuiviPresence.jsx`) :

- A l'ouverture de l'ecran, tentative de connexion au flux. Le polling 15s existant
  reste actif tant que le flux n'a pas confirme son ouverture (`onOpen`).
- Des que le premier evenement arrive, le polling s'arrete et l'indicateur passe de
  "Actualisation automatique (15s)" a "En direct".
- En cas de coupure ou d'erreur (fin du flux au bout de 30 minutes, ou probleme
  reseau), le front retente la connexion apres 2 secondes ; le polling reprend
  automatiquement en repli tant que le flux n'est pas retabli.
- Le flux est ferme proprement (AbortController) a la fermeture manuelle du suivi ou
  au demontage de l'ecran.

Rien a faire de plus cote backend pour ce choix : le contrat `text/event-stream` +
en-tete `Authorization` classique convient tel quel.

## 3. `already_checked_in` — Integre

La borne de pointage (`KioskAttendance.jsx`) affiche desormais un etat distinct
"Presence deja enregistree" quand `attendance_context.already_checked_in` est `true`,
avec le bouton de confirmation desactive et libelle en consequence, pour eviter toute
ambiguite avec le cas "aucun cours actif".

## 4. Endpoints Confirmes — Bascule Effectuee

Les fonctions front pour promotions, parametres, matieres/salles et rapports sont
repassees du mode "endpoint propose avec repli visible" au mode standard utilise
partout ailleurs dans l'app (memes garanties que les autres endpoints confirmes). Le
badge "Mode demo local" et les bandeaux d'avertissement associes ont ete retires de
ces ecrans, puisqu'ils ne sont plus pertinents.

Note : `/etudiant/attendance/checkin` (deprecie cote backend) n'etait deja plus
appele cote front depuis `returnbackend2.md` section 0 -- rien a faire.

## 5. Source De Verite

Comme precedemment : `swagger.yml`, `guide_integration_front_react.md`,
`returnbackend.md`, `returnbackend2.md`, `returnbackend3.md`, et desormais ce fichier.
