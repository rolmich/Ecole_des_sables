# Intégration Backend - Frontend React

## 🔗 Connexion avec le Backend Django

Le frontend React est maintenant connecté au backend Django via une API REST.

### Base URL
```
http://localhost:8000/api
```

## 🔑 Authentification

### Login
```typescript
import authService from './services/authService';

// Connexion
const user = await authService.login('admin@eds.sn', 'admin123');

// Les tokens JWT sont automatiquement sauvegardés dans localStorage
```

### Tokens JWT
- **Access Token** : Stocké dans `localStorage.getItem('access_token')`
- **Refresh Token** : Stocké dans `localStorage.getItem('refresh_token')`
- **User** : Stocké dans `localStorage.getItem('current_user')`

### Rafraîchissement Automatique
Le service API rafraîchit automatiquement le token d'accès quand il expire (401).

## 📡 Services API

### AuthService (`src/services/authService.ts`)
```typescript
// Login
await authService.login(email, password);

// Register  
await authService.register(userData);

// Logout
await authService.logout();

// Get current user
const user = await authService.getCurrentUser();

// Check auth
const isAuth = authService.isAuthenticated();
```

### DataService (`src/services/dataService.ts`)
```typescript
// Get users
const users = await dataService.getUsers();

// Get users with filters
const users = await dataService.getUsers({
  role: 'admin',
  status: 'active',
  search: 'marie'
});

// Create user
const newUser = await dataService.addUser(userData);

// Update user
const updated = await dataService.updateUser(id, updates);

// Delete user
await dataService.deleteUser(id);
```

## 🎯 Composants Intégrés

### Login (`src/components/Login.tsx`)
- ✅ Connexion avec email/password
- ✅ Gestion des erreurs
- ✅ Loading state
- ✅ Redirection automatique

### Users (`src/components/Users.tsx`)
- ✅ Liste des utilisateurs depuis l'API
- ✅ Création d'utilisateur
- ✅ Modification d'utilisateur
- ✅ Suppression d'utilisateur
- ✅ Filtrage (role, status, search)
- ✅ Alerts pour feedback utilisateur
- ✅ Loading states

## 🚀 Démarrage

### 1. Backend Django
```bash
cd eds_backend
python manage.py runserver
```

### 2. Frontend React
```bash
cd ecole-des-sables-react
npm start
```

## 🔐 Comptes de Test

| Email | Password | Role |
|-------|----------|------|
| admin@eds.sn | admin123 | admin |
| manager@eds.sn | manager123 | manager |
| staff@eds.sn | staff123 | staff |

## 📋 Endpoints Utilisés

### Authentification
- `POST /api/auth/login/` - Connexion
- `POST /api/auth/register/` - Inscription
- `POST /api/auth/logout/` - Déconnexion
- `POST /api/auth/token/refresh/` - Rafraîchir token
- `GET /api/auth/me/` - Utilisateur actuel

### Utilisateurs (CRUD)
- `GET /api/auth/users/` - Liste
- `POST /api/auth/users/create/` - Créer
- `GET /api/auth/users/{id}/` - Détail
- `PATCH /api/auth/users/{id}/update/` - Modifier
- `DELETE /api/auth/users/{id}/delete/` - Supprimer

## ⚠️ Gestion des Erreurs

### Erreurs API
```typescript
try {
  const user = await dataService.addUser(data);
} catch (error: any) {
  // error.message contient le message d'erreur
  console.error(error.message);
}
```

### Erreurs d'Authentification
- Token expiré (401) : Rafraîchissement automatique
- Token invalide : Redirection vers /login
- Échec refresh : Déconnexion automatique

## 🎨 States de Chargement

### Loading Indicators
```typescript
const [loading, setLoading] = useState(false);

// Pendant les requêtes
{loading && (
  <div>
    <i className="fas fa-spinner fa-spin"></i>
    Chargement...
  </div>
)}
```

### Alerts
```typescript
const [alert, setAlert] = useState<{
  type: 'success' | 'error' | 'warning',
  message: string
} | null>(null);

showAlert('success', 'Utilisateur créé');
```

## 🔄 Workflow de Connexion

1. Utilisateur entre email/password
2. Frontend envoie `POST /api/auth/login/`
3. Backend valide et retourne tokens + user
4. Frontend sauvegarde tokens dans localStorage
5. Frontend redirige vers /dashboard
6. Toutes les requêtes suivantes incluent le token JWT

## 🔒 Sécurité

### CORS
Backend configuré pour accepter:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

### Headers
Toutes les requêtes authentifiées incluent:
```
Authorization: Bearer {access_token}
```

### Tokens
- Access token expire après 1 heure
- Refresh token expire après 7 jours
- Rafraîchissement automatique géré par `api.ts`

## 📝 Format des Données

### User (Backend → Frontend)
```json
{
  "id": 1,
  "firstName": "Marie",
  "lastName": "Dubois",
  "email": "marie@eds.sn",
  "username": "mdubois",
  "phone": "+221 77 123 45 67",
  "role": "manager",
  "department": "Administration",
  "permissions": ["view_users", "edit_users"],
  "status": "active",
  "lastLogin": "2025-10-09T10:30:00Z",
  "createdAt": "2025-10-09T08:00:00Z",
  "createdBy": "Admin EDS"
}
```

### Login Response
```json
{
  "user": { ...User },
  "tokens": {
    "access": "eyJ0eXAiOiJKV1Q...",
    "refresh": "eyJ0eXAiOiJKV1Q..."
  },
  "message": "Login successful"
}
```

## 🐛 Debugging

### Vérifier les tokens
```javascript
localStorage.getItem('access_token');
localStorage.getItem('refresh_token');
localStorage.getItem('current_user');
```

### Vérifier la connexion backend
```bash
curl http://localhost:8000/api/auth/users/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Console Browser
Le service API log les erreurs dans la console :
```
Error refreshing token: ...
Erreur lors de la récupération des utilisateurs: ...
```

## ✨ Prochaines Étapes

- [ ] Intégrer les Stages avec le backend
- [ ] Intégrer les Participants avec le backend
- [ ] Intégrer les Villages avec le backend
- [ ] Intégrer les Assignments avec le backend
- [ ] Ajouter pagination pour les listes
- [ ] Ajouter websockets pour temps réel
- [ ] Ajouter upload de fichiers (photos)

## 📞 Support

Pour toute question sur l'intégration :
1. Vérifier que le backend tourne sur le port 8000
2. Vérifier les tokens dans localStorage
3. Vérifier la console browser pour les erreurs
4. Vérifier les logs Django backend



