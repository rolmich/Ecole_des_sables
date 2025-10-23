#!/bin/bash
# Script Bash pour démarrer le serveur Django avec accès réseau
# Utilisation: ./run_network.sh

echo "========================================"
echo "  Démarrage du serveur Django (Réseau)"
echo "========================================"
echo ""

# Afficher l'adresse IP locale
echo "🔍 Recherche de votre adresse IP..."
IP=$(hostname -I | awk '{print $1}')

if [ ! -z "$IP" ]; then
    echo "✅ Votre adresse IP locale: $IP"
    echo ""
    echo "🌐 Le backend sera accessible sur:"
    echo "   http://$IP:8000"
    echo "   http://$IP:8000/admin/"
    echo "   http://$IP:8000/api/"
else
    echo "⚠️  Impossible de détecter l'adresse IP automatiquement"
    echo "   Le serveur sera accessible sur toutes les interfaces réseau"
fi

echo ""
echo "📝 Pour arrêter le serveur, appuyez sur Ctrl+C"
echo ""
echo "========================================"
echo ""

# Démarrer le serveur
python manage.py runserver 0.0.0.0:8000


