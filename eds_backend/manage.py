#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eds_backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Si la commande est 'runserver' et qu'aucune adresse n'est spécifiée,
    # utiliser 0.0.0.0:8000 par défaut pour permettre l'accès réseau
    if len(sys.argv) >= 2 and sys.argv[1] == 'runserver':
        # Vérifier si une adresse est déjà spécifiée
        has_address = any(':' in arg or arg.replace('.', '').isdigit() for arg in sys.argv[2:])
        if not has_address:
            # Ajouter l'adresse par défaut pour l'accès réseau
            sys.argv.append('0.0.0.0:8000')

            # Afficher l'IP locale pour faciliter la configuration
            try:
                import socket
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                s.close()
                print(f"\n{'='*60}")
                print(f"🌐 Serveur accessible sur le réseau WiFi")
                print(f"{'='*60}")
                print(f"📍 IP locale: {local_ip}")
                print(f"🔗 Localhost: http://127.0.0.1:8000")
                print(f"🔗 Réseau:    http://{local_ip}:8000")
                print(f"📱 Configurez le frontend sur: http://{local_ip}:3000/network-config.html")
                print(f"{'='*60}\n")
            except:
                pass

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
