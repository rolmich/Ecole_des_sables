"""
Script pour corriger les numéros des bungalows selon la réalité:
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

def fix_bungalow_numbers():
    """Corriger les numéros des bungalows."""

    print("=" * 80)
    print("  CORRECTION DES NUMEROS DE BUNGALOWS")
    print("=" * 80)

    # Configuration correcte avec le nombre réel de chambres actuel
    correct_config = {
        'A': list(range(8, 16)),   # 8-15 (8 chambres)
        'B': list(range(1, 8)),    # 1-7 (7 chambres)
        'C': list(range(16, 25)),  # 16-24 (9 chambres)
    }

    print("\nConfiguration cible:")
    print(f"  Village A: {correct_config['A'][0]}-{correct_config['A'][-1]} ({len(correct_config['A'])} chambres)")
    print(f"  Village B: {correct_config['B'][0]}-{correct_config['B'][-1]} ({len(correct_config['B'])} chambres)")
    print(f"  Village C: {correct_config['C'][0]}-{correct_config['C'][-1]} ({len(correct_config['C'])} chambres)")
    print(f"  TOTAL: {len(correct_config['A']) + len(correct_config['B']) + len(correct_config['C'])} chambres")

    print("\nEtat actuel:")
    total_current = 0
    for village in Village.objects.all().order_by('name'):
        count = village.bungalows.count()
        total_current += count
        print(f"  Village {village.name}: {count} bungalows")
    print(f"  TOTAL: {total_current} chambres")

    # Vérifier si on peut faire la migration
    total_target = sum(len(nums) for nums in correct_config.values())

    if total_current != total_target:
        print(f"\n[ERREUR] Nombre de chambres actuel ({total_current}) != cible ({total_target})")
        print("\nSuggestion:")

        village_a_count = Village.objects.get(name='A').bungalows.count()
        village_b_count = Village.objects.get(name='B').bungalows.count()
        village_c_count = Village.objects.get(name='C').bungalows.count()

        if village_b_count > len(correct_config['B']):
            print(f"  - Supprimer {village_b_count - len(correct_config['B'])} bungalow(s) du Village B")
        if village_c_count < len(correct_config['C']):
            print(f"  - Ajouter {len(correct_config['C']) - village_c_count} bungalow(s) au Village C")

        print("\nVoulez-vous continuer avec le nombre actuel de chambres? (o/n)")
        response = input().strip().lower()

        if response != 'o':
            print("[ANNULE] Operation annulee")
            return

        # Ajuster la config selon le nombre actuel
        print("\n[INFO] Ajustement de la configuration...")
        correct_config['B'] = list(range(1, village_b_count + 1))
        correct_config['C'] = list(range(16, 16 + village_c_count))

        print(f"  Village B: 1-{village_b_count} ({village_b_count} chambres)")
        print(f"  Village C: 16-{15 + village_c_count} ({village_c_count} chambres)")

    # Renommer les bungalows
    print("\n" + "=" * 80)
    print("  RENOMMAGE DES BUNGALOWS")
    print("=" * 80)

    for village_name, new_numbers in correct_config.items():
        try:
            village = Village.objects.get(name=village_name)
            print(f"\n--- Village {village_name} ---")

            # Récupérer tous les bungalows du village (triés par ID pour être cohérent)
            bungalows = list(village.bungalows.all().order_by('id'))

            if len(bungalows) != len(new_numbers):
                print(f"[ERREUR] Incohérence: {len(bungalows)} bungalows vs {len(new_numbers)} numéros")
                continue

            # Renommer temporairement pour éviter les conflits
            temp_names = []
            for i, bungalow in enumerate(bungalows):
                temp_name = f"TEMP_{village_name}_{i}"
                bungalow.name = temp_name
                bungalow.save()
                temp_names.append((bungalow, new_numbers[i]))

            # Renommer avec les vrais noms
            for bungalow, new_number in temp_names:
                old_temp = bungalow.name
                new_name = str(new_number)
                bungalow.name = new_name
                bungalow.save()
                print(f"  [OK] Renomme en: {new_name}")

        except Village.DoesNotExist:
            print(f"[ERREUR] Village {village_name} non trouve")
            continue

    # Afficher le résumé final
    print("\n" + "=" * 80)
    print("  RESUME FINAL")
    print("=" * 80)

    for village in Village.objects.all().order_by('name'):
        bungalows = list(village.bungalows.all().order_by('name'))
        # Convertir en int pour tri numérique
        try:
            sorted_nums = sorted([int(b.name) for b in bungalows])
            nums_str = ', '.join(map(str, sorted_nums))
        except:
            nums_str = ', '.join([b.name for b in bungalows])

        print(f"\nVillage {village.name}: {len(bungalows)} bungalows")
        print(f"  Numeros: {nums_str}")

    print("\n[OK] Correction terminee!")

if __name__ == '__main__':
    fix_bungalow_numbers()
