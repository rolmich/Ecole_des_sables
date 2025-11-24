# Ecole des Sables - Backend API

Backend Django REST API pour le système de gestion de l'École des Sables.

## 🚀 Démarrage Rapide

### Prérequis

- Python 3.10+
- PostgreSQL 12+
- pip

### Installation

1. **Créer un environnement virtuel**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

2. **Installer les dépendances**
   ```bash
   pip install -r requirements.txt
   ```

3. **Créer la base de données PostgreSQL**
   ```sql
   -- Se connecter à PostgreSQL
   psql -U postgres
   
   -- Créer la base de données
   CREATE DATABASE "EDS";
   ```

4. **Appliquer les migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Créer un superutilisateur**
   ```bash
   python manage.py createsuperuser
   ```

6. **Lancer le serveur**
   ```bash
   python manage.py runserver
   ```

Le serveur sera accessible sur `http://localhost:8000/`

## 📚 Documentation API

### Base URL
```
http://localhost:8000/api/auth/
```

### Endpoints d'Authentification

#### 1. Register (Inscription)
```http
POST /api/auth/register/
Content-Type: application/json

{
  "firstName": "Marie",
  "lastName": "Dubois",
  "email": "marie.dubois@example.com",
  "username": "mdubois",
  "password": "securePassword123",
  "password2": "securePassword123"
}
```

**Réponse (201 Created):**
```json
{
  "user": {
    "id": 1,
    "firstName": "Marie",
    "lastName": "Dubois",
    "email": "marie.dubois@example.com",
    "username": "mdubois",
    "phone": null,
    "role": "staff",
    "department": null,
    "permissions": [],
    "status": "pending",
    "lastLogin": null,
    "createdAt": "2025-10-09T10:30:00Z",
    "createdBy": "System"
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  },
  "message": "User registered successfully"
}
```

#### 2. Login (Connexion)
```http
POST /api/auth/login/
Content-Type: application/json

{
  "email": "marie.dubois@example.com",
  "password": "securePassword123"
}
```

**Réponse (200 OK):**
```json
{
  "user": {
    "id": 1,
    "firstName": "Marie",
    "lastName": "Dubois",
    "email": "marie.dubois@example.com",
    "username": "mdubois",
    "phone": null,
    "role": "staff",
    "department": null,
    "permissions": [],
    "status": "active",
    "lastLogin": "2025-10-09T10:35:00Z",
    "createdAt": "2025-10-09T10:30:00Z",
    "createdBy": "System"
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  },
  "message": "Login successful"
}
```

#### 3. Logout (Déconnexion)
```http
POST /api/auth/logout/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Réponse (200 OK):**
```json
{
  "message": "Logout successful"
}
```

#### 4. Refresh Token
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Réponse (200 OK):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### 5. Current User (Utilisateur actuel)
```http
GET /api/auth/me/
Authorization: Bearer <access_token>
```

**Réponse (200 OK):**
```json
{
  "id": 1,
  "firstName": "Marie",
  "lastName": "Dubois",
  "email": "marie.dubois@example.com",
  "username": "mdubois",
  "phone": "+221 77 123 45 67",
  "role": "manager",
  "department": "Administration",
  "permissions": ["view_users", "edit_users"],
  "status": "active",
  "lastLogin": "2025-10-09T10:35:00Z",
  "createdAt": "2025-10-09T10:30:00Z",
  "createdBy": "System"
}
```

### Endpoints CRUD Utilisateurs

#### 1. List Users (Liste des utilisateurs)
```http
GET /api/auth/users/
Authorization: Bearer <access_token>

# Avec filtres
GET /api/auth/users/?role=admin&status=active&search=marie
```

**Réponse (200 OK):**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/auth/users/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "firstName": "Marie",
      "lastName": "Dubois",
      ...
    }
  ]
}
```

#### 2. Create User (Créer un utilisateur)
```http
POST /api/auth/users/create/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Jean",
  "lastName": "Martin",
  "email": "jean.martin@example.com",
  "username": "jmartin",
  "password": "securePassword123",
  "phone": "+221 77 234 56 78",
  "role": "staff",
  "department": "Finance",
  "permissions": ["view_reports"],
  "status": "active"
}
```

**Réponse (201 Created):**
```json
{
  "id": 2,
  "firstName": "Jean",
  "lastName": "Martin",
  "email": "jean.martin@example.com",
  "username": "jmartin",
  "phone": "+221 77 234 56 78",
  "role": "staff",
  "department": "Finance",
  "permissions": ["view_reports"],
  "status": "active",
  "lastLogin": null,
  "createdAt": "2025-10-09T11:00:00Z",
  "createdBy": "Marie Dubois"
}
```

#### 3. Get User Detail (Détail d'un utilisateur)
```http
GET /api/auth/users/1/
Authorization: Bearer <access_token>
```

#### 4. Update User (Modifier un utilisateur)
```http
PATCH /api/auth/users/1/update/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "phone": "+221 77 999 88 77",
  "department": "Direction",
  "role": "admin",
  "status": "active"
}
```

**Réponse (200 OK):**
```json
{
  "id": 1,
  "firstName": "Marie",
  "lastName": "Dubois",
  "email": "marie.dubois@example.com",
  "username": "mdubois",
  "phone": "+221 77 999 88 77",
  "role": "admin",
  "department": "Direction",
  "permissions": ["view_users", "edit_users"],
  "status": "active",
  "lastLogin": "2025-10-09T10:35:00Z",
  "createdAt": "2025-10-09T10:30:00Z",
  "createdBy": "System"
}
```

#### 5. Delete User (Supprimer un utilisateur)
```http
DELETE /api/auth/users/2/delete/
Authorization: Bearer <access_token>
```

**Réponse (200 OK):**
```json
{
  "message": "User deleted successfully"
}
```

## 🔐 Authentification

Toutes les requêtes (sauf register, login, refresh) nécessitent un token JWT dans le header :

```http
Authorization: Bearer <access_token>
```

### Tokens JWT

- **Access Token**: Expire après 1 heure
- **Refresh Token**: Expire après 7 jours
- Les refresh tokens sont automatiquement tournés et blacklistés après utilisation

## 📊 Modèle de Données

### User Model

| Champ | Type | Description |
|-------|------|-------------|
| id | Integer | Identifiant unique |
| firstName | String | Prénom |
| lastName | String | Nom |
| email | String | Email (unique) |
| username | String | Nom d'utilisateur (unique) |
| phone | String | Numéro de téléphone (optionnel) |
| role | String | Rôle (admin, manager, staff) |
| department | String | Département (optionnel) |
| permissions | Array | Liste des permissions |
| status | String | Statut (active, inactive, pending) |
| lastLogin | DateTime | Dernière connexion |
| createdAt | DateTime | Date de création |
| createdBy | String | Créé par |

## 🛠️ Technologies

- **Django 4.2.7**: Framework web Python
- **Django REST Framework 3.14.0**: API REST
- **Simple JWT 5.3.0**: Authentification JWT
- **PostgreSQL**: Base de données
- **CORS Headers**: Gestion CORS pour React

## 📝 Configuration

### Base de données
- **Nom**: EDS
- **Utilisateur**: postgres
- **Mot de passe**: L@minsi1
- **Host**: localhost
- **Port**: 5432

### CORS
Le backend autorise les requêtes depuis :
- `http://localhost:3000`
- `http://127.0.0.1:3000`

## 🧪 Tests

```bash
python manage.py test authentication
```

## 📦 Structure du Projet

```
eds_backend/
├── authentication/          # App d'authentification
│   ├── models.py           # Modèle User
│   ├── serializers.py      # Serializers DRF
│   ├── views.py            # Vues API
│   ├── urls.py             # URLs de l'app
│   └── admin.py            # Configuration admin
├── eds_backend/            # Configuration Django
│   ├── settings.py         # Paramètres du projet
│   └── urls.py             # URLs principales
├── manage.py
└── requirements.txt
```

## 🚨 Gestion des Erreurs

### Codes d'erreur HTTP

- **400 Bad Request**: Données invalides
- **401 Unauthorized**: Token manquant ou invalide
- **403 Forbidden**: Permissions insuffisantes
- **404 Not Found**: Ressource non trouvée
- **500 Internal Server Error**: Erreur serveur

### Format des erreurs

```json
{
  "error": "Message d'erreur détaillé"
}
```

## 🔒 Sécurité

- Mots de passe hashés avec PBKDF2
- Validation des mots de passe (minimum 8 caractères)
- JWT avec expiration automatique
- Token blacklisting après logout
- CORS configuré pour autoriser uniquement le frontend React
- Protection CSRF activée

## 📞 Support

Pour toute question ou problème, veuillez contacter l'équipe de développement.




