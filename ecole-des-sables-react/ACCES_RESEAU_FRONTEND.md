# 🌐 Configuration Accès Réseau - Frontend React

## Problème résolu

Le frontend React n'était **pas accessible depuis l'IP réseau sur la machine hôte** (`http://10.18.164.6:3000`), mais fonctionnait sur les autres machines.

**Cause** : Le serveur de développement React écoute par défaut uniquement sur `localhost` (127.0.0.1), pas sur toutes les interfaces réseau.

**Solution** : Configurer React pour écouter sur `0.0.0.0` (toutes les interfaces).

---

## ✅ Solutions disponibles

### **Solution 1 : Utiliser le script PowerShell (RECOMMANDÉ)**

```powershell
cd ecole-des-sables-react
.\start_network.ps1
```

Ce script :
- Configure automatiquement `HOST=0.0.0.0`
- Affiche votre IP réseau
- Démarre le serveur React

---

### **Solution 2 : Utiliser la commande npm modifiée**

**Windows (PowerShell) :**
```powershell
cd ecole-des-sables-react
$env:HOST="0.0.0.0"; npm start
```

**Windows (CMD) :**
```cmd
cd ecole-des-sables-react
set HOST=0.0.0.0 && npm start
```

**Linux/Mac :**
```bash
cd ecole-des-sables-react
HOST=0.0.0.0 npm start
```

---

### **Solution 3 : Utiliser le script npm ajouté**

```powershell
cd ecole-des-sables-react
npm run start:network
```

---

## 🎯 Après le démarrage

Le frontend sera maintenant accessible sur **toutes ces URLs** :

### **Depuis la machine hôte (10.18.164.6) :**
- ✅ http://localhost:3000
- ✅ http://127.0.0.1:3000
- ✅ http://10.18.164.6:3000

### **Depuis les autres machines du réseau :**
- ✅ http://10.18.164.6:3000

---

## 🔍 Vérification

Après avoir démarré avec `HOST=0.0.0.0`, vous devriez voir dans le terminal :

```
Compiled successfully!

You can now view ecole-des-sables-react in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://10.18.164.6:3000
```

La ligne **"On Your Network"** confirme que le serveur écoute sur l'IP réseau !

---

## 🚀 Démarrage complet de l'application

### **Terminal 1 - Backend :**
```powershell
cd eds_backend
python manage.py runserver 0.0.0.0:8000
```

### **Terminal 2 - Frontend :**
```powershell
cd ecole-des-sables-react
.\start_network.ps1
```

OU

```powershell
cd ecole-des-sables-react
$env:HOST="0.0.0.0"; npm start
```

---

## 📝 Notes importantes

### **Fichier .env.local créé**

Un fichier `.env.local` a été créé avec :
```
HOST=0.0.0.0
PORT=3000
BROWSER=none
```

Ce fichier est automatiquement chargé par React et configure le serveur pour écouter sur toutes les interfaces.

### **Si .env.local ne fonctionne pas**

Utilisez plutôt la variable d'environnement directement :
```powershell
$env:HOST="0.0.0.0"; npm start
```

---

## 🔥 Dépannage

### Le frontend n'est toujours pas accessible sur 10.18.164.6 depuis l'hôte

**1. Vérifiez que HOST=0.0.0.0 est bien appliqué :**

Dans le terminal où vous démarrez React, vous DEVEZ voir :
```
On Your Network:  http://10.18.164.6:3000
```

Si vous ne voyez que `Local: http://localhost:3000`, alors `HOST=0.0.0.0` n'est pas appliqué.

**2. Redémarrez complètement le serveur React :**
```powershell
# Arrêter avec Ctrl+C
# Puis redémarrer avec :
$env:HOST="0.0.0.0"; npm start
```

**3. Vérifiez le pare-feu Windows :**
```powershell
# En tant qu'administrateur
netsh advfirewall firewall add rule name="React Dev Server" dir=in action=allow protocol=TCP localport=3000
```

**4. Testez depuis un autre navigateur ou en navigation privée**

Parfois le cache du navigateur peut causer des problèmes.

---

## ✅ Configuration finale

Avec cette configuration, votre application est maintenant **entièrement accessible sur le réseau** :

| Service | URL sur le réseau | URL en local |
|---------|-------------------|--------------|
| **Frontend** | http://10.18.164.6:3000 | http://localhost:3000 |
| **Backend API** | http://10.18.164.6:8000 | http://localhost:8000 |
| **Admin Django** | http://10.18.164.6:8000/admin/ | http://localhost:8000/admin/ |

Tout fonctionne maintenant depuis n'importe quelle machine du réseau, **y compris l'hôte** ! 🎉



