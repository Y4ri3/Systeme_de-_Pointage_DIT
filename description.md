# Système de Gestion de Présence Étudiante

## 1. Vision et Finalité du Projet

Le Système de Gestion de Présence Étudiante est une plateforme pensée pour moderniser le suivi de présence dans les établissements d'enseignement supérieur. Sa finalité est de fiabiliser l'enregistrement des présences, de réduire les tâches administratives répétitives et d'offrir une visibilité claire sur l'assiduité des étudiants.

Le projet ne se limite pas à enregistrer des présences. Il structure l'ensemble du cycle de gestion autour des cours, des utilisateurs, des absences, des notifications et du pilotage administratif. Il propose ainsi un environnement unique pour organiser les séances, suivre les étudiants et agir rapidement en cas d'absences répétées, de retards ou de changements de planning.

## 2. Problème Résolu

Dans de nombreux établissements, le suivi de présence repose encore sur des processus manuels ou peu sécurisés. Cela entraîne plusieurs difficultés :

- **Temps perdu en début ou en fin de séance** : l'appel oral ou la signature papier ralentit le déroulement pédagogique
- **Fraude ou usurpation** : il est difficile de garantir que la personne pointée est bien la bonne
- **Manque de traçabilité** : les responsables disposent rarement d'une vision consolidée et immédiate des présences
- **Gestion lourde des absences** : l'identification des étudiants à risque demande un travail de compilation important
- **Communication insuffisante** : les changements de cours ou les alertes d'absence ne sont pas toujours relayés rapidement

La plateforme apporte une réponse concrète en numérisant l'ensemble du processus, en renforçant l'identification des étudiants au moment du pointage et en centralisant les informations utiles pour tous les acteurs.

## 3. Utilisateurs Ciblés

La solution répond aux besoins de plusieurs profils complémentaires :

### 3.1 Étudiants
- Consultent leurs cours
- Pointent leur présence
- Suivent leur historique de présence et leurs absences
- Reçoivent les notifications liées à leur scolarité

### 3.2 Professeurs
- Consultent les cours qu'ils assurent
- Suivent les présences de leurs séances
- Peuvent annuler ou reporter un cours
- Peuvent effectuer des régularisations manuelles de présence

### 3.3 Responsables Administratifs
- Gèrent les comptes étudiants et professeurs
- Organisent les promotions, filières, matières et salles
- Planifient et supervisent les cours
- Contrôlent les absences, les justifications et les alertes
- Produisent des exports et des vues de pilotage

### 3.4 Administrateurs
- Interviennent sur les mêmes espaces de gestion que les responsables avec un niveau de contrôle global

## 4. Principales Fonctionnalités

### 4.1 Gestion Complète des Comptes
- Création des étudiants et des professeurs par les responsables
- Enregistrement d'une photo au moment de la création du compte
- Génération d'un mot de passe temporaire envoyé par email
- Obligation de changer le mot de passe lors de la première connexion
- Mise à jour, activation ou désactivation des comptes
- Import en masse des utilisateurs à partir d'un fichier Excel

### 4.2 Organisation Académique
- Gestion des filières, promotions, matières et salles
- Affectation des étudiants à une promotion
- Affectation des cours à une matière, un enseignant, une salle et une promotion
- Planification des séances avec date, horaires et tolérance au retard

### 4.3 Gestion des Cours
- Consultation des cours par profil
- Création de nouvelles séances
- Modification du planning
- Annulation et report des cours
- Consultation détaillée des présences associées à un cours

### 4.4 Pointage par Reconnaissance Faciale
- Pointage étudiant par prise de selfie
- Vérification de l'identité à partir de la photo de référence enregistrée sur le compte
- Contrôle supplémentaire pour s'assurer qu'il s'agit bien d'une personne réelle au moment du pointage
- Détermination automatique du statut de présence selon l'heure réelle de pointage
- Enregistrement des cas invalides lorsqu'un pointage est refusé

### 4.5 Suivi des Présences et Absences
- Historique individuel des pointages
- Synthèse des absences par étudiant et par matière
- Détection des seuils d'absence atteints
- Justification des absences par les responsables
- Régularisation manuelle de certains cas par les encadrants

### 4.6 Notifications et Communication
- Notification des étudiants en cas d'annulation ou de report d'un cours
- Consultation des notifications reçues
- Marquage des notifications comme lues

### 4.7 Pilotage et Exports
- Consultation des listes d'étudiants, professeurs, cours et absences
- Recherche et pagination sur les principales vues de gestion
- Export des absences et des feuilles de présence

## 5. Valeur Apportée

### Pour l'Établissement
- **Fiabilisation du contrôle de présence** grâce à une vérification plus forte de l'identité
- **Réduction de la fraude** par rapport aux méthodes classiques
- **Vision consolidée** des absences, retards et cours
- **Pilotage facilité** grâce aux exports et aux vues de suivi

### Pour les Responsables
- **Maîtrise opérationnelle** sur les comptes, les cours et les référentiels académiques
- **Réactivité accrue** face aux absences répétées ou aux changements de planning
- **Processus d'onboarding structuré** pour les étudiants et les professeurs

### Pour les Professeurs
- **Suivi plus simple** des présences de leurs groupes
- **Capacité d'action** en cas d'annulation, de report ou de correction de pointage
- **Moins de charge administrative** en salle

### Pour les Étudiants
- **Parcours clair et rapide** pour prouver leur présence
- **Accès transparent** à leur historique et à leurs notifications
- **Sécurisation du compte** dès la première connexion

## 6. Cas d'Utilisation Principaux

### Cas 1 : Création d'un Étudiant
1. Un responsable crée le compte de l'étudiant
2. Il renseigne les informations d'identité, la promotion et la photo
3. Le système envoie un mot de passe temporaire par email
4. Lors de sa première connexion, l'étudiant doit définir un nouveau mot de passe

### Cas 2 : Pointage d'une Présence
1. L'étudiant se connecte à son espace
2. Il sélectionne le cours concerné ou utilise l'écran prévu pour le pointage
3. Il transmet un selfie
4. Le système vérifie l'identité et la validité du pointage
5. Le statut est enregistré comme présent, en retard ou invalide selon le résultat

### Cas 3 : Gestion d'un Changement de Cours
1. Le professeur ou le responsable modifie une séance
2. Le cours peut être reporté ou annulé
3. Les étudiants concernés reçoivent une notification

### Cas 4 : Suivi des Absences
1. Le responsable consulte la liste des absences
2. Il identifie les étudiants en situation sensible
3. Il peut justifier certains cas
4. Il exporte les données si nécessaire

### Cas 5 : Import de Comptes
1. Le responsable prépare un fichier de données
2. Il importe en masse les étudiants ou professeurs
3. Les comptes sont créés avec un mot de passe temporaire
4. Les nouveaux utilisateurs peuvent ensuite finaliser leur accès

## 7. Fonctionnement Global du Point de Vue Utilisateur

### Parcours Étudiant
L'étudiant reçoit d'abord ses accès temporaires, se connecte une première fois et met à jour son mot de passe. Il peut ensuite consulter ses cours, pointer sa présence par reconnaissance faciale, vérifier son historique de présence, suivre ses absences et consulter ses notifications.

### Parcours Professeur
Le professeur accède à ses cours, suit les présences de ses groupes, consulte les détails d'une séance, régularise certains cas et gère les imprévus pédagogiques comme une annulation ou un report.

### Parcours Responsable
Le responsable dispose d'une vue de gestion plus large. Il crée les comptes, affecte les étudiants, structure l'organisation académique, planifie les cours, suit les absences, justifie certains cas et exploite les exports pour le pilotage.

## 8. Positionnement du Projet

Le projet se positionne comme une solution de gestion de présence plus complète qu'un simple outil de pointage. Il combine sécurité, pilotage administratif, gestion opérationnelle des cours et suivi individualisé des étudiants. Dans son état actuel, il propose déjà un socle métier solide pour un établissement souhaitant professionnaliser son suivi de présence et mieux encadrer ses processus académiques.
