# 🚀 Quick Start - EDS Backend

Guide de démarrage rapide pour lancer le backend en 5 minutes.

## ⚡ Installation Rapide

### 1. Prérequis
- Python 3.10+
- PostgreSQL 12+
- pip

### 2. Installation en 5 étapes

```bash
# Étape 1: Créer un environnement virtuel
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Étape 2: Installer les dépendances
pip install -r requirements.txt

# Étape 3: Créer la base de données PostgreSQL
psql -U postgres
CREATE DATABASE "EDS";
\q

# Étape 4: Appliquer les migrations
python manage.py makemigrations
python manage.py migrate

# Étape 5: Initialiser avec des utilisateurs par défaut
python init_db.py
```

### 3. Lancer le serveur

```bash
python manage.py runserver
```

✅ **Le serveur est maintenant accessible sur `http://localhost:8000/`**

---

## 🧪 Lancer les Tests

### Tests automatisés (Django)

```bash
# Tous les tests
python manage.py test authentication

# Avec plus de détails
python manage.py test authentication --verbosity=2

# Ou utiliser le script
python run_tests.py --verbose

# Avec couverture de code
python run_tests.py --coverage
```

### Tests manuels (API)

```bash
# Voir le fichier TEST_API.md pour des commandes curl/PowerShell
```

---

## 🔑 Comptes par Défaut

Après avoir lancé `python init_db.py`, vous aurez:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@eds.sn | admin123 | admin | Administrateur système |
| manager@eds.sn | manager123 | manager | Gestionnaire |
| staff@eds.sn | staff123 | staff | Employé |

---

## 📚 Endpoints API

### Base URL
```
http://localhost:8000/api/auth/
```

### Authentification
- `POST /register/` - Inscription
- `POST /login/` - Connexion
- `POST /logout/` - Déconnexion
- `POST /token/refresh/` - Rafraîchir token
- `GET /me/` - Utilisateur actuel

### CRUD Utilisateurs
- `GET /users/` - Liste
- `POST /users/create/` - Créer
- `GET /users/<id>/` - Détail
- `PATCH /users/<id>/update/` - Modifier
- `DELETE /users/<id>/delete/` - Supprimer

---

## 🧩 Structure du Projet

```
eds_backend/
├── authentication/          # App principale
│   ├── models.py           # Modèle User
│   ├── serializers.py      # Serializers DRF
│   ├── views.py            # Vues API
│   ├── urls.py             # Routes
│   ├── admin.py            # Interface admin
│   └── tests.py            # Tests unitaires
├── eds_backend/            # Configuration
│   ├── settings.py         # Paramètres
│   └── urls.py             # URLs principales
├── requirements.txt        # Dépendances
├── init_db.py             # Init DB
├── run_tests.py           # Lancer tests
├── README.md              # Documentation complète
├── COMMANDS.md            # Commandes utiles
├── TEST_API.md            # Tests manuels
└── QUICK_START.md         # Ce fichier
```

---

## 🔧 Commandes Utiles

```bash
# Créer un superutilisateur
python manage.py createsuperuser

# Accéder au shell Django
python manage.py shell

# Voir les migrations
python manage.py showmigrations

# Collecter les fichiers statiques
python manage.py collectstatic

# Vérifier la config
python manage.py check
```

---

## 🌐 Interface Admin Django

Accédez à l'interface admin sur:
```
http://localhost:8000/admin/
```

Connectez-vous avec le compte admin:
- Email: admin@eds.sn
- Password: admin123

---

## 🔗 Intégration avec React Frontend

### Configuration CORS
Le backend autorise les requêtes depuis:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

### Format des données
Les champs sont en **camelCase** pour correspondre au frontend React:
- `firstName`, `lastName`, `createdAt`, `createdBy`, etc.

### Authentification
Utilisez JWT Bearer tokens:
```
Authorization: Bearer <access_token>
```

---

## 📊 Exemple de Requête

### PowerShell
```powershell
# Login
$body = @{
    email = "admin@eds.sn"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:8000/api/auth/login/" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

# Sauvegarder le token
$token = $response.tokens.access

# Récupérer les utilisateurs
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod `
    -Uri "http://localhost:8000/api/auth/users/" `
    -Method Get `
    -Headers $headers
```

---

## ❓ Dépannage

### Problème de connexion PostgreSQL
```bash
# Vérifier que PostgreSQL est lancé
# Windows: Services -> PostgreSQL

# Tester la connexion
psql -U postgres -d EDS
```

### Port déjà utilisé
```bash
# Lancer sur un autre port
python manage.py runserver 8001
```

### Erreur de migration
```bash
# Supprimer les migrations et recommencer
python manage.py migrate authentication zero
python manage.py makemigrations
python manage.py migrate
```

### Réinitialiser la DB
```bash
# Supprimer toutes les données
python manage.py flush

# Ou recréer la DB
DROP DATABASE "EDS";
CREATE DATABASE "EDS";
python manage.py migrate
python init_db.py
```

---

## 📖 Documentation Complète

Pour plus de détails, consultez:
- **README.md** - Documentation complète de l'API
- **COMMANDS.md** - Liste de toutes les commandes
- **TEST_API.md** - Guide de tests manuels

---

## 🎯 Prochaines Étapes

1. ✅ Backend fonctionnel
2. 🔜 Intégrer avec le frontend React
3. 🔜 Ajouter les modèles (Stages, Participants, Bungalows)
4. 🔜 Implémenter les endpoints pour les stages
5. 🔜 Implémenter les endpoints pour les participants
6. 🔜 Implémenter les endpoints pour les villages

---

## 💡 Conseils

- Utilisez Postman ou Insomnia pour tester l'API
- Activez Django Debug Toolbar en développement
- Consultez les logs pour déboguer
- Gardez la documentation à jour
- Écrivez des tests pour chaque nouvelle fonctionnalité

---

## 📞 Support

Pour toute question:
1. Consultez la documentation
2. Vérifiez les logs Django
3. Testez avec curl/PowerShell
4. Contactez l'équipe de développement

---

**🎉 Vous êtes prêt à développer ! Happy coding! 🚀**




