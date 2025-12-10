#!/usr/bin/env python
"""
Script pour obtenir l'adresse IP locale du serveur dans le réseau WiFi.
"""
import socket

def get_local_ip():
    """Obtient l'adresse IP locale de la machine."""
    try:
        # Créer une connexion socket (sans vraiment se connecter)
        # pour forcer le système à choisir l'interface réseau appropriée
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Utiliser l'adresse IP de Google DNS comme destination
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        # En cas d'erreur, retourner localhost
        return "127.0.0.1"

if __name__ == "__main__":
    ip = get_local_ip()
    print(ip)
