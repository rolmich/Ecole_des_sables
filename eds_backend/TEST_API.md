# Tests Manuels de l'API - EDS Backend

Ce document contient des commandes pour tester manuellement l'API avec curl ou PowerShell.

## 🚀 Avant de Commencer

1. **Lancer le serveur Django :**
   ```bash
   python manage.py runserver
   ```

2. **Initialiser la base de données avec des utilisateurs par défaut :**
   ```bash
   python init_db.py
   ```

## 📝 Variables pour les Tests

```bash
# Base URL
$BASE_URL = "http://localhost:8000/api/auth"

# Tokens (à remplir après login)
$ACCESS_TOKEN = "votre_access_token_ici"
$REFRESH_TOKEN = "votre_refresh_token_ici"
```

## 1️⃣ Tests d'Authentification

### Register (Inscription)

**PowerShell:**
```powershell
$body = @{
    firstName = "Marie"
    lastName = "Dupont"
    email = "marie.dupont@example.com"
    username = "mdupont"
    password = "SecurePass123!"
    password2 = "SecurePass123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register/" -Method Post -Body $body -ContentType "application/json"
```

**Curl (Git Bash/Linux/Mac):**
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Marie",
    "lastName": "Dupont",
    "email": "marie.dupont@example.com",
    "username": "mdupont",
    "password": "SecurePass123!",
    "password2": "SecurePass123!"
  }'
```

**✅ Résultat attendu:**
- Status: 201 Created
- Retourne: user, tokens (access + refresh), message

---

### Login (Connexion)

**PowerShell:**
```powershell
$body = @{
    email = "admin@eds.sn"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login/" -Method Post -Body $body -ContentType "application/json"

# Sauvegarder les tokens
$ACCESS_TOKEN = $response.tokens.access
$REFRESH_TOKEN = $response.tokens.refresh

Write-Host "Access Token: $ACCESS_TOKEN"
Write-Host "User: $($response.user.firstName) $($response.user.lastName)"
```

**Curl:**
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eds.sn",
    "password": "admin123"
  }'
```

**✅ Résultat attendu:**
- Status: 200 OK
- Retourne: user, tokens, message
- lastLogin mis à jour

---

### Get Current User

**PowerShell:**
```powershell
$headers = @{
    Authorization = "Bearer $ACCESS_TOKEN"
}

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/me/" -Method Get -Headers $headers
```

**Curl:**
```bash
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Résultat attendu:**
- Status: 200 OK
- Retourne: informations complètes de l'utilisateur connecté

---

### Refresh Token

**PowerShell:**
```powershell
$body = @{
    refresh = $REFRESH_TOKEN
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/token/refresh/" -Method Post -Body $body -ContentType "application/json"

# Mettre à jour les tokens
$ACCESS_TOKEN = $response.access
$REFRESH_TOKEN = $response.refresh
```

**Curl:**
```bash
curl -X POST http://localhost:8000/api/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "YOUR_REFRESH_TOKEN"
  }'
```

**✅ Résultat attendu:**
- Status: 200 OK
- Retourne: nouveaux access et refresh tokens

---

### Logout (Déconnexion)

**PowerShell:**
```powershell
$headers = @{
    Authorization = "Bearer $ACCESS_TOKEN"
}

$body = @{
    refresh = $REFRESH_TOKEN
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/logout/" -Method Post -Headers $headers -Body $body -ContentType "application/json"
```

**Curl:**
```bash
curl -X POST http://localhost:8000/api/auth/logout/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "YOUR_REFRESH_TOKEN"
  }'
```

**✅ Résultat attendu:**
- Status: 200 OK
- Message de confirmation
- Token blacklisté

---

## 2️⃣ Tests CRUD Utilisateurs

### List Users (Tous les utilisateurs)

**PowerShell:**
```powershell
$headers = @{
    Authorization = "Bearer $ACCESS_TOKEN"
}

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/" -Method Get -Headers $headers
```

**Curl:**
```bash
curl -X GET http://localhost:8000/api/auth/users/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Résultat attendu:**
- Status: 200 OK
- Liste paginée d'utilisateurs

---

### List Users avec Filtres

**Filtrer par rôle (admin):**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/?role=admin" -Method Get -Headers $headers
```

**Filtrer par statut (active):**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/?status=active" -Method Get -Headers $headers
```

**Rechercher (search):**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/?search=marie" -Method Get -Headers $headers
```

**Combiner les filtres:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/?role=manager&status=active" -Method Get -Headers $headers
```

---

### Create User

**PowerShell:**
```powershell
$headers = @{
    Authorization = "Bearer $ACCESS_TOKEN"
}

$body = @{
    firstName = "Jean"
    lastName = "Martin"
    email = "jean.martin@eds.sn"
    username = "jmartin"
    password = "JeanPass123!"
    phone = "+221 77 234 56 78"
    role = "staff"
    department = "Finance"
    permissions = @("view_reports", "edit_reports")
    status = "active"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/create/" -Method Post -Headers $headers -Body $body -ContentType "application/json"
```

**Curl:**
```bash
curl -X POST http://localhost:8000/api/auth/users/create/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jean",
    "lastName": "Martin",
    "email": "jean.martin@eds.sn",
    "username": "jmartin",
    "password": "JeanPass123!",
    "phone": "+221 77 234 56 78",
    "role": "staff",
    "department": "Finance",
    "permissions": ["view_reports", "edit_reports"],
    "status": "active"
  }'
```

**✅ Résultat attendu:**
- Status: 201 Created
- Retourne: utilisateur créé avec createdBy = nom de l'admin

---

### Get User Detail

**PowerShell:**
```powershell
$userId = 1  # Remplacer par l'ID réel

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/$userId/" -Method Get -Headers $headers
```

**Curl:**
```bash
curl -X GET http://localhost:8000/api/auth/users/1/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Update User

**PowerShell:**
```powershell
$userId = 2  # Remplacer par l'ID réel

$body = @{
    phone = "+221 77 999 88 77"
    department = "Direction"
    role = "manager"
    status = "active"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/$userId/update/" -Method Patch -Headers $headers -Body $body -ContentType "application/json"
```

**Curl:**
```bash
curl -X PATCH http://localhost:8000/api/auth/users/2/update/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+221 77 999 88 77",
    "department": "Direction",
    "role": "manager",
    "status": "active"
  }'
```

**✅ Résultat attendu:**
- Status: 200 OK
- Retourne: utilisateur mis à jour

---

### Delete User

**PowerShell:**
```powershell
$userId = 2  # Remplacer par l'ID réel

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/$userId/delete/" -Method Delete -Headers $headers
```

**Curl:**
```bash
curl -X DELETE http://localhost:8000/api/auth/users/2/delete/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Résultat attendu:**
- Status: 200 OK
- Message de confirmation

---

## 3️⃣ Tests d'Erreurs

### Login avec mauvais mot de passe

```powershell
$body = @{
    email = "admin@eds.sn"
    password = "wrongpassword"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login/" -Method Post -Body $body -ContentType "application/json"
} catch {
    Write-Host "❌ Erreur attendue: $($_.Exception.Message)"
}
```

**✅ Résultat attendu:**
- Status: 400 Bad Request
- Message d'erreur

---

### Accès non autorisé (sans token)

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/auth/me/" -Method Get
} catch {
    Write-Host "❌ Erreur attendue: $($_.Exception.Message)"
}
```

**✅ Résultat attendu:**
- Status: 401 Unauthorized

---

### Créer un utilisateur avec email existant

```powershell
$body = @{
    firstName = "Test"
    lastName = "User"
    email = "admin@eds.sn"  # Email déjà utilisé
    username = "testuser"
    password = "TestPass123!"
    password2 = "TestPass123!"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register/" -Method Post -Body $body -ContentType "application/json"
} catch {
    Write-Host "❌ Erreur attendue: $($_.Exception.Message)"
}
```

**✅ Résultat attendu:**
- Status: 400 Bad Request
- Message d'erreur sur l'email

---

## 4️⃣ Tests de Permissions

### Staff essaye de supprimer un utilisateur

```powershell
# 1. Se connecter en tant que staff
$body = @{
    email = "staff@eds.sn"
    password = "staff123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login/" -Method Post -Body $body -ContentType "application/json"
$staffToken = $response.tokens.access

# 2. Essayer de supprimer un utilisateur
$headers = @{
    Authorization = "Bearer $staffToken"
}

try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/1/delete/" -Method Delete -Headers $headers
} catch {
    Write-Host "❌ Accès refusé (attendu): $($_.Exception.Message)"
}
```

**✅ Résultat attendu:**
- Status: 403 Forbidden ou 401 Unauthorized
- Message d'erreur de permissions

---

## 📊 Script de Test Complet

**PowerShell - Test complet automatisé:**

```powershell
# test_api.ps1
$BASE_URL = "http://localhost:8000/api/auth"

Write-Host "🧪 Tests de l'API EDS Backend" -ForegroundColor Cyan
Write-Host "==============================`n" -ForegroundColor Cyan

# Test 1: Login Admin
Write-Host "1️⃣ Test Login Admin..." -ForegroundColor Yellow
$body = @{
    email = "admin@eds.sn"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/login/" -Method Post -Body $body -ContentType "application/json"
    $ACCESS_TOKEN = $response.tokens.access
    Write-Host "✅ Login réussi: $($response.user.firstName) $($response.user.lastName)`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Échec du login`n" -ForegroundColor Red
    exit
}

# Test 2: Get Current User
Write-Host "2️⃣ Test Get Current User..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $ACCESS_TOKEN"
}

try {
    $user = Invoke-RestMethod -Uri "$BASE_URL/me/" -Method Get -Headers $headers
    Write-Host "✅ Utilisateur récupéré: $($user.email)`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Échec de récupération`n" -ForegroundColor Red
}

# Test 3: List Users
Write-Host "3️⃣ Test List Users..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$BASE_URL/users/" -Method Get -Headers $headers
    Write-Host "✅ $($users.count) utilisateurs trouvés`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Échec de récupération de la liste`n" -ForegroundColor Red
}

# Test 4: Create User
Write-Host "4️⃣ Test Create User..." -ForegroundColor Yellow
$body = @{
    firstName = "Test"
    lastName = "API"
    email = "test.api@example.com"
    username = "testapi"
    password = "TestAPI123!"
    role = "staff"
    status = "active"
} | ConvertTo-Json

try {
    $newUser = Invoke-RestMethod -Uri "$BASE_URL/users/create/" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "✅ Utilisateur créé: $($newUser.email) (ID: $($newUser.id))`n" -ForegroundColor Green
    
    # Test 5: Delete User
    Write-Host "5️⃣ Test Delete User..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "$BASE_URL/users/$($newUser.id)/delete/" -Method Delete -Headers $headers
    Write-Host "✅ Utilisateur supprimé`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Échec de création ou suppression`n" -ForegroundColor Red
}

Write-Host "`n✨ Tests terminés!" -ForegroundColor Cyan
```

**Lancer le script:**
```powershell
.\test_api.ps1
```

---

## 🎯 Checklist de Tests

- [ ] Register avec données valides
- [ ] Register avec mots de passe différents (erreur attendue)
- [ ] Login avec identifiants valides
- [ ] Login avec mauvais mot de passe (erreur attendue)
- [ ] Get current user avec token valide
- [ ] Get current user sans token (erreur attendue)
- [ ] Refresh token
- [ ] Logout
- [ ] List users
- [ ] List users avec filtres (role, status, search)
- [ ] Create user
- [ ] Get user detail
- [ ] Update user
- [ ] Delete user
- [ ] Test permissions (staff vs admin)
- [ ] Token expiré (erreur attendue)

---

## 📝 Notes

- Remplacez `YOUR_ACCESS_TOKEN` par le token obtenu lors du login
- Les tokens expirent après 1 heure (access) et 7 jours (refresh)
- Utilisez le refresh token pour obtenir un nouveau access token
- Les endpoints nécessitent l'authentification JWT sauf register, login et refresh




