#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test spécifique : Création de participants identiques dans différents stages.
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

from participants.models import Stage, Participant
from django.contrib.auth import get_user_model
from datetime import date, timedelta

User = get_user_model()


def test_same_participant_different_stages():
    """
    Test: Créer un participant dans un stage spécifique, 
    puis un autre participant identique (même nom, âge, etc.) 
    mais dans un autre stage.
    """
    print("\n" + "="*60)
    print("TEST: Participants identiques dans differents stages")
    print("="*60)
    
    # Nettoyer les anciens participants de test
    Participant.objects.filter(email__startswith='john.doe').delete()
    Participant.objects.filter(email__startswith='john2.doe').delete()
    
    # Créer deux stages différents
    user = User.objects.first()
    if not user:
        print("[ERROR] Aucun utilisateur trouve. Lancez 'python init_db.py'")
        return False
    
    # Stage 1
    stage1 = Stage.objects.create(
        name='Danse Contemporaine',
        start_date=date.today(),
        end_date=date.today() + timedelta(days=30),
        instructor='Germaine Acogny',
        capacity=20,
        created_by=user
    )
    print(f"\n[OK] Stage 1 cree: {stage1.name}")
    
    # Stage 2
    stage2 = Stage.objects.create(
        name='Danse Traditionnelle',
        start_date=date.today() + timedelta(days=35),
        end_date=date.today() + timedelta(days=65),
        instructor='Patrick Acogny',
        capacity=15,
        created_by=user
    )
    print(f"[OK] Stage 2 cree: {stage2.name}")
    
    # Participant 1 : John Doe dans Stage 1
    participant1 = Participant.objects.create(
        first_name='John',
        last_name='Doe',
        email='john.doe1@example.com',
        gender='M',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    participant1.stages.add(stage1)
    
    print(f"\n[OK] Participant 1 cree:")
    print(f"     Nom: {participant1.first_name} {participant1.last_name}")
    print(f"     Email: {participant1.email}")
    print(f"     Stages: {[s.name for s in participant1.stages.all()]}")
    
    # Participant 2 : John Doe (même personne) dans Stage 2
    # (En réalité ça pourrait être une personne différente avec le même nom)
    participant2 = Participant.objects.create(
        first_name='John',  # Même prénom
        last_name='Doe',    # Même nom
        email='john2.doe@example.com',  # Email différent (obligatoire)
        gender='M',         # Même genre
        age=25,             # Même âge
        language='Francais',  # Même langue
        status='student',   # Même statut
        created_by=user
    )
    participant2.stages.add(stage2)
    
    print(f"\n[OK] Participant 2 cree:")
    print(f"     Nom: {participant2.first_name} {participant2.last_name}")
    print(f"     Email: {participant2.email}")
    print(f"     Stages: {[s.name for s in participant2.stages.all()]}")
    
    # Vérifications
    assert participant1.first_name == participant2.first_name, "Les noms devraient être identiques"
    assert participant1.last_name == participant2.last_name, "Les prénoms devraient être identiques"
    assert participant1.email != participant2.email, "Les emails doivent être différents"
    assert participant1.age == participant2.age, "Les âges devraient être identiques"
    
    print("\n[OK] Les deux participants ont ete crees avec succes!")
    print(f"     Ils ont le meme nom mais des emails differents")
    print(f"     Participant 1 -> Stage: {stage1.name}")
    print(f"     Participant 2 -> Stage: {stage2.name}")
    
    return True


def test_same_participant_in_multiple_stages():
    """
    Test: Un MÊME participant inscrit dans PLUSIEURS stages simultanément.
    """
    print("\n" + "="*60)
    print("TEST: UN participant dans PLUSIEURS stages")
    print("="*60)
    
    # Nettoyer
    Participant.objects.filter(email='jane.multi@example.com').delete()
    
    user = User.objects.first()
    
    # Créer deux stages qui se chevauchent
    stage1 = Stage.objects.create(
        name='Stage Matin - Technique de Base',
        start_date=date.today(),
        end_date=date.today() + timedelta(days=60),
        instructor='Instructeur Matin',
        capacity=20,
        created_by=user
    )
    
    stage2 = Stage.objects.create(
        name='Stage Apres-midi - Chorégraphie',
        start_date=date.today(),
        end_date=date.today() + timedelta(days=60),
        instructor='Instructeur Apres-midi',
        capacity=15,
        created_by=user
    )
    
    print(f"\n[OK] Stages crees:")
    print(f"     - {stage1.name}")
    print(f"     - {stage2.name}")
    
    # Créer UN participant inscrit aux DEUX stages
    participant = Participant.objects.create(
        first_name='Jane',
        last_name='MultiStage',
        email='jane.multi@example.com',
        gender='F',
        age=28,
        language='Francais',
        status='student',
        created_by=user
    )
    
    # Assigner les DEUX stages
    participant.stages.add(stage1, stage2)
    
    print(f"\n[OK] Participant cree et inscrit a PLUSIEURS stages:")
    print(f"     Nom: {participant.first_name} {participant.last_name}")
    print(f"     Email: {participant.email}")
    print(f"     Nombre de stages: {participant.stages.count()}")
    print(f"     Stages:")
    for stage in participant.stages.all():
        print(f"       - {stage.name}")
    
    # Vérifications
    assert participant.stages.count() == 2, "Le participant devrait avoir 2 stages"
    assert stage1 in participant.stages.all(), "Le stage 1 devrait être dans la liste"
    assert stage2 in participant.stages.all(), "Le stage 2 devrait être dans la liste"
    
    print("\n[OK] UN participant peut bien avoir PLUSIEURS stages simultanement!")
    
    return True


def test_email_unique_constraint():
    """
    Test: Vérifier qu'on ne peut pas créer deux participants avec le même email.
    """
    print("\n" + "="*60)
    print("TEST: Contrainte d'unicite de l'email")
    print("="*60)
    
    # Nettoyer
    Participant.objects.filter(email='same.email@example.com').delete()
    
    user = User.objects.first()
    stage = Stage.objects.first()
    
    # Créer le premier participant
    participant1 = Participant.objects.create(
        first_name='First',
        last_name='Person',
        email='same.email@example.com',
        gender='M',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    participant1.stages.add(stage)
    
    print(f"\n[OK] Premier participant cree avec email: {participant1.email}")
    
    # Essayer de créer un deuxième participant avec le MÊME email
    print("\n[TEST] Tentative de creation avec le MEME email...")
    
    try:
        participant2 = Participant.objects.create(
            first_name='Second',
            last_name='Person',
            email='same.email@example.com',  # Même email !
            gender='F',
            age=30,
            language='Anglais',
            status='instructor',
            created_by=user
        )
        print("[ERROR] La creation aurait du echouer!")
        return False
    except Exception as e:
        print(f"[OK] Creation bloquee comme prevu!")
        print(f"     Erreur: {type(e).__name__}")
        return True


def run_all_tests():
    """Exécuter tous les tests."""
    print("\n" + "="*70)
    print(" TESTS PARTICIPANTS - MULTI-STAGES & CONTRAINTES ".center(70, "="))
    print("="*70)
    
    results = []
    
    # Test 1: Participants identiques dans différents stages
    try:
        result1 = test_same_participant_different_stages()
        results.append(("Participants identiques - stages differents", result1))
    except Exception as e:
        print(f"\n[ERROR] Test 1 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Participants identiques - stages differents", False))
    
    # Test 2: Un participant dans plusieurs stages
    try:
        result2 = test_same_participant_in_multiple_stages()
        results.append(("UN participant - PLUSIEURS stages", result2))
    except Exception as e:
        print(f"\n[ERROR] Test 2 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("UN participant - PLUSIEURS stages", False))
    
    # Test 3: Contrainte d'unicité email
    try:
        result3 = test_email_unique_constraint()
        results.append(("Contrainte unicite email", result3))
    except Exception as e:
        print(f"\n[ERROR] Test 3 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Contrainte unicite email", False))
    
    # Résumé final
    print("\n" + "="*70)
    print(" RESUME DES TESTS ".center(70, "="))
    print("="*70)
    
    for test_name, result in results:
        status_icon = "[OK]" if result else "[FAIL]"
        print(f"{status_icon} {test_name}")
    
    total = len(results)
    passed = sum(1 for _, r in results if r)
    
    print("\n" + "="*70)
    print(f" RESULTAT: {passed}/{total} tests passes ".center(70, "="))
    print("="*70)
    
    if passed == total:
        print("\n[SUCCESS] TOUS LES TESTS SONT PASSES !")
        return True
    else:
        print(f"\n[WARNING] {total - passed} test(s) echoue(s)")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

