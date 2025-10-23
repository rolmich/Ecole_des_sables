# Test API Script for EDS Backend
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "       Tests de l'API EDS Backend" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://localhost:8000/api/auth"
$testsPassed = 0
$testsFailed = 0

# Test 1: Login
Write-Host "Test 1: Login Admin" -ForegroundColor Yellow
$body = @{
    email = "admin@eds.sn"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/login/" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    $ACCESS_TOKEN = $response.tokens.access
    Write-Host "  [PASSED] Login reussi" -ForegroundColor Green
    Write-Host "  - Utilisateur: $($response.user.firstName) $($response.user.lastName)" -ForegroundColor Gray
    Write-Host "  - Role: $($response.user.role)" -ForegroundColor Gray
    Write-Host "  - Email: $($response.user.email)" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "  [FAILED] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
    exit
}

Write-Host ""

# Test 2: Get Current User
Write-Host "Test 2: Get Current User" -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $ACCESS_TOKEN"
}

try {
    $user = Invoke-RestMethod -Uri "$BASE_URL/me/" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "  [PASSED] Utilisateur recupere" -ForegroundColor Green
    Write-Host "  - Email: $($user.email)" -ForegroundColor Gray
    Write-Host "  - Department: $($user.department)" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "  [FAILED] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""

# Test 3: List Users
Write-Host "Test 3: List Users" -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$BASE_URL/users/" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "  [PASSED] Liste recuperee" -ForegroundColor Green
    Write-Host "  - Total: $($users.count) utilisateurs" -ForegroundColor Gray
    Write-Host "  - Page size: $($users.results.Count)" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "  [FAILED] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""

# Test 4: Create User
Write-Host "Test 4: Create User" -ForegroundColor Yellow
$newUserBody = @{
    firstName = "Test"
    lastName = "API"
    email = "test.api@eds.sn"
    username = "testapi"
    password = "TestAPI123!"
    role = "staff"
    department = "Test"
    permissions = @("view_users")
    status = "active"
} | ConvertTo-Json

try {
    $newUser = Invoke-RestMethod -Uri "$BASE_URL/users/create/" -Method Post -Headers $headers -Body $newUserBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "  [PASSED] Utilisateur cree" -ForegroundColor Green
    Write-Host "  - ID: $($newUser.id)" -ForegroundColor Gray
    Write-Host "  - Email: $($newUser.email)" -ForegroundColor Gray
    Write-Host "  - Cree par: $($newUser.createdBy)" -ForegroundColor Gray
    $userId = $newUser.id
    $testsPassed++
} catch {
    Write-Host "  [FAILED] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""

# Test 5: Get User Detail
if ($userId) {
    Write-Host "Test 5: Get User Detail" -ForegroundColor Yellow
    try {
        $userDetail = Invoke-RestMethod -Uri "$BASE_URL/users/$userId/" -Method Get -Headers $headers -ErrorAction Stop
        Write-Host "  [PASSED] Detail recupere" -ForegroundColor Green
        Write-Host "  - Nom: $($userDetail.firstName) $($userDetail.lastName)" -ForegroundColor Gray
        $testsPassed++
    } catch {
        Write-Host "  [FAILED] $($_.Exception.Message)" -ForegroundColor Red
        $testsFailed++
    }
    Write-Host ""
}

# Test 6: Update User
if ($userId) {
    Write-Host "Test 6: Update User" -ForegroundColor Yellow
    $updateBody = @{
        phone = "+221 77 999 88 77"
        department = "IT"
    } | ConvertTo-Json

    try {
        $updatedUser = Invoke-RestMethod -Uri "$BASE_URL/users/$userId/update/" -Method Patch -Headers $headers -Body $updateBody -ContentType "application/json" -ErrorAction Stop
        Write-Host "  [PASSED] Utilisateur modifie" -ForegroundColor Green
        Write-Host "  - Telephone: $($updatedUser.phone)" -ForegroundColor Gray
        Write-Host "  - Department: $($updatedUser.department)" -ForegroundColor Gray
        $testsPassed++
    } catch {
        Write-Host "  [FAILED] $($_.Exception.Message)" -ForegroundColor Red
        $testsFailed++
    }
    Write-Host ""
}

# Test 7: Filter Users by Role
Write-Host "Test 7: Filter Users by Role (admin)" -ForegroundColor Yellow
try {
    $adminUsers = Invoke-RestMethod -Uri "$BASE_URL/users/?role=admin" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "  [PASSED] Filtrage reussi" -ForegroundColor Green
    Write-Host "  - Admins trouves: $($adminUsers.results.Count)" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "  [FAILED] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""

# Test 8: Delete User
if ($userId) {
    Write-Host "Test 8: Delete User" -ForegroundColor Yellow
    try {
        $deleteResponse = Invoke-RestMethod -Uri "$BASE_URL/users/$userId/delete/" -Method Delete -Headers $headers -ErrorAction Stop
        Write-Host "  [PASSED] Utilisateur supprime" -ForegroundColor Green
        Write-Host "  - Message: $($deleteResponse.message)" -ForegroundColor Gray
        $testsPassed++
    } catch {
        Write-Host "  [FAILED] $($_.Exception.Message)" -ForegroundColor Red
        $testsFailed++
    }
    Write-Host ""
}

# Test 9: Register New User
Write-Host "Test 9: Register New User" -ForegroundColor Yellow
$registerBody = @{
    firstName = "Nouveau"
    lastName = "Utilisateur"
    email = "nouveau@eds.sn"
    username = "nouveau"
    password = "Nouveau123!"
    password2 = "Nouveau123!"
} | ConvertTo-Json

try {
    $registered = Invoke-RestMethod -Uri "$BASE_URL/register/" -Method Post -Body $registerBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "  [PASSED] Inscription reussie" -ForegroundColor Green
    Write-Host "  - Email: $($registered.user.email)" -ForegroundColor Gray
    Write-Host "  - Status: $($registered.user.status)" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "  [FAILED] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""

# Summary
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "                    RESULTATS" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Tests reussis: $testsPassed" -ForegroundColor Green
Write-Host "Tests echoues: $testsFailed" -ForegroundColor $(if ($testsFailed -gt 0) { "Red" } else { "Green" })
Write-Host "Total: $($testsPassed + $testsFailed)" -ForegroundColor Cyan
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "Tous les tests sont passes avec succes!" -ForegroundColor Green
} else {
    Write-Host "Certains tests ont echoue." -ForegroundColor Red
}

Write-Host "==============================================================" -ForegroundColor Cyan



