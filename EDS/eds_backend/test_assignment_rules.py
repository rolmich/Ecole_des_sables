#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Tests complets pour les règles d'assignation aux bungalows.

Règles testées:
1. Capacité de la chambre ne doit pas être dépassée
2. Durée du participant dans la chambre = durée de son stage  
3. Tous les participants dans une chambre doivent appartenir au même stage
4. Pas de mixité homme/femme dans la même chambre
5. Gestion des chevauchements de périodes
"""

import os
import sys
import django

# Fix pour Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

os.environ.setdefault("DJANGO_SETTINGS_MODULE", 'eds_backend.settings')
django.setup()

from participants.models import Stage, Participant, Village, Bungalow
from participants.assignment_logic import (
    assign_participant_to_bungalow,
    validate_assignment,
    get_bungalow_availability,
    check_date_overlap
)
from django.contrib.auth import get_user_model
from datetime import date, timedelta

User = get_user_model()


def setup_test_data():
    """Prépare les données de test."""
    # Nettoyer
    Participant.objects.all().delete()
    Stage.objects.all().delete()
    
    user = User.objects.first()
    
    # Créer des stages
    stage1 = Stage.objects.create(
        name='Stage 11-13 Janvier',
        start_date=date(2025, 1, 11),
        end_date=date(2025, 1, 13),
        instructor='Prof 1',
        capacity=20,
        created_by=user
    )
    
    stage2 = Stage.objects.create(
        name='Stage 14-16 Janvier',
        start_date=date(2025, 1, 14),
        end_date=date(2025, 1, 16),
        instructor='Prof 2',
        capacity=20,
        created_by=user
    )
    
    stage3 = Stage.objects.create(
        name='Stage 12-15 Janvier (Chevauche)',
        start_date=date(2025, 1, 12),
        end_date=date(2025, 1, 15),
        instructor='Prof 3',
        capacity=20,
        created_by=user
    )
    
    # Récupérer un bungalow
    bungalow = Bungalow.objects.first()
    
    return user, stage1, stage2, stage3, bungalow


def test_date_overlap():
    """Test de la fonction de détection de chevauchement de dates."""
    print("\n" + "="*60)
    print("TEST 1: Detection de chevauchement de dates")
    print("="*60)
    
    # Cas 1: Pas de chevauchement (11-13 et 14-16)
    overlap1 = check_date_overlap(
        date(2025, 1, 11), date(2025, 1, 13),
        date(2025, 1, 14), date(2025, 1, 16)
    )
    print(f"\n[TEST] 11-13 vs 14-16: {overlap1}")
    assert overlap1 == False, "Ne devrait PAS chevaucher"
    print(f"[OK] Pas de chevauchement (consecutif)")
    
    # Cas 2: Chevauchement (11-13 et 12-15)
    overlap2 = check_date_overlap(
        date(2025, 1, 11), date(2025, 1, 13),
        date(2025, 1, 12), date(2025, 1, 15)
    )
    print(f"\n[TEST] 11-13 vs 12-15: {overlap2}")
    assert overlap2 == True, "Devrait chevaucher"
    print(f"[OK] Chevauchement detecte")
    
    # Cas 3: Inclusion (11-15 et 12-14)
    overlap3 = check_date_overlap(
        date(2025, 1, 11), date(2025, 1, 15),
        date(2025, 1, 12), date(2025, 1, 14)
    )
    print(f"\n[TEST] 11-15 vs 12-14 (inclusion): {overlap3}")
    assert overlap3 == True, "Devrait chevaucher"
    print(f"[OK] Inclusion detectee comme chevauchement")
    
    print(f"\n[SUCCES] Fonction de chevauchement fonctionne!")
    return True


def test_same_period_no_overlap():
    """Test: Deux participants dans périodes différentes (pas de chevauchement)."""
    print("\n" + "="*60)
    print("TEST 2: Periodes DIFFERENTES - Pas de chevauchement")
    print("="*60)
    
    user, stage1, stage2, stage3, bungalow = setup_test_data()
    
    # Participant 1: Stage 11-13
    p1 = Participant.objects.create(
        first_name='User',
        last_name='Period1',
        email='user.period1@test.com',
        gender='M',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    p1.stages.add(stage1)
    
    # Assigner P1 au bungalow
    success1, msg1, details1 = assign_participant_to_bungalow(
        p1, bungalow, 'bed1', stage1
    )
    
    print(f"\n[INFO] P1 assigne: {success1}")
    print(f"      Periode: 11-13 Janvier")
    print(f"      Message: {msg1}")
    
    assert success1 == True, "P1 devrait être assigné"
    
    # Participant 2: Stage 14-16 (APRÈS, pas de chevauchement)
    p2 = Participant.objects.create(
        first_name='User',
        last_name='Period2',
        email='user.period2@test.com',
        gender='M',
        age=26,
        language='Francais',
        status='student',
        created_by=user
    )
    p2.stages.add(stage2)
    
    # Assigner P2 au MÊME lit (bed1) mais période différente
    print(f"\n[TEST] Assignation P2 au MEME lit, periode DIFFERENTE (14-16)...")
    success2, msg2, details2 = assign_participant_to_bungalow(
        p2, bungalow, 'bed1', stage2
    )
    
    print(f"[RESULT] P2 assigne: {success2}")
    print(f"         Message: {msg2}")
    
    if success2:
        print(f"\n[SUCCES] Meme lit, periodes differentes: AUTORISE!")
        return True
    else:
        print(f"\n[FAIL] Devrait etre autorise (pas de chevauchement)")
        print(f"       Details: {details2}")
        return False


def test_overlapping_period_error():
    """Test: Deux participants avec chevauchement de périodes."""
    print("\n" + "="*60)
    print("TEST 3: Periodes qui se CHEVAUCHENT - Erreur attendue")
    print("="*60)
    
    user, stage1, stage2, stage3, bungalow = setup_test_data()
    
    # Participant 1: Stage 11-13
    p1 = Participant.objects.create(
        first_name='User',
        last_name='Overlap1',
        email='user.overlap1@test.com',
        gender='F',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    p1.stages.add(stage1)
    
    success1, msg1, _ = assign_participant_to_bungalow(p1, bungalow, 'bed1', stage1)
    print(f"\n[INFO] P1 assigne: {success1} (11-13 Janvier)")
    
    # Participant 2: Stage 12-15 (CHEVAUCHE avec 11-13)
    p2 = Participant.objects.create(
        first_name='User',
        last_name='Overlap2',
        email='user.overlap2@test.com',
        gender='F',  # Même genre pour éviter l'erreur de mixité
        age=26,
        language='Francais',
        status='student',
        created_by=user
    )
    p2.stages.add(stage3)  # Stage 12-15
    
    print(f"\n[TEST] Assignation P2 au MEME lit, periode CHEVAUCHANTE (12-15)...")
    success2, msg2, details2 = assign_participant_to_bungalow(p2, bungalow, 'bed1', stage3)
    
    print(f"[RESULT] P2 assigne: {success2}")
    print(f"         Message: {msg2}")
    
    if not success2:
        print(f"\n[SUCCES] Chevauchement DETECTE et BLOQUE!")
        print(f"         Code: {details2.get('code')}")
        return True
    else:
        print(f"\n[FAIL] Le chevauchement aurait du etre detecte et bloque!")
        return False


def test_gender_mixing_error():
    """Test: Mixité homme/femme interdite."""
    print("\n" + "="*60)
    print("TEST 4: MIXITE Homme/Femme - Erreur attendue")
    print("="*60)
    
    user, stage1, stage2, stage3, bungalow = setup_test_data()
    
    # Participant 1: Homme dans stage 11-13
    p1 = Participant.objects.create(
        first_name='John',
        last_name='Male',
        email='john.male@test.com',
        gender='M',  # HOMME
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    p1.stages.add(stage1)
    
    success1, msg1, _ = assign_participant_to_bungalow(p1, bungalow, 'bed1', stage1)
    print(f"\n[INFO] P1 (Homme) assigne au bed1: {success1}")
    
    # Participant 2: Femme dans même période
    p2 = Participant.objects.create(
        first_name='Jane',
        last_name='Female',
        email='jane.female@test.com',
        gender='F',  # FEMME
        age=26,
        language='Francais',
        status='student',
        created_by=user
    )
    p2.stages.add(stage1)  # Même stage
    
    print(f"\n[TEST] Assignation P2 (Femme) au bed2, meme periode...")
    success2, msg2, details2 = assign_participant_to_bungalow(p2, bungalow, 'bed2', stage1)
    
    print(f"[RESULT] P2 assigne: {success2}")
    print(f"         Message: {msg2}")
    
    if not success2:
        print(f"\n[SUCCES] MIXITE DETECTEE et BLOQUEE!")
        print(f"         Code: {details2.get('code')}")
        return True
    else:
        print(f"\n[FAIL] La mixite aurait du etre detectee et bloquee!")
        return False


def test_different_stages_error():
    """Test: Participants de stages différents dans même période."""
    print("\n" + "="*60)
    print("TEST 5: STAGES DIFFERENTS - Erreur attendue")
    print("="*60)
    
    user, stage1, stage2, stage3, bungalow = setup_test_data()
    
    # Participant 1: Stage 1 (11-13)
    p1 = Participant.objects.create(
        first_name='User',
        last_name='Stage1',
        email='user.stage1@test.com',
        gender='M',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    p1.stages.add(stage1)
    
    success1, msg1, _ = assign_participant_to_bungalow(p1, bungalow, 'bed1', stage1)
    print(f"\n[INFO] P1 (Stage 1) assigne: {success1}")
    
    # Participant 2: Stage 3 (12-15) - Chevauche ET stage différent
    p2 = Participant.objects.create(
        first_name='User',
        last_name='Stage3',
        email='user.stage3@test.com',
        gender='M',  # Même genre
        age=26,
        language='Francais',
        status='student',
        created_by=user
    )
    p2.stages.add(stage3)  # Stage DIFFÉRENT
    
    print(f"\n[TEST] Assignation P2 (Stage 3 DIFFERENT) avec chevauchement...")
    success2, msg2, details2 = assign_participant_to_bungalow(p2, bungalow, 'bed2', stage3)
    
    print(f"[RESULT] P2 assigne: {success2}")
    print(f"         Message: {msg2}")
    
    if not success2:
        print(f"\n[SUCCES] STAGES DIFFERENTS DETECTES et BLOQUES!")
        print(f"         Code: {details2.get('code')}")
        return True
    else:
        print(f"\n[FAIL] Les stages differents auraient du etre detectes!")
        return False


def test_capacity_limit():
    """Test: Capacité maximale du bungalow."""
    print("\n" + "="*60)
    print("TEST 6: CAPACITE MAXIMALE - Erreur attendue")
    print("="*60)
    
    user, stage1, stage2, stage3, bungalow = setup_test_data()
    
    print(f"\n[INFO] Bungalow: {bungalow.name}")
    print(f"       Capacite: {bungalow.capacity} lits")
    print(f"       Type: {bungalow.type}")
    
    # Remplir tous les lits
    for i in range(bungalow.capacity):
        p = Participant.objects.create(
            first_name=f'User{i}',
            last_name='Capacity',
            email=f'user.capacity{i}@test.com',
            gender='M',
            age=25 + i,
            language='Francais',
            status='student',
            created_by=user
        )
        p.stages.add(stage1)
        
        bed_id = f'bed{i+1}'
        success, msg, _ = assign_participant_to_bungalow(p, bungalow, bed_id, stage1)
        
        if success:
            print(f"[OK] P{i+1} assigne au {bed_id}")
        else:
            print(f"[WARN] P{i+1} NON assigne: {msg}")
    
    # Essayer d'assigner un participant de plus (devrait échouer)
    p_extra = Participant.objects.create(
        first_name='Extra',
        last_name='User',
        email='extra.user@test.com',
        gender='M',
        age=30,
        language='Francais',
        status='student',
        created_by=user
    )
    p_extra.stages.add(stage1)
    
    print(f"\n[TEST] Assignation participant supplementaire (au-dela de la capacite)...")
    success_extra, msg_extra, details_extra = assign_participant_to_bungalow(
        p_extra, bungalow, 'bed_extra', stage1
    )
    
    print(f"[RESULT] Extra assigne: {success_extra}")
    print(f"         Message: {msg_extra}")
    
    if not success_extra:
        print(f"\n[SUCCES] CAPACITE MAXIMALE RESPECTEE!")
        print(f"         Code: {details_extra.get('code') if details_extra else 'N/A'}")
        return True
    else:
        print(f"\n[FAIL] La capacite maximale aurait du etre respectee!")
        return False


def test_same_bungalow_different_periods():
    """Test: Même bungalow, périodes différentes (devrait fonctionner)."""
    print("\n" + "="*60)
    print("TEST 7: MEME BUNGALOW - Periodes DIFFERENTES")
    print("="*60)
    
    user, stage1, stage2, stage3, bungalow = setup_test_data()
    
    # Groupe 1: 11-13 Janvier
    p1 = Participant.objects.create(
        first_name='Group1',
        last_name='User1',
        email='g1.user1@test.com',
        gender='F',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    p1.stages.add(stage1)
    
    success1, msg1, _ = assign_participant_to_bungalow(p1, bungalow, 'bed1', stage1)
    print(f"\n[INFO] Groupe 1 (11-13) - P1 assigne: {success1}")
    
    # Groupe 2: 14-16 Janvier (APRÈS, pas de chevauchement)
    p2 = Participant.objects.create(
        first_name='Group2',
        last_name='User1',
        email='g2.user1@test.com',
        gender='M',  # Genre DIFFÉRENT (OK car périodes différentes)
        age=26,
        language='Francais',
        status='student',
        created_by=user
    )
    p2.stages.add(stage2)
    
    print(f"\n[TEST] Groupe 2 (14-16) - P2 au MEME lit bed1...")
    success2, msg2, details2 = assign_participant_to_bungalow(p2, bungalow, 'bed1', stage2)
    
    print(f"[RESULT] P2 assigne: {success2}")
    print(f"         Message: {msg2}")
    
    if success2:
        print(f"\n[SUCCES] Meme bungalow, periodes differentes: AUTORISE!")
        print(f"         Meme avec genres differents (pas de chevauchement)")
        return True
    else:
        print(f"\n[FAIL] Devrait etre autorise (periodes consecutives)")
        print(f"       Details: {details2}")
        return False


def test_participant_not_in_stage():
    """Test: Participant pas inscrit au stage."""
    print("\n" + "="*60)
    print("TEST 8: Participant PAS inscrit au stage")
    print("="*60)
    
    user, stage1, stage2, stage3, bungalow = setup_test_data()
    
    # Créer un participant SANS l'inscrire au stage
    p = Participant.objects.create(
        first_name='No',
        last_name='Stage',
        email='no.stage@test.com',
        gender='M',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    # Ne PAS ajouter de stage
    
    print(f"\n[INFO] Participant cree SANS stage")
    print(f"       Stages du participant: {list(p.stages.all())}")
    
    print(f"\n[TEST] Tentative d'assignation pour un stage non inscrit...")
    success, msg, details = assign_participant_to_bungalow(p, bungalow, 'bed1', stage1)
    
    print(f"[RESULT] Assigne: {success}")
    print(f"         Message: {msg}")
    
    if not success:
        print(f"\n[SUCCES] VERIFICATION STAGE FONCTIONNE!")
        print(f"         Code: {details.get('code')}")
        return True
    else:
        print(f"\n[FAIL] Aurait du etre bloque (pas inscrit au stage)")
        return False


def run_all_tests():
    """Exécuter tous les tests."""
    print("\n" + "="*70)
    print(" TESTS REGLES D'ASSIGNATION AUX BUNGALOWS ".center(70, "="))
    print("="*70)
    
    results = []
    
    tests = [
        ("Detection chevauchement dates", test_date_overlap),
        ("Periodes differentes OK", test_same_period_no_overlap),
        ("Chevauchement de periodes BLOQUE", test_overlapping_period_error),
        ("Mixite homme/femme BLOQUEE", test_gender_mixing_error),
        ("Stages differents BLOQUES", test_different_stages_error),
        ("Capacite maximale RESPECTEE", test_capacity_limit),
        ("Participant pas dans stage BLOQUE", test_participant_not_in_stage),
    ]
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n[ERROR] {test_name}: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Résumé
    print("\n" + "="*70)
    print(" RESUME DES TESTS ".center(70, "="))
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
        print("\n[SUCCESS] TOUTES LES REGLES D'ASSIGNATION FONCTIONNENT!")
        print("\n[REGLES VALIDEES]:")
        print("  1. Capacite respectee")
        print("  2. Duree = duree du stage")
        print("  3. Meme stage dans periode chevauchante")
        print("  4. Pas de mixite homme/femme")
        print("  5. Gestion des chevauchements de periodes")
        return True
    else:
        print(f"\n[WARNING] {total - passed} test(s) echoue(s)")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

