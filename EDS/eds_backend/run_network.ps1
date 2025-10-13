# Script PowerShell pour démarrer le serveur Django avec accès réseau
# Utilisation: .\run_network.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Démarrage du serveur Django (Réseau)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Afficher l'adresse IP locale
Write-Host "🔍 Recherche de votre adresse IP..." -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*","Ethernet*" | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1).IPAddress

if ($ip) {
    Write-Host "✅ Votre adresse IP locale: " -NoNewline -ForegroundColor Green
    Write-Host "$ip" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 Le backend sera accessible sur:" -ForegroundColor Cyan
    Write-Host "   http://$ip:8000" -ForegroundColor White
    Write-Host "   http://$ip:8000/admin/" -ForegroundColor White
    Write-Host "   http://$ip:8000/api/" -ForegroundColor White
} else {
    Write-Host "⚠️  Impossible de détecter l'adresse IP automatiquement" -ForegroundColor Yellow
    Write-Host "   Le serveur sera accessible sur toutes les interfaces réseau" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Pour arrêter le serveur, appuyez sur Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Démarrer le serveur
python manage.py runserver 0.0.0.0:8000


