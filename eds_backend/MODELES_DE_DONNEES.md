
# Modèles de Données (Classes et Attributs)

Ce document détaille les modèles de données (schémas de base de données) utilisés dans le projet `eds_backend`.

## Application: `authentication`

### Modèle: `User`
Ce modèle représente un utilisateur du système (administrateur, manager, etc.).

- **email**: `EmailField` - Email unique de l'utilisateur (utilisé comme identifiant).
- **username**: `CharField` - Nom d'utilisateur unique.
- **first_name**: `CharField` - Prénom.
- **last_name**: `CharField` - Nom de famille.
- **phone**: `CharField` - Numéro de téléphone (optionnel).
- **role**: `CharField` - Rôle de l'utilisateur (`admin`, `manager`, `staff`).
- **department**: `CharField` - Département (optionnel).
- **custom_permissions**: `JSONField` - Permissions personnalisées au format JSON.
- **status**: `CharField` - Statut du compte (`active`, `inactive`, `pending`).
- **is_active**: `BooleanField` - Statut d'activité du compte (Django).
- **is_staff**: `BooleanField` - Accès à l'interface d'administration (Django).
- **is_superuser**: `BooleanField` - Toutes les permissions (Django).
- **last_login**: `DateTimeField` - Date de la dernière connexion.
- **created_at**: `DateTimeField` - Date de création du compte.
- **created_by**: `CharField` - Qui a créé le compte.
- **updated_at**: `DateTimeField` - Date de la dernière modification.

---

## Application: `participants`

### Modèle: `Village`
Représente un village (A, B, C) avec des caractéristiques spécifiques.

- **name**: `CharField` - Nom du village ('A', 'B', 'C').
- **amenities_type**: `CharField` - Type d'équipements (`shared` ou `private`).

### Modèle: `Bungalow`
Représente un bungalow au sein d'un village.

- **village**: `ForeignKey` - Lien vers le `Village` auquel il appartient.
- **name**: `CharField` - Nom/numéro du bungalow.
- **type**: `CharField` - Type de bungalow ('A' ou 'B').
- **capacity**: `PositiveIntegerField` - Nombre total de lits.
- **occupancy**: `PositiveIntegerField` - Nombre de lits actuellement occupés.
- **beds**: `JSONField` - Configuration des lits (ex: `[{'id': 'bed1', 'type': 'simple'}, ...]`).
- **amenities**: `JSONField` - Équipements spécifiques du bungalow.

### Modèle: `Stage`
Représente un stage ou une formation.

- **name**: `CharField` - Nom du stage.
- **start_date**: `DateField` - Date de début.
- **end_date**: `DateField` - Date de fin.
- **instructor**: `CharField` - Nom de l'encadrant.
- **capacity**: `PositiveIntegerField` - Capacité maximale de participants.
- **current_participants**: `PositiveIntegerField` - Nombre actuel de participants inscrits.
- **constraints**: `JSONField` - Contraintes spéciales pour le stage.
- **created_at**: `DateTimeField` - Date de création.
- **updated_at**: `DateTimeField` - Date de modification.
- **created_by**: `ForeignKey` - Lien vers l'utilisateur (`User`) qui a créé le stage.

### Modèle: `Participant`
Représente un participant à un ou plusieurs stages.

- **first_name**: `CharField` - Prénom.
- **last_name**: `CharField` - Nom de famille.
- **email**: `EmailField` - Email du participant.
- **gender**: `CharField` - Sexe ('M' ou 'F').
- **age**: `PositiveIntegerField` - Âge.
- **language**: `CharField` - Langue parlée.
- **status**: `CharField` - Statut (`student`, `instructor`, etc.).
- **stages**: `ManyToManyField` - Lien vers les `Stage`(s) auxquels le participant est inscrit.
- **assigned_bungalow**: `ForeignKey` - Lien vers le `Bungalow` assigné (peut être nul).
- **assigned_bed**: `CharField` - ID du lit assigné dans le bungalow (peut être nul).
- **assignment_start_date**: `DateField` - Date de début de l'assignation.
- **assignment_end_date**: `DateField` - Date de fin de l'assignation.
- **created_at**: `DateTimeField` - Date de création.
- **updated_at**: `DateTimeField` - Date de modification.
- **created_by**: `ForeignKey` - Lien vers l'utilisateur (`User`) qui a créé le participant.
