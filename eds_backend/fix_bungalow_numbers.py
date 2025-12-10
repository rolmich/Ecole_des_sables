"""
Script pour corriger les numéros des bungalows selon la réalité:
- Village A: Chambres 8-15
- Village B: Chambres 1-7
- Village C: Chambres 16-24
"""

import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eds_backend.settings')
django.setup()

from participants.models import Village, Bungalow

def fix_bungalow_numbers():
    """Corriger les numéros des bungalows."""

    print("=" * 80)
    print("  CORRECTION DES NUMÉROS DE BUNGALOWS")
    print("=" * 80)

    # Configuration correcte
    correct_config = {
        'A': {
            'range': range(8, 16),  # 8-15
            'old_prefix': 'A'
        },
        'B': {
            'range': range(1, 8),   # 1-7
            'old_prefix': 'B'
        },
        'C': {
            'range': range(16, 25), # 16-24
            'old_prefix': 'C'
        }
    }

    # Pour chaque village
    for village_name, config in correct_config.items():
        try:
            village = Village.objects.get(name=village_name)
            print(f"\n--- Village {village_name} ---")

            # Récupérer tous les bungalows du village
            bungalows = list(village.bungalows.all().order_by('name'))

            # Mapper les nouveaux numéros
            new_numbers = list(config['range'])

            if len(bungalows) != len(new_numbers):
                print(f"[ATTENTION] Nombre de bungalows ({len(bungalows)}) != nombre attendu ({len(new_numbers)})")
                print(f"Bungalows actuels: {[b.name for b in bungalows]}")
                continue

            # Renommer les bungalows
            for i, bungalow in enumerate(bungalows):
                old_name = bungalow.name
                new_number = new_numbers[i]
                new_name = str(new_number)

                if old_name != new_name:
                    bungalow.name = new_name
                    bungalow.save()
                    print(f"  [OK] {old_name} -> {new_name}")
                else:
                    print(f"  [-] {old_name} (deja correct)")

        except Village.DoesNotExist:
            print(f"[ERREUR] Village {village_name} non trouvé")
            continue

    print("\n" + "=" * 80)
    print("  RÉSUMÉ FINAL")
    print("=" * 80)

    for village in Village.objects.all().order_by('name'):
        bungalows = village.bungalows.all().order_by('name')
        print(f"\nVillage {village.name}: {bungalows.count()} bungalows")
        print(f"  Numéros: {', '.join([b.name for b in bungalows])}")

    print("\n[OK] Correction terminée!")

if __name__ == '__main__':
    fix_bungalow_numbers()
