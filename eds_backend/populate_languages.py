"""
Script pour peupler la base de données avec des langues par défaut
"""
import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eds_backend.settings')
django.setup()

from participants.models import Language
from django.contrib.auth import get_user_model

User = get_user_model()

def populate_languages():
    """Créer les langues par défaut."""

    print("Creation des langues par defaut...")

    # Liste des langues courantes
    languages_data = [
        {
            'code': 'fr',
            'name': 'Français',
            'native_name': 'Français',
            'is_active': True,
            'display_order': 1
        },
        {
            'code': 'en',
            'name': 'Anglais',
            'native_name': 'English',
            'is_active': True,
            'display_order': 2
        },
        {
            'code': 'es',
            'name': 'Espagnol',
            'native_name': 'Español',
            'is_active': True,
            'display_order': 3
        },
        {
            'code': 'ar',
            'name': 'Arabe',
            'native_name': 'العربية',
            'is_active': True,
            'display_order': 4
        },
        {
            'code': 'de',
            'name': 'Allemand',
            'native_name': 'Deutsch',
            'is_active': True,
            'display_order': 5
        },
        {
            'code': 'it',
            'name': 'Italien',
            'native_name': 'Italiano',
            'is_active': True,
            'display_order': 6
        },
        {
            'code': 'pt',
            'name': 'Portugais',
            'native_name': 'Português',
            'is_active': True,
            'display_order': 7
        },
        {
            'code': 'wo',
            'name': 'Wolof',
            'native_name': 'Wolof',
            'is_active': True,
            'display_order': 8
        },
        {
            'code': 'zh',
            'name': 'Chinois',
            'native_name': '中文',
            'is_active': True,
            'display_order': 9
        },
        {
            'code': 'ja',
            'name': 'Japonais',
            'native_name': '日本語',
            'is_active': True,
            'display_order': 10
        },
    ]

    created_count = 0
    updated_count = 0

    for lang_data in languages_data:
        language, created = Language.objects.get_or_create(
            code=lang_data['code'],
            defaults={
                'name': lang_data['name'],
                'native_name': lang_data['native_name'],
                'is_active': lang_data['is_active'],
                'display_order': lang_data['display_order']
            }
        )

        if created:
            created_count += 1
            print(f"  [OK] Langue creee: {language.name} ({language.code})")
        else:
            # Mettre à jour si elle existe déjà
            language.name = lang_data['name']
            language.native_name = lang_data['native_name']
            language.is_active = lang_data['is_active']
            language.display_order = lang_data['display_order']
            language.save()
            updated_count += 1
            print(f"  [MAJ] Langue mise a jour: {language.name} ({language.code})")

    print(f"\nResume:")
    print(f"  - {created_count} langue(s) creee(s)")
    print(f"  - {updated_count} langue(s) mise(s) a jour")
    print(f"  - Total: {Language.objects.count()} langue(s) dans la base")

    # Afficher les statistiques
    active_count = Language.objects.filter(is_active=True).count()
    inactive_count = Language.objects.filter(is_active=False).count()

    print(f"\nStatistiques:")
    print(f"  - Langues actives: {active_count}")
    print(f"  - Langues inactives: {inactive_count}")

if __name__ == '__main__':
    print("=" * 60)
    print("INITIALISATION DES LANGUES - Ecole des Sables")
    print("=" * 60)
    print()

    try:
        populate_languages()
        print("\n" + "=" * 60)
        print("SUCCES: Les langues ont ete creees avec succes!")
        print("=" * 60)
    except Exception as e:
        print("\n" + "=" * 60)
        print(f"ERREUR: {str(e)}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
