"""
Script FINAL pour corriger les bungalows selon la réalité:
- Village A: Chambres 8-15 (8 chambres)
- Village B: Chambres 1-7 (7 chambres)
- Village C: Chambres 16-24 (9 chambres)

TOTAL: 24 chambres
"""

import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eds_backend.settings')
django.setup()

from participants.models import Village, Bungalow

def fix_bungalows():
    """Corriger les bungalows."""

    print("=" * 80)
    print("  CORRECTION FINALE DES BUNGALOWS")
    print("=" * 80)

    # Configuration cible
    config = {
        'A': {'numbers': list(range(8, 16)), 'type': 'A', 'capacity': 3},    # 8-15 (8 chambres)
        'B': {'numbers': list(range(1, 8)), 'type': 'B', 'capacity': 2},     # 1-7 (7 chambres)
        'C': {'numbers': list(range(16, 25)), 'type': 'A', 'capacity': 3},   # 16-24 (9 chambres)
    }

    print("\nConfiguration cible:")
    for v_name, v_config in config.items():
        nums = v_config['numbers']
        print(f"  Village {v_name}: {nums[0]}-{nums[-1]} ({len(nums)} chambres)")
    print(f"  TOTAL: {sum(len(v['numbers']) for v in config.values())} chambres")

    # Etape 1: Supprimer le dernier bungalow du Village B (s'il y en a 8)
    village_b = Village.objects.get(name='B')
    bungalows_b = list(village_b.bungalows.all().order_by('id'))

    print(f"\n--- Village B: {len(bungalows_b)} bungalows actuels ---")

    if len(bungalows_b) > 7:
        # Supprimer le dernier
        to_delete = bungalows_b[-1]
        print(f"[INFO] Suppression du bungalow {to_delete.name}")

        # Vérifier s'il est assigné
        if to_delete.occupancy > 0:
            print(f"[ATTENTION] Ce bungalow a {to_delete.occupancy} occupants!")
            print("Impossible de le supprimer. Desassignez d'abord les occupants.")
            return

        to_delete.delete()
        print(f"[OK] Bungalow {to_delete.name} supprime")
    else:
        print("[INFO] Nombre correct de bungalows")

    # Etape 2: Ajouter un bungalow au Village C (s'il y en a 8)
    village_c = Village.objects.get(name='C')
    bungalows_c = list(village_c.bungalows.all().order_by('id'))

    print(f"\n--- Village C: {len(bungalows_c)} bungalows actuels ---")

    if len(bungalows_c) < 9:
        # Ajouter un bungalow
        new_bungalow = Bungalow.objects.create(
            village=village_c,
            name='TEMP_NEW',
            type='A',
            capacity=3,
            beds=[
                {'id': 'bed1', 'type': 'simple', 'occupiedBy': None},
                {'id': 'bed2', 'type': 'simple', 'occupiedBy': None},
                {'id': 'bed3', 'type': 'simple', 'occupiedBy': None}
            ],
            amenities=['shower']
        )
        print(f"[OK] Nouveau bungalow ajoute au Village C")
    else:
        print("[INFO] Nombre correct de bungalows")

    # Etape 3: Renommer tous les bungalows
    print("\n" + "=" * 80)
    print("  RENOMMAGE DES BUNGALOWS")
    print("=" * 80)

    for village_name, v_config in config.items():
        village = Village.objects.get(name=village_name)
        bungalows = list(village.bungalows.all().order_by('id'))
        new_numbers = v_config['numbers']

        print(f"\n--- Village {village_name}: {len(bungalows)} bungalows ---")

        if len(bungalows) != len(new_numbers):
            print(f"[ERREUR] {len(bungalows)} bungalows != {len(new_numbers)} numeros cibles")
            continue

        # Renommer temporairement pour éviter les conflits de nom
        temp_mapping = []
        for i, bungalow in enumerate(bungalows):
            temp_name = f"TEMP_{village_name}_{i}"
            bungalow.name = temp_name
            bungalow.save()
            temp_mapping.append((bungalow, new_numbers[i]))

        # Renommer avec les vrais numéros
        for bungalow, new_number in temp_mapping:
            bungalow.name = str(new_number)
            bungalow.save()
            print(f"  [OK] Chambre {new_number}")

    # Résumé final
    print("\n" + "=" * 80)
    print("  RESUME FINAL")
    print("=" * 80)

    total = 0
    for village in Village.objects.all().order_by('name'):
        bungalows = list(village.bungalows.all())
        total += len(bungalows)

        # Trier numériquement
        try:
            sorted_nums = sorted([int(b.name) for b in bungalows])
            nums_str = ', '.join(map(str, sorted_nums))
            range_str = f"{sorted_nums[0]}-{sorted_nums[-1]}"
        except:
            nums_str = ', '.join([b.name for b in bungalows])
            range_str = "?"

        print(f"\nVillage {village.name}: {len(bungalows)} chambres ({range_str})")
        print(f"  Details: {nums_str}")

    print(f"\nTOTAL: {total} chambres")
    print("\n[OK] Correction terminee!")

if __name__ == '__main__':
    fix_bungalows()
