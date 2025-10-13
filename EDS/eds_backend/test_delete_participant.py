#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Tests spécifiques pour la suppression de participants.
Vérifie que la suppression fonctionne correctement dans tous les cas.
"""

import os
import sys
import django

# Fix pour Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuration Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", 'eds_backend.settings')
django.setup()

from participants.models import Stage, Participant, Village, Bungalow
from django.contrib.auth import get_user_model
from datetime import date, timedelta

User = get_user_model()


def test_delete_participant_simple():
    """
    Test 1: Supprimer un participant simple (non assigné).
    """
    print("\n" + "="*60)
    print("TEST 1: Suppression d'un participant non assigne")
    print("="*60)
    
    # Nettoyer
    Participant.objects.filter(email='delete.test1@example.com').delete()
    
    # Créer un participant
    user = User.objects.first()
    stage = Stage.objects.first()
    
    participant = Participant.objects.create(
        first_name='Delete',
        last_name='Test1',
        email='delete.test1@example.com',
        gender='M',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    participant.stages.add(stage)
    
    participant_id = participant.id
    participant_name = participant.full_name
    
    print(f"\n[INFO] Participant cree:")
    print(f"     ID: {participant_id}")
    print(f"     Nom: {participant_name}")
    print(f"     Email: {participant.email}")
    print(f"     Est assigne: {participant.is_assigned}")
    
    # Vérifier qu'il existe
    assert Participant.objects.filter(id=participant_id).exists(), "Le participant devrait exister"
    print(f"\n[OK] Participant existe en base de donnees")
    
    # Supprimer
    print(f"\n[ACTION] Suppression du participant...")
    participant.delete()
    
    # Vérifier qu'il n'existe plus
    exists = Participant.objects.filter(id=participant_id).exists()
    
    if not exists:
        print(f"[OK] Participant {participant_name} (ID: {participant_id}) supprime avec succes!")
        print(f"     Verification: Le participant n'existe plus en base de donnees")
        return True
    else:
        print(f"[ERROR] Le participant existe toujours apres suppression!")
        return False


def test_delete_participant_assigned():
    """
    Test 2: Supprimer un participant assigné à un bungalow.
    """
    print("\n" + "="*60)
    print("TEST 2: Suppression d'un participant ASSIGNE a un bungalow")
    print("="*60)
    
    # Nettoyer
    Participant.objects.filter(email='delete.test2@example.com').delete()
    
    # Créer un participant
    user = User.objects.first()
    stage = Stage.objects.first()
    bungalow = Bungalow.objects.first()
    
    if not bungalow:
        print("[ERROR] Aucun bungalow trouve. Lancez 'python populate_villages.py'")
        return False
    
    participant = Participant.objects.create(
        first_name='Delete',
        last_name='Test2',
        email='delete.test2@example.com',
        gender='F',
        age=28,
        language='Francais',
        status='student',
        assigned_bungalow=bungalow,
        assigned_bed='bed1',
        created_by=user
    )
    participant.stages.add(stage)
    
    participant_id = participant.id
    participant_name = participant.full_name
    bungalow_name = bungalow.name
    
    print(f"\n[INFO] Participant cree:")
    print(f"     ID: {participant_id}")
    print(f"     Nom: {participant_name}")
    print(f"     Bungalow: {bungalow_name}")
    print(f"     Lit: {participant.assigned_bed}")
    print(f"     Est assigne: {participant.is_assigned}")
    
    # Occupation avant suppression
    initial_occupancy = bungalow.occupancy
    print(f"\n[INFO] Occupation du bungalow AVANT suppression: {initial_occupancy}")
    
    # Supprimer
    print(f"\n[ACTION] Suppression du participant assigne...")
    participant.delete()
    
    # Vérifier qu'il n'existe plus
    exists = Participant.objects.filter(id=participant_id).exists()
    
    if not exists:
        print(f"[OK] Participant {participant_name} (ID: {participant_id}) supprime avec succes!")
        print(f"     Le participant n'existe plus en base de donnees")
        
        # Vérifier que le bungalow a été mis à jour
        bungalow.refresh_from_db()
        print(f"[INFO] Occupation du bungalow APRES suppression: {bungalow.occupancy}")
        print(f"     Note: L'occupation devrait etre mise a jour manuellement si necessaire")
        
        return True
    else:
        print(f"[ERROR] Le participant existe toujours apres suppression!")
        return False


def test_delete_participant_multiple_stages():
    """
    Test 3: Supprimer un participant inscrit à plusieurs stages.
    """
    print("\n" + "="*60)
    print("TEST 3: Suppression d'un participant avec PLUSIEURS stages")
    print("="*60)
    
    # Nettoyer
    Participant.objects.filter(email='delete.test3@example.com').delete()
    
    # Créer un participant avec plusieurs stages
    user = User.objects.first()
    
    # Récupérer ou créer 2 stages
    stages = list(Stage.objects.all()[:2])
    if len(stages) < 2:
        # Créer un deuxième stage si nécessaire
        stage2 = Stage.objects.create(
            name='Stage Test Delete 2',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            instructor='Test',
            capacity=10,
            created_by=user
        )
        stages.append(stage2)
    
    participant = Participant.objects.create(
        first_name='Delete',
        last_name='Test3',
        email='delete.test3@example.com',
        gender='M',
        age=30,
        language='Francais',
        status='student',
        created_by=user
    )
    
    # Assigner aux deux stages
    participant.stages.add(*stages)
    
    participant_id = participant.id
    participant_name = participant.full_name
    stage_names = [s.name for s in participant.stages.all()]
    
    print(f"\n[INFO] Participant cree:")
    print(f"     ID: {participant_id}")
    print(f"     Nom: {participant_name}")
    print(f"     Nombre de stages: {participant.stages.count()}")
    print(f"     Stages: {', '.join(stage_names)}")
    
    # Supprimer
    print(f"\n[ACTION] Suppression du participant avec {len(stage_names)} stages...")
    participant.delete()
    
    # Vérifier qu'il n'existe plus
    exists = Participant.objects.filter(id=participant_id).exists()
    
    if not exists:
        print(f"[OK] Participant {participant_name} (ID: {participant_id}) supprime avec succes!")
        print(f"     Toutes les relations ManyToMany ont ete supprimees automatiquement")
        
        # Vérifier que les stages existent toujours
        for stage in stages:
            stage.refresh_from_db()
            print(f"     Stage '{stage.name}' existe toujours: OUI")
        
        return True
    else:
        print(f"[ERROR] Le participant existe toujours apres suppression!")
        return False


def test_delete_all_participants():
    """
    Test 4: Supprimer tous les participants (nettoyage complet).
    """
    print("\n" + "="*60)
    print("TEST 4: Suppression en masse - tous les participants")
    print("="*60)
    
    initial_count = Participant.objects.count()
    print(f"\n[INFO] Nombre de participants AVANT suppression: {initial_count}")
    
    if initial_count == 0:
        print(f"[INFO] Aucun participant a supprimer")
        return True
    
    # Afficher la liste
    print(f"\n[INFO] Liste des participants:")
    for p in Participant.objects.all()[:10]:  # Limiter à 10 pour l'affichage
        print(f"     - ID: {p.id}, Nom: {p.full_name}, Email: {p.email}")
    
    if initial_count > 10:
        print(f"     ... et {initial_count - 10} autres")
    
    # Supprimer tous
    print(f"\n[ACTION] Suppression de tous les participants...")
    deleted_count, _ = Participant.objects.all().delete()
    
    # Vérifier
    final_count = Participant.objects.count()
    print(f"\n[INFO] Nombre de participants APRES suppression: {final_count}")
    
    if final_count == 0:
        print(f"[OK] Tous les participants ({deleted_count}) ont ete supprimes avec succes!")
        return True
    else:
        print(f"[ERROR] Il reste {final_count} participant(s) apres suppression!")
        return False


def test_delete_participant_via_queryset():
    """
    Test 5: Supprimer un participant via queryset.filter().delete().
    """
    print("\n" + "="*60)
    print("TEST 5: Suppression via queryset (methode alternative)")
    print("="*60)
    
    # Créer un participant
    user = User.objects.first()
    stage = Stage.objects.first()
    
    participant = Participant.objects.create(
        first_name='Delete',
        last_name='Test5',
        email='delete.test5@example.com',
        gender='F',
        age=27,
        language='Francais',
        status='student',
        created_by=user
    )
    participant.stages.add(stage)
    
    participant_id = participant.id
    participant_email = participant.email
    
    print(f"\n[INFO] Participant cree: ID {participant_id}, Email: {participant_email}")
    
    # Supprimer via queryset
    print(f"\n[ACTION] Suppression via Participant.objects.filter(...).delete()...")
    deleted_count, details = Participant.objects.filter(email=participant_email).delete()
    
    print(f"[INFO] Nombre d'objets supprimes: {deleted_count}")
    print(f"[INFO] Details: {details}")
    
    # Vérifier
    exists = Participant.objects.filter(id=participant_id).exists()
    
    if not exists:
        print(f"[OK] Participant supprime avec succes via queryset!")
        return True
    else:
        print(f"[ERROR] Le participant existe toujours!")
        return False


def run_all_tests():
    """Exécuter tous les tests de suppression."""
    print("\n" + "="*70)
    print(" TESTS DE SUPPRESSION DE PARTICIPANTS ".center(70, "="))
    print("="*70)
    
    results = []
    
    # Test 1: Suppression simple
    try:
        result1 = test_delete_participant_simple()
        results.append(("Suppression participant simple", result1))
    except Exception as e:
        print(f"\n[ERROR] Test 1 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Suppression participant simple", False))
    
    # Test 2: Suppression avec assignation
    try:
        result2 = test_delete_participant_assigned()
        results.append(("Suppression participant assigne", result2))
    except Exception as e:
        print(f"\n[ERROR] Test 2 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Suppression participant assigne", False))
    
    # Test 3: Suppression avec plusieurs stages
    try:
        result3 = test_delete_participant_multiple_stages()
        results.append(("Suppression participant multi-stages", result3))
    except Exception as e:
        print(f"\n[ERROR] Test 3 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Suppression participant multi-stages", False))
    
    # Test 4: Suppression en masse
    try:
        result4 = test_delete_all_participants()
        results.append(("Suppression en masse", result4))
    except Exception as e:
        print(f"\n[ERROR] Test 4 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Suppression en masse", False))
    
    # Test 5: Suppression via queryset
    try:
        result5 = test_delete_participant_via_queryset()
        results.append(("Suppression via queryset", result5))
    except Exception as e:
        print(f"\n[ERROR] Test 5 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Suppression via queryset", False))
    
    # Résumé final
    print("\n" + "="*70)
    print(" RESUME DES TESTS DE SUPPRESSION ".center(70, "="))
    print("="*70)
    
    for test_name, result in results:
        status_icon = "[OK]  " if result else "[FAIL]"
        print(f"{status_icon} {test_name}")
    
    total = len(results)
    passed = sum(1 for _, r in results if r)
    
    print("\n" + "="*70)
    print(f" RESULTAT: {passed}/{total} tests passes ".center(70, "="))
    print("="*70)
    
    if passed == total:
        print("\n[SUCCESS] TOUS LES TESTS DE SUPPRESSION SONT PASSES !")
        print("[INFO] La fonctionnalite DELETE fonctionne parfaitement.")
        return True
    else:
        print(f"\n[WARNING] {total - passed} test(s) echoue(s)")
        print("[ACTION] Verifiez les messages d'erreur ci-dessus pour diagnostiquer.")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    
    print("\n" + "="*70)
    print(" INFORMATIONS COMPLEMENTAIRES ".center(70, "="))
    print("="*70)
    print("\n[INFO] Pour tester la suppression via l'API:")
    print("     1. Demarrez le serveur: python manage.py runserver")
    print("     2. Utilisez l'interface React ou un outil comme Postman")
    print("     3. DELETE /api/participants/<id>/")
    print("\n[INFO] Etat actuel de la base:")
    print(f"     - Participants: {Participant.objects.count()}")
    print(f"     - Stages: {Stage.objects.count()}")
    print(f"     - Villages: {Village.objects.count()}")
    print(f"     - Bungalows: {Bungalow.objects.count()}")
    
    sys.exit(0 if success else 1)

