"""
Script pour mettre à jour TOUTES les chambres avec une capacité de 3 lits.
"""

import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eds_backend.settings')
django.setup()

from participants.models import Village, Bungalow

def update_all_to_capacity_3():
    """Met à jour toutes les chambres pour avoir 3 lits."""

    print("=" * 80)
    print("  MISE A JOUR: TOUTES LES CHAMBRES -> 3 LITS")
    print("=" * 80)

    # Configuration pour 3 lits simples
    beds_config_3 = [
        {"id": "bed1", "type": "single", "occupiedBy": None},
        {"id": "bed2", "type": "single", "occupiedBy": None},
        {"id": "bed3", "type": "single", "occupiedBy": None}
    ]

    total_updated = 0
    total_occupied = 0

    for village in Village.objects.all().order_by('name'):
        print(f"\n--- Village {village.name} ---")

        for bungalow in village.bungalows.all().order_by('name'):
            # Vérifier si occupé
            if bungalow.occupancy > 0:
                print(f"  [SKIP] Chambre {bungalow.name} est occupee ({bungalow.occupancy} personnes)")
                total_occupied += 1
                continue

            # Vérifier si déjà à 3
            if bungalow.capacity == 3 and bungalow.type == 'A':
                print(f"  [OK] Chambre {bungalow.name} - deja 3 lits")
                continue

            # Mettre à jour
            old_capacity = bungalow.capacity
            old_type = bungalow.type

            bungalow.type = 'A'
            bungalow.capacity = 3
            bungalow.beds = beds_config_3
            bungalow.save()

            print(f"  [UPDATE] Chambre {bungalow.name}: Type {old_type} (cap. {old_capacity}) -> Type A (cap. 3)")
            total_updated += 1

    # Résumé
    print("\n" + "=" * 80)
    print("  RESUME")
    print("=" * 80)

    total_bungalows = Bungalow.objects.count()
    print(f"\nTotal chambres: {total_bungalows}")
    print(f"  - Mises a jour: {total_updated}")
    print(f"  - Occupees (non modifiees): {total_occupied}")
    print(f"  - Deja a 3 lits: {total_bungalows - total_updated - total_occupied}")

    # Vérification finale
    print("\n" + "=" * 80)
    print("  VERIFICATION FINALE")
    print("=" * 80)

    for village in Village.objects.all().order_by('name'):
        bungalows = village.bungalows.all()
        total = bungalows.count()
        capacity_3 = bungalows.filter(capacity=3).count()
        type_a = bungalows.filter(type='A').count()

        print(f"\nVillage {village.name}: {total} chambres")
        print(f"  - Capacite 3: {capacity_3}/{total}")
        print(f"  - Type A: {type_a}/{total}")

        # Détails des chambres
        details = []
        for b in bungalows.order_by('name'):
            details.append(f"{b.name}(cap:{b.capacity})")
        print(f"  Details: {', '.join(details)}")

    print("\n[OK] Mise a jour terminee!")

if __name__ == '__main__':
    update_all_to_capacity_3()
