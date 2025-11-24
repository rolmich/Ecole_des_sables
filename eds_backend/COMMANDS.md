# Commandes Utiles - EDS Backend

## Installation et Configuration

### 1. Installer les dépendances
```bash
pip install -r requirements.txt
```

### 2. Créer la base de données PostgreSQL
```bash
# Se connecter à PostgreSQL
psql -U postgres

# Dans le prompt PostgreSQL
CREATE DATABASE "EDS";
\q
```

### 3. Appliquer les migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Initialiser la base de données avec des utilisateurs par défaut
```bash
python init_db.py
```

### 5. Créer un superutilisateur (alternatif)
```bash
python manage.py createsuperuser
```

## Développement

### Lancer le serveur de développement
```bash
python manage.py runserver
# ou sur un port spécifique
python manage.py runserver 8000
```

### Lancer le shell Django
```bash
python manage.py shell
```

### Créer une nouvelle app
```bash
python manage.py startapp <app_name>
```

## Base de Données

### Créer des migrations
```bash
python manage.py makemigrations
```

### Appliquer les migrations
```bash
python manage.py migrate
```

### Annuler une migration
```bash
python manage.py migrate <app_name> <migration_number>
# Exemple: python manage.py migrate authentication 0001
```

### Réinitialiser la base de données
```bash
# Windows (PowerShell)
python manage.py flush

# Ou supprimer toutes les migrations et recommencer
# 1. Supprimer les fichiers de migration (sauf __init__.py)
# 2. Supprimer la base de données
# 3. Recréer la base de données
# 4. Créer et appliquer les migrations
```

## Tests

### Lancer tous les tests
```bash
python manage.py test
```

### Tester une app spécifique
```bash
python manage.py test authentication
```

### Tester avec couverture
```bash
coverage run --source='.' manage.py test
coverage report
coverage html
```

## Admin

### Créer un superutilisateur
```bash
python manage.py createsuperuser
```

### Accéder à l'interface admin
```
http://localhost:8000/admin/
```

## Utilisateurs

### Voir la liste des utilisateurs (shell)
```python
python manage.py shell

from authentication.models import User
users = User.objects.all()
for user in users:
    print(f"{user.email} - {user.role}")
```

### Changer le rôle d'un utilisateur
```python
python manage.py shell

from authentication.models import User
user = User.objects.get(email='user@example.com')
user.role = 'admin'
user.save()
```

### Activer/Désactiver un utilisateur
```python
python manage.py shell

from authentication.models import User
user = User.objects.get(email='user@example.com')
user.status = 'active'  # ou 'inactive' ou 'pending'
user.save()
```

## Production

### Collecter les fichiers statiques
```bash
python manage.py collectstatic
```

### Vérifier la configuration
```bash
python manage.py check
python manage.py check --deploy
```

## Debugging

### Activer le mode debug SQL
```python
# Dans settings.py
LOGGING = {
    'version': 1,
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        }
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
        }
    },
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        }
    }
}
```

### Voir les requêtes SQL dans le shell
```python
from django.db import connection
from authentication.models import User

User.objects.all()
print(connection.queries)
```

## Git

### Ignorer les fichiers sensibles
```bash
# Ajouter à .gitignore
*.pyc
__pycache__/
db.sqlite3
.env
venv/
.vscode/
media/
staticfiles/
```

## Dépannage

### Problème de connexion PostgreSQL
```bash
# Vérifier que PostgreSQL est en cours d'exécution
# Windows: Services -> PostgreSQL

# Vérifier la connexion
psql -U postgres -d EDS

# Si erreur de mot de passe, réinitialiser:
# Modifier pg_hba.conf et changer "md5" en "trust"
# Redémarrer PostgreSQL
# Connecter et changer le mot de passe:
ALTER USER postgres PASSWORD 'L@minsi1';
```

### Erreur "no such table"
```bash
python manage.py migrate
```

### Erreur "port already in use"
```bash
# Trouver le processus qui utilise le port 8000
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Ou lancer sur un autre port
python manage.py runserver 8001
```

### Réinitialiser le mot de passe d'un utilisateur
```python
python manage.py shell

from authentication.models import User
user = User.objects.get(email='user@example.com')
user.set_password('newpassword123')
user.save()
```

## API Testing

### Tester avec curl

#### Register
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "password2": "testpass123"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eds.sn",
    "password": "admin123"
  }'
```

#### Get Users (avec token)
```bash
curl -X GET http://localhost:8000/api/auth/users/ \
  -H "Authorization: Bearer <your_access_token>"
```

### Tester avec Postman ou Insomnia
1. Importer les endpoints depuis le README
2. Configurer l'authentification Bearer Token
3. Tester chaque endpoint




