# Script PowerShell pour démarrer le frontend React avec accès réseau
# Utilisation: .\start_network.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Démarrage du Frontend React (Réseau)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Définir la variable d'environnement
$env:HOST = "0.0.0.0"
$env:PORT = "3000"
$env:BROWSER = "none"

# Afficher l'adresse IP locale
Write-Host "🔍 Recherche de votre adresse IP..." -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*","Ethernet*" | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1).IPAddress

if ($ip) {
    Write-Host "✅ Votre adresse IP locale: " -NoNewline -ForegroundColor Green
    Write-Host "$ip" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 Le frontend sera accessible sur:" -ForegroundColor Cyan
    Write-Host "   http://localhost:3000" -ForegroundColor White
    Write-Host "   http://127.0.0.1:3000" -ForegroundColor White
    Write-Host "   http://$ip:3000" -ForegroundColor White
} else {
    Write-Host "⚠️  Impossible de détecter l'adresse IP automatiquement" -ForegroundColor Yellow
    Write-Host "   Le serveur sera accessible sur toutes les interfaces réseau" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Pour arrêter le serveur, appuyez sur Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Démarrer le serveur React
npm start



