# 🌐 Accès Réseau au Backend

## Configuration effectuée

Le backend est maintenant configuré pour accepter les connexions depuis n'importe quel ordinateur du réseau local.

### Modifications apportées :

1. **ALLOWED_HOSTS** = `['*']` → Accepte toutes les requêtes
2. **CORS_ALLOW_ALL_ORIGINS** = `True` → Accepte les requêtes CORS de toutes origines

⚠️ **ATTENTION** : Cette configuration est pour le **DÉVELOPPEMENT UNIQUEMENT**. Pour la production, vous devrez spécifier des adresses IP ou domaines précis.

---

## 🚀 Démarrer le serveur pour l'accès réseau

### Option 1 : Accès depuis le réseau local (RECOMMANDÉ)

```bash
python manage.py runserver 0.0.0.0:8000
```

- `0.0.0.0` signifie "écouter sur toutes les interfaces réseau"
- Le serveur sera accessible depuis n'importe quel ordinateur du réseau local

### Option 2 : Accès local uniquement

```bash
python manage.py runserver
```
ou
```bash
python manage.py runserver 127.0.0.1:8000
```

- Accessible uniquement depuis l'ordinateur qui exécute le serveur

---

## 📡 Comment accéder depuis un autre ordinateur

### 1. Trouver l'adresse IP du serveur

**Sur Windows :**
```bash
ipconfig
```
Cherchez "IPv4 Address" (par exemple : `192.168.1.100`)

**Sur Linux/Mac :**
```bash
ifconfig
```
ou
```bash
hostname -I
```

### 2. Configurer le frontend React

Modifiez le fichier `ecole-des-sables-react/src/services/api.ts` :

```typescript
// Au lieu de :
const API_BASE_URL = 'http://localhost:8000';

// Utilisez l'IP du serveur :
const API_BASE_URL = 'http://192.168.1.100:8000';
```

### 3. Démarrer le frontend

```bash
cd ecole-des-sables-react
npm start
```

Le frontend sera accessible sur : `http://<IP_DE_VOTRE_MACHINE>:3000`

---

## 🧪 Tester l'accès réseau

### Depuis un navigateur sur un autre ordinateur :

1. **API Backend :**
   ```
   http://192.168.1.100:8000/api/stages/
   ```

2. **Admin Django :**
   ```
   http://192.168.1.100:8000/admin/
   ```

3. **Frontend React :**
   ```
   http://192.168.1.100:3000
   ```

### Avec curl (depuis un terminal) :

```bash
curl http://192.168.1.100:8000/api/stages/
```

---

## 🔥 Problèmes courants

### Le serveur n'est pas accessible depuis le réseau

**Solution 1 : Vérifier le pare-feu**

**Windows :**
1. Ouvrir "Pare-feu Windows Defender"
2. Cliquer sur "Paramètres avancés"
3. Créer une règle entrante pour le port 8000

**Linux :**
```bash
sudo ufw allow 8000
```

**Solution 2 : Vérifier que le serveur écoute sur 0.0.0.0**

Lorsque vous démarrez le serveur, vous devriez voir :
```
Starting development server at http://0.0.0.0:8000/
```

Si vous voyez `http://127.0.0.1:8000/`, vous n'avez pas utilisé `0.0.0.0`.

### Erreur CORS sur le frontend

Si vous voyez des erreurs CORS dans la console du navigateur :
1. Vérifiez que `CORS_ALLOW_ALL_ORIGINS = True` dans `settings.py`
2. Redémarrez le serveur backend

---

## 🛡️ Pour la production

Avant de déployer en production, **CHANGEZ CES PARAMÈTRES** :

```python
# settings.py

DEBUG = False

ALLOWED_HOSTS = [
    'votre-domaine.com',
    'www.votre-domaine.com',
    '192.168.1.100',  # IP spécifique du serveur
]

CORS_ALLOWED_ORIGINS = [
    "https://votre-domaine.com",
    "https://www.votre-domaine.com",
]

CORS_ALLOW_ALL_ORIGINS = False  # NE PAS utiliser True en production
```

---

## 📝 Exemple complet de démarrage

```bash
# Terminal 1 - Backend
cd eds_backend
python manage.py runserver 0.0.0.0:8000

# Terminal 2 - Frontend
cd ecole-des-sables-react
npm start
```

Maintenant, tous les ordinateurs du réseau local peuvent accéder à :
- **Backend API** : `http://192.168.1.100:8000`
- **Frontend** : `http://192.168.1.100:3000`

Remplacez `192.168.1.100` par l'IP réelle de votre machine.

---

## 🎯 Résumé rapide

1. ✅ Backend configuré pour accepter les connexions réseau
2. 🚀 Démarrer avec `python manage.py runserver 0.0.0.0:8000`
3. 🔍 Trouver votre IP avec `ipconfig` (Windows) ou `ifconfig` (Linux/Mac)
4. 🌐 Accéder depuis le réseau : `http://<VOTRE_IP>:8000`
5. 🔒 N'oubliez pas de sécuriser pour la production !


