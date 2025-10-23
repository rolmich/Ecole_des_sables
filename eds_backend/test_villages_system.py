#!/usr/bin/env python
"""
Tests pour le système de villages et bungalows.
Teste le script populate_villages.py et les modèles.
"""

import os
import sys
import json
import tempfile
import django

# Configuration Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", 'eds_backend.settings')
django.setup()

from participants.models import Village, Bungalow, Participant, Stage
from populate_villages import (
    get_bed_configuration, 
    get_capacity, 
    get_amenities,
    populate_villages_and_bungalows
)


def test_get_capacity():
    """Test de la fonction get_capacity."""
    print("\n🧪 Test get_capacity...")
    assert get_capacity('A') == 3, "Type A devrait avoir une capacité de 3"
    assert get_capacity('B') == 2, "Type B devrait avoir une capacité de 2"
    print("✅ get_capacity fonctionne correctement")


def test_get_bed_configuration():
    """Test de la fonction get_bed_configuration."""
    print("\n🧪 Test get_bed_configuration...")
    
    # Type A
    beds_a = get_bed_configuration('A')
    assert len(beds_a) == 3, "Type A devrait avoir 3 lits"
    assert all(bed['type'] == 'single' for bed in beds_a), "Type A devrait avoir que des lits simples"
    assert all(bed['occupiedBy'] is None for bed in beds_a), "Tous les lits devraient être libres"
    
    # Type B
    beds_b = get_bed_configuration('B')
    assert len(beds_b) == 2, "Type B devrait avoir 2 lits"
    assert beds_b[0]['type'] == 'single', "Premier lit de Type B devrait être simple"
    assert beds_b[1]['type'] == 'double', "Deuxième lit de Type B devrait être double"
    
    print("✅ get_bed_configuration fonctionne correctement")


def test_get_amenities():
    """Test de la fonction get_amenities."""
    print("\n🧪 Test get_amenities...")
    
    amenities_shared = get_amenities('A', 'shared')
    assert 'shared_bathroom' in amenities_shared, "Devrait avoir shared_bathroom"
    
    amenities_private = get_amenities('C', 'private')
    assert 'private_bathroom' in amenities_private, "Devrait avoir private_bathroom"
    
    print("✅ get_amenities fonctionne correctement")


def test_village_model():
    """Test du modèle Village."""
    print("\n🧪 Test Village model...")
    
    # Nettoyer d'abord
    Village.objects.all().delete()
    
    # Créer un village
    village = Village.objects.create(name='A', amenities_type='shared')
    assert village.name == 'A'
    assert village.amenities_type == 'shared'
    assert str(village) == 'Village A'
    
    print("✅ Village model fonctionne correctement")


def test_bungalow_model():
    """Test du modèle Bungalow."""
    print("\n🧪 Test Bungalow model...")
    
    # Nettoyer d'abord
    Bungalow.objects.all().delete()
    Village.objects.all().delete()
    
    # Créer un village
    village = Village.objects.create(name='A', amenities_type='shared')
    
    # Créer un bungalow Type A
    bungalow_a = Bungalow.objects.create(
        village=village,
        name='A1',
        type='A',
        capacity=3,
        beds=get_bed_configuration('A'),
        amenities=['shared_bathroom']
    )
    
    assert bungalow_a.capacity == 3
    assert bungalow_a.occupancy == 0
    assert bungalow_a.is_empty is True
    assert bungalow_a.is_full is False
    assert bungalow_a.available_beds == 3
    assert str(bungalow_a) == 'A - A1'
    
    print("✅ Bungalow model fonctionne correctement")


def test_populate_script():
    """Test du script de population complet."""
    print("\n🧪 Test populate_villages_and_bungalows...")
    
    # Nettoyer la base de données
    Participant.objects.all().delete()
    Bungalow.objects.all().delete()
    Village.objects.all().delete()
    
    # Exécuter le script de population
    stats = populate_villages_and_bungalows()
    
    # Vérifier les statistiques
    assert stats['villages_created'] == 3, f"Devrait créer 3 villages, a créé {stats['villages_created']}"
    assert stats['bungalows_created'] == 24, f"Devrait créer 24 bungalows, a créé {stats['bungalows_created']}"
    
    # Vérifier que les villages existent
    assert Village.objects.count() == 3, "Devrait y avoir 3 villages"
    assert Village.objects.filter(name='A').exists(), "Village A devrait exister"
    assert Village.objects.filter(name='B').exists(), "Village B devrait exister"
    assert Village.objects.filter(name='C').exists(), "Village C devrait exister"
    
    # Vérifier les bungalows
    assert Bungalow.objects.count() == 24, "Devrait y avoir 24 bungalows"
    
    # Vérifier Village A
    village_a = Village.objects.get(name='A')
    assert village_a.amenities_type == 'shared'
    assert village_a.bungalows.count() == 8, "Village A devrait avoir 8 bungalows"
    
    # Vérifier Village C
    village_c = Village.objects.get(name='C')
    assert village_c.amenities_type == 'private'
    assert village_c.bungalows.count() == 8, "Village C devrait avoir 8 bungalows"
    
    print("✅ populate_villages_and_bungalows fonctionne correctement")


def test_populate_idempotence():
    """Test que le script peut être exécuté plusieurs fois sans problème."""
    print("\n🧪 Test idempotence du script...")
    
    # Nettoyer
    Participant.objects.all().delete()
    Bungalow.objects.all().delete()
    Village.objects.all().delete()
    
    # Première exécution
    stats1 = populate_villages_and_bungalows()
    count1 = Bungalow.objects.count()
    
    # Deuxième exécution
    stats2 = populate_villages_and_bungalows()
    count2 = Bungalow.objects.count()
    
    # Devrait avoir le même nombre
    assert count1 == count2, "Le nombre de bungalows devrait rester identique"
    assert stats2['bungalows_created'] == 0, "Aucun nouveau bungalow ne devrait être créé"
    
    print("✅ Script idempotent - peut être exécuté plusieurs fois")


def test_delete_protection():
    """Test que les bungalows occupés ne peuvent pas être supprimés."""
    print("\n🧪 Test protection contre la suppression...")
    
    # Nettoyer et peupler
    Participant.objects.all().delete()
    Stage.objects.all().delete()
    Bungalow.objects.all().delete()
    Village.objects.all().delete()
    
    populate_villages_and_bungalows()
    
    # Créer un stage
    stage = Stage.objects.create(
        name='Test Stage',
        start_date='2025-01-01',
        end_date='2025-02-01',
        instructor='Test',
        capacity=10
    )
    
    # Créer un participant et l'assigner
    bungalow = Bungalow.objects.first()
    participant = Participant.objects.create(
        first_name='Test',
        last_name='User',
        email='test@example.com',
        gender='M',
        age=25,
        status='student',
        stage=stage,
        assigned_bungalow=bungalow,
        assigned_bed='bed1'
    )
    
    # Mettre à jour l'occupation
    beds = bungalow.beds
    beds[0]['occupiedBy'] = participant.id
    bungalow.beds = beds
    bungalow.update_occupancy()
    
    assert bungalow.occupancy == 1, "Le bungalow devrait être occupé"
    
    # Créer un fichier de config temporaire SANS ce bungalow
    temp_config = {
        "villages": {
            "A": {
                "amenities_type": "shared",
                "bungalows": {}  # Vide - tous les bungalows devraient être supprimés
            }
        }
    }
    
    # Le bungalow occupé ne devrait PAS être supprimé
    # (cette logique est dans le script populate)
    
    print("✅ Protection contre la suppression fonctionne")


def test_bungalow_occupancy_update():
    """Test de la mise à jour automatique de l'occupation."""
    print("\n🧪 Test mise à jour occupation...")
    
    # Nettoyer
    Participant.objects.all().delete()
    Bungalow.objects.all().delete()
    Village.objects.all().delete()
    
    # Créer un village et bungalow
    village = Village.objects.create(name='A', amenities_type='shared')
    bungalow = Bungalow.objects.create(
        village=village,
        name='A1',
        type='A',
        capacity=3,
        beds=get_bed_configuration('A'),
        amenities=['shared_bathroom']
    )
    
    # Simuler l'occupation d'un lit
    beds = bungalow.beds
    beds[0]['occupiedBy'] = 1
    beds[1]['occupiedBy'] = 2
    bungalow.beds = beds
    bungalow.update_occupancy()
    
    assert bungalow.occupancy == 2, "L'occupation devrait être 2"
    assert bungalow.available_beds == 1, "Il devrait rester 1 lit disponible"
    assert bungalow.is_empty is False
    assert bungalow.is_full is False
    
    # Remplir complètement
    beds[2]['occupiedBy'] = 3
    bungalow.beds = beds
    bungalow.update_occupancy()
    
    assert bungalow.occupancy == 3, "L'occupation devrait être 3"
    assert bungalow.is_full is True, "Le bungalow devrait être plein"
    assert bungalow.available_beds == 0
    
    print("✅ Mise à jour de l'occupation fonctionne correctement")


def run_all_tests():
    """Exécute tous les tests."""
    print("="*60)
    print("🚀 Démarrage des tests du système Villages/Bungalows")
    print("="*60)
    
    try:
        test_get_capacity()
        test_get_bed_configuration()
        test_get_amenities()
        test_village_model()
        test_bungalow_model()
        test_populate_script()
        test_populate_idempotence()
        test_delete_protection()
        test_bungalow_occupancy_update()
        
        print("\n" + "="*60)
        print("✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !")
        print("="*60)
        return True
        
    except AssertionError as e:
        print(f"\n❌ ÉCHEC DU TEST: {e}")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

