#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test: Même email dans différents stages (mais pas dans le même).
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

from participants.models import Stage, Participant
from django.contrib.auth import get_user_model
from datetime import date, timedelta

User = get_user_model()


def test_same_email_different_stages():
    """
    Test: Créer des participants avec le MÊME email dans des stages DIFFÉRENTS.
    Cela devrait FONCTIONNER.
    """
    print("\n" + "="*60)
    print("TEST: MEME EMAIL dans STAGES DIFFERENTS")
    print("="*60)
    
    # Nettoyer
    Participant.objects.filter(email='marie@example.com').delete()
    
    user = User.objects.first()
    
    # Créer deux stages différents
    stage1 = Stage.objects.create(
        name='Danse Matin',
        start_date=date.today(),
        end_date=date.today() + timedelta(days=30),
        instructor='Prof Matin',
        capacity=20,
        created_by=user
    )
    
    stage2 = Stage.objects.create(
        name='Danse Soir',
        start_date=date.today(),
        end_date=date.today() + timedelta(days=30),
        instructor='Prof Soir',
        capacity=15,
        created_by=user
    )
    
    print(f"\n[INFO] Stages crees:")
    print(f"     - Stage 1: {stage1.name}")
    print(f"     - Stage 2: {stage2.name}")
    
    # Participant 1 : Marie dans Stage 1
    p1 = Participant.objects.create(
        first_name='Marie',
        last_name='Dupont',
        email='marie@example.com',  # ← Email
        gender='F',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    p1.stages.add(stage1)
    
    print(f"\n[OK] Participant 1 cree:")
    print(f"     Nom: {p1.full_name}")
    print(f"     Email: {p1.email}")
    print(f"     Stage: {stage1.name}")
    
    # Participant 2 : Marie dans Stage 2 (MÊME email, stage différent)
    print(f"\n[TEST] Creation participant avec MEME email dans stage DIFFERENT...")
    
    try:
        p2 = Participant.objects.create(
            first_name='Marie',
            last_name='Dupont',
            email='marie@example.com',  # ← MÊME email !
            gender='F',
            age=25,
            language='Francais',
            status='student',
            created_by=user
        )
        p2.stages.add(stage2)  # ← Stage DIFFÉRENT
        
        print(f"[OK] Participant 2 cree avec SUCCES!")
        print(f"     Nom: {p2.full_name}")
        print(f"     Email: {p2.email} (MEME que participant 1)")
        print(f"     Stage: {stage2.name} (DIFFERENT)")
        
        print(f"\n[SUCCES] MEME email dans stages DIFFERENTS: AUTORISE !")
        return True
    except Exception as e:
        print(f"[ERROR] Creation bloquee: {e}")
        print(f"[FAIL] Cela ne devrait PAS echouer!")
        return False


def test_same_email_same_stage():
    """
    Test: Créer deux participants avec le MÊME email dans le MÊME stage.
    Cela devrait ÉCHOUER.
    """
    print("\n" + "="*60)
    print("TEST: MEME EMAIL dans le MEME STAGE")
    print("="*60)
    
    # Nettoyer
    Participant.objects.filter(email='duplicate@example.com').delete()
    
    user = User.objects.first()
    stage = Stage.objects.first()
    
    print(f"\n[INFO] Stage utilise: {stage.name}")
    
    # Participant 1
    p1 = Participant.objects.create(
        first_name='User1',
        last_name='Test',
        email='duplicate@example.com',
        gender='M',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    p1.stages.add(stage)
    
    print(f"\n[OK] Participant 1 cree:")
    print(f"     Email: {p1.email}")
    print(f"     Stage: {stage.name}")
    
    # Participant 2 : MÊME email, MÊME stage
    print(f"\n[TEST] Creation participant avec MEME email dans MEME stage...")
    
    try:
        p2 = Participant.objects.create(
            first_name='User2',
            last_name='Test',
            email='duplicate@example.com',  # ← MÊME email
            gender='F',
            age=28,
            language='Francais',
            status='student',
            created_by=user
        )
        p2.stages.add(stage)  # ← MÊME stage
        
        print(f"[ERROR] Participant 2 cree (ne devrait PAS etre possible!)")
        print(f"[FAIL] La contrainte n'a pas fonctionne!")
        
        # Nettoyer
        p2.delete()
        return False
    except Exception as e:
        print(f"[OK] Creation bloquee comme prevu!")
        print(f"     Erreur: {type(e).__name__}")
        print(f"\n[SUCCES] MEME email dans MEME stage: INTERDIT !")
        return True


def test_via_serializer():
    """
    Test via le serializer (comme l'API le ferait).
    """
    print("\n" + "="*60)
    print("TEST: Via Serializer (comme l'API)")
    print("="*60)
    
    from participants.serializers import ParticipantCreateSerializer
    from rest_framework.request import Request
    from django.test import RequestFactory
    
    # Nettoyer
    Participant.objects.filter(email='serializer.test@example.com').delete()
    
    user = User.objects.first()
    
    # Créer 2 stages
    stage1 = Stage.objects.create(
        name='Stage Serializer 1',
        start_date=date.today(),
        end_date=date.today() + timedelta(days=7),
        instructor='Test',
        capacity=10,
        created_by=user
    )
    
    stage2 = Stage.objects.create(
        name='Stage Serializer 2',
        start_date=date.today(),
        end_date=date.today() + timedelta(days=7),
        instructor='Test',
        capacity=10,
        created_by=user
    )
    
    # Test 1: Créer dans stage1
    data1 = {
        'first_name': 'Test',
        'last_name': 'Serializer',
        'email': 'serializer.test@example.com',
        'gender': 'M',
        'age': 25,
        'language': 'Francais',
        'status': 'student',
        'stages': [stage1]
    }
    
    serializer1 = ParticipantCreateSerializer(data=data1)
    if serializer1.is_valid():
        p1 = serializer1.save(created_by=user)
        print(f"\n[OK] Participant 1 cree via serializer")
        print(f"     Email: {p1.email}, Stage: {stage1.name}")
    else:
        print(f"[ERROR] Serializer 1 invalide: {serializer1.errors}")
        return False
    
    # Test 2: Créer dans stage2 avec MÊME email
    data2 = {
        'first_name': 'Test',
        'last_name': 'Serializer',
        'email': 'serializer.test@example.com',  # MÊME email
        'gender': 'M',
        'age': 25,
        'language': 'Francais',
        'status': 'student',
        'stages': [stage2]  # Stage DIFFÉRENT
    }
    
    print(f"\n[TEST] Creation avec MEME email, stage DIFFERENT...")
    serializer2 = ParticipantCreateSerializer(data=data2)
    
    if serializer2.is_valid():
        p2 = serializer2.save(created_by=user)
        print(f"[OK] Participant 2 cree via serializer!")
        print(f"     Email: {p2.email} (MEME)")
        print(f"     Stage: {stage2.name} (DIFFERENT)")
        print(f"\n[SUCCES] Via serializer: AUTORISE pour stages differents!")
        return True
    else:
        print(f"[ERROR] Serializer 2 invalide: {serializer2.errors}")
        print(f"[FAIL] Devrait etre valide pour un stage different!")
        return False


def run_all_tests():
    """Exécuter tous les tests."""
    print("\n" + "="*70)
    print(" TEST CONTRAINTE EMAIL PAR STAGE ".center(70, "="))
    print("="*70)
    
    results = []
    
    # Test 1
    try:
        result1 = test_same_email_different_stages()
        results.append(("MEME email - stages DIFFERENTS", result1))
    except Exception as e:
        print(f"\n[ERROR] Test 1: {e}")
        import traceback
        traceback.print_exc()
        results.append(("MEME email - stages DIFFERENTS", False))
    
    # Test 2
    try:
        result2 = test_same_email_same_stage()
        results.append(("MEME email - MEME stage", result2))
    except Exception as e:
        print(f"\n[ERROR] Test 2: {e}")
        import traceback
        traceback.print_exc()
        results.append(("MEME email - MEME stage", False))
    
    # Test 3
    try:
        result3 = test_via_serializer()
        results.append(("Via Serializer API", result3))
    except Exception as e:
        print(f"\n[ERROR] Test 3: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Via Serializer API", False))
    
    # Résumé
    print("\n" + "="*70)
    print(" RESUME ".center(70, "="))
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
        print("\n[SUCCESS] La contrainte email par stage fonctionne!")
        print("\n[INFO] Regles:")
        print("  - Email marie@example.com + Stage A + Stage B = OK")
        print("  - Email marie@example.com + Stage A + Stage A = INTERDIT")
        return True
    else:
        print(f"\n[WARNING] {total - passed} test(s) echoue(s)")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

