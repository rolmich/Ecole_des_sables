"""
Script pour initialiser la base de données avec des données par défaut.
"""

import os
import django

# Configuration de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eds_backend.settings')
django.setup()

from authentication.models import User


def create_default_users():
    """Créer des utilisateurs par défaut."""
    
    # Créer un superutilisateur admin
    if not User.objects.filter(email='admin@eds.sn').exists():
        admin = User.objects.create_superuser(
            email='admin@eds.sn',
            username='admin',
            password='admin123',
            first_name='Admin',
            last_name='EDS',
            phone='+221 33 123 45 67',
            role='admin',
            status='active',
            department='Direction'
        )
        admin.custom_permissions = ['all']
        admin.save()
        print('[OK] Superutilisateur cree: admin@eds.sn / admin123')
    else:
        print('[INFO] Superutilisateur deja existant')
    
    # Créer un manager
    if not User.objects.filter(email='manager@eds.sn').exists():
        manager = User.objects.create_user(
            email='manager@eds.sn',
            username='manager',
            password='manager123',
            first_name='Marie',
            last_name='Dubois',
            phone='+221 77 123 45 67',
            role='manager',
            status='active',
            department='Administration'
        )
        manager.custom_permissions = ['view_users', 'edit_users', 'view_stages', 'edit_stages']
        manager.save()
        print('[OK] Manager cree: manager@eds.sn / manager123')
    else:
        print('[INFO] Manager deja existant')
    
    # Créer un staff
    if not User.objects.filter(email='staff@eds.sn').exists():
        staff = User.objects.create_user(
            email='staff@eds.sn',
            username='staff',
            password='staff123',
            first_name='Jean',
            last_name='Martin',
            phone='+221 77 234 56 78',
            role='staff',
            status='active',
            department='Logistique'
        )
        staff.custom_permissions = ['view_stages', 'view_participants']
        staff.save()
        print('[OK] Staff cree: staff@eds.sn / staff123')
    else:
        print('[INFO] Staff deja existant')


if __name__ == '__main__':
    print('=> Initialisation de la base de donnees...\n')
    create_default_users()
    print('\n=> Initialisation terminee!')
    print('\nVous pouvez maintenant vous connecter avec:')
    print('  - Admin: admin@eds.sn / admin123')
    print('  - Manager: manager@eds.sn / manager123')
    print('  - Staff: staff@eds.sn / staff123')

