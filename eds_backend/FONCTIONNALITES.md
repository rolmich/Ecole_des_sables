
# Fonctionnalités Implémentées

Ce document détaille les fonctionnalités de l'API REST du projet `eds_backend`.

---

## 1. Authentification et Gestion des Utilisateurs

Gère l'accès au système et les comptes utilisateurs.

- **`POST /api/auth/register/`**: Inscription d'un nouvel utilisateur.
- **`POST /api/auth/login/`**: Connexion d'un utilisateur et récupération des jetons JWT (access/refresh).
- **`POST /api/auth/logout/`**: Déconnexion d'un utilisateur (invalide le jeton refresh).
- **`POST /api/auth/token/refresh/`**: Rafraîchissement du jeton d'accès.
- **`GET /api/auth/me/`**: Récupération des informations de l'utilisateur actuellement connecté.
- **`GET /api/auth/users/`**: Liste de tous les utilisateurs avec filtres (par rôle, statut, recherche).
- **`POST /api/auth/users/create/`**: Création d'un nouvel utilisateur (admin/manager).
- **`GET /api/auth/users/<id>/`**: Récupération des détails d'un utilisateur spécifique.
- **`PUT/PATCH /api/auth/users/<id>/update/`**: Mise à jour d'un utilisateur.
- **`DELETE /api/auth/users/<id>/delete/`**: Suppression d'un utilisateur.

---

## 2. Gestion des Stages

CRUD (Créer, Lire, Mettre à jour, Supprimer) pour les stages.

- **`GET /api/stages/`**: Liste de tous les stages avec filtres et tri.
- **`POST /api/stages/`**: Création d'un nouveau stage.
- **`GET /api/stages/<id>/`**: Récupération des détails d'un stage.
- **`PUT/PATCH /api/stages/<id>/`**: Mise à jour d'un stage.
- **`DELETE /api/stages/<id>/`**: Suppression d'un stage.
- **`GET /api/stages/statistics/`**: Récupération des statistiques sur les stages (total, actifs, à venir, terminés).

---

## 3. Gestion des Participants

CRUD pour les participants.

- **`GET /api/participants/`**: Liste de tous les participants avec filtres (par stage, statut, sexe, langue, assignation).
- **`POST /api/participants/`**: Création d'un nouveau participant et inscription à un ou plusieurs stages.
- **`GET /api/participants/<id>/`**: Récupération des détails d'un participant.
- **`PUT/PATCH /api/participants/<id>/`**: Mise à jour d'un participant.
- **`DELETE /api/participants/<id>/`**: Suppression d'un participant.
- **`GET /api/participants/statistics/`**: Récupération de statistiques (total, assignés, par statut, par stage).
- **`GET /api/participants/by-stage/<stage_id>/`**: Liste des participants pour un stage spécifique.
- **`GET /api/participants/unassigned/`**: Liste de tous les participants non encore assignés à un bungalow.

---

## 4. Gestion des Villages et Bungalows (Lecture seule)

Fournit des informations sur l'infrastructure d'hébergement. Ces données sont gérées via un script (`populate_villages.py`) et ne sont pas modifiables via l'API.

- **`GET /api/villages/`**: Liste de tous les villages.
- **`GET /api/villages/<id>/`**: Détails d'un village, incluant la liste de ses bungalows.
- **`GET /api/villages/statistics/`**: Statistiques sur les villages (taux d'occupation, etc.).
- **`GET /api/villages/<village_name>/bungalows/`**: Liste des bungalows pour un village donné.
- **`GET /api/bungalows/`**: Liste de tous les bungalows avec filtres (par village, type, disponibilité).
- **`GET /api/bungalows/<id>/`**: Détails d'un bungalow.
- **`GET /api/bungalows/<id>/details/`**: Détails d'un bungalow incluant la liste des participants qui y sont assignés.
- **`GET /api/bungalows/available/`**: Liste des bungalows ayant des lits disponibles.

---

## 5. Logique d'Assignation des Bungalows

Le cœur du système, qui gère l'attribution des lits aux participants.

- **`POST /api/participants/<participant_id>/assign/`**: Assigne un participant à un lit dans un bungalow pour un stage donné.
- **`POST /api/participants/<participant_id>/unassign/`**: Désassigne un participant de son bungalow.

### Règles de validation de l'assignation (`assignment_logic.py`):

Le système applique une série de règles strictes avant de valider une assignation :
1.  **Validité du Lit**: Le lit demandé doit exister dans le bungalow.
2.  **Appartenance au Stage**: Le participant doit être inscrit au stage pour lequel l'assignation est demandée.
3.  **Non-Mixité**: Les hommes et les femmes ne peuvent pas partager le même bungalow sur des périodes qui se chevauchent.
4.  **Unicité du Stage par Bungalow**: Tous les occupants d'un bungalow sur une période donnée doivent appartenir au même stage.
5.  **Disponibilité du Lit**: Le lit ne doit pas déjà être occupé par un autre participant sur une période qui se chevauche.
6.  **Capacité du Bungalow**: L'assignation ne doit pas dépasser la capacité totale du bungalow pour la période demandée.
