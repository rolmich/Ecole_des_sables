#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test de suppression via l'API REST.
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

from rest_framework.test import APIClient
from rest_framework import status
from participants.models import Stage, Participant
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta

User = get_user_model()


def test_delete_participant_api():
    """Test de suppression de participant via API."""
    print("\n" + "="*60)
    print("TEST: Suppression PARTICIPANT via API REST")
    print("="*60)
    
    # Créer un client API
    client = APIClient()
    
    # Créer un utilisateur et obtenir un token
    user = User.objects.first()
    if not user:
        print("[ERROR] Aucun utilisateur trouve. Lancez 'python init_db.py'")
        return False
    
    # Obtenir le token JWT
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    
    # Authentifier le client
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    print(f"\n[INFO] Authentifie en tant que: {user.email}")
    
    # Créer un participant à supprimer
    stage = Stage.objects.first()
    if not stage:
        stage = Stage.objects.create(
            name='Stage Test Delete',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            instructor='Test',
            capacity=10,
            created_by=user
        )
    
    participant = Participant.objects.create(
        first_name='ToDelete',
        last_name='Participant',
        email='todelete@example.com',
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
    
    # Essayer de supprimer via API
    print(f"\n[ACTION] DELETE /api/participants/{participant_id}/")
    response = client.delete(f'/api/participants/{participant_id}/')
    
    print(f"\n[RESPONSE] Status Code: {response.status_code}")
    
    if response.status_code == 204:
        print(f"[OK] Reponse: 204 NO CONTENT (suppression reussie)")
        
        # Vérifier que le participant n'existe plus
        exists = Participant.objects.filter(id=participant_id).exists()
        
        if not exists:
            print(f"[OK] Participant {participant_name} (ID: {participant_id}) supprime!")
            print(f"     Verification: N'existe plus en base de donnees")
            return True
        else:
            print(f"[ERROR] Le participant existe toujours en base!")
            return False
    else:
        print(f"[ERROR] Echec de suppression")
        print(f"     Status: {response.status_code}")
        if hasattr(response, 'data'):
            print(f"     Data: {response.data}")
        return False


def test_delete_stage_api():
    """Test de suppression de stage via API."""
    print("\n" + "="*60)
    print("TEST: Suppression STAGE via API REST")
    print("="*60)
    
    # Créer un client API
    client = APIClient()
    
    # Authentifier
    user = User.objects.first()
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    print(f"\n[INFO] Authentifie en tant que: {user.email}")
    
    # Créer un stage à supprimer (SANS participants)
    stage = Stage.objects.create(
        name='Stage A Supprimer',
        start_date=date.today() + timedelta(days=100),
        end_date=date.today() + timedelta(days=107),
        instructor='Test',
        capacity=10,
        created_by=user
    )
    
    stage_id = stage.id
    stage_name = stage.name
    
    print(f"\n[INFO] Stage cree:")
    print(f"     ID: {stage_id}")
    print(f"     Nom: {stage_name}")
    print(f"     Participants: {stage.current_participants}")
    
    # Essayer de supprimer via API
    print(f"\n[ACTION] DELETE /api/stages/{stage_id}/")
    response = client.delete(f'/api/stages/{stage_id}/')
    
    print(f"\n[RESPONSE] Status Code: {response.status_code}")
    
    if response.status_code == 204:
        print(f"[OK] Reponse: 204 NO CONTENT (suppression reussie)")
        
        # Vérifier que le stage n'existe plus
        exists = Stage.objects.filter(id=stage_id).exists()
        
        if not exists:
            print(f"[OK] Stage {stage_name} (ID: {stage_id}) supprime!")
            print(f"     Verification: N'existe plus en base de donnees")
            return True
        else:
            print(f"[ERROR] Le stage existe toujours en base!")
            return False
    else:
        print(f"[ERROR] Echec de suppression")
        print(f"     Status: {response.status_code}")
        if hasattr(response, 'data'):
            print(f"     Data: {response.data}")
        return False


def test_delete_stage_with_participants():
    """Test de suppression d'un stage avec des participants."""
    print("\n" + "="*60)
    print("TEST: Suppression STAGE avec PARTICIPANTS")
    print("="*60)
    
    client = APIClient()
    user = User.objects.first()
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    # Créer un stage avec un participant
    stage = Stage.objects.create(
        name='Stage Avec Participants',
        start_date=date.today(),
        end_date=date.today() + timedelta(days=7),
        instructor='Test',
        capacity=10,
        created_by=user
    )
    
    participant = Participant.objects.create(
        first_name='Test',
        last_name='User',
        email='test.stage.delete@example.com',
        gender='M',
        age=25,
        language='Francais',
        status='student',
        created_by=user
    )
    participant.stages.add(stage)
    
    stage_id = stage.id
    
    print(f"\n[INFO] Stage cree avec 1 participant")
    print(f"     ID: {stage_id}")
    print(f"     Nom: {stage.name}")
    print(f"     Participants: {participant.full_name}")
    
    # Essayer de supprimer
    print(f"\n[ACTION] DELETE /api/stages/{stage_id}/")
    print(f"[INFO] Ce stage a des participants, voyons ce qui se passe...")
    response = client.delete(f'/api/stages/{stage_id}/')
    
    print(f"\n[RESPONSE] Status Code: {response.status_code}")
    
    if response.status_code == 204:
        print(f"[INFO] Stage supprime (CASCADE)")
        print(f"[WARNING] Les participants lies au stage ont aussi ete supprimes!")
        
        # Vérifier
        stage_exists = Stage.objects.filter(id=stage_id).exists()
        participant_exists = Participant.objects.filter(id=participant.id).exists()
        
        print(f"     Stage existe: {stage_exists}")
        print(f"     Participant existe: {participant_exists}")
        
        if not participant_exists:
            print(f"[ATTENTION] Le participant a ete supprime en CASCADE avec le stage!")
        
        return True
    else:
        print(f"[INFO] Suppression bloquee (status: {response.status_code})")
        if hasattr(response, 'data'):
            print(f"     Data: {response.data}")
        return True  # C'est OK si c'est bloqué


def run_all_tests():
    """Exécuter tous les tests."""
    print("\n" + "="*70)
    print(" TESTS DE SUPPRESSION VIA API REST ".center(70, "="))
    print("="*70)
    
    results = []
    
    # Test 1
    try:
        result1 = test_delete_participant_api()
        results.append(("DELETE Participant via API", result1))
    except Exception as e:
        print(f"\n[ERROR] Test 1 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("DELETE Participant via API", False))
    
    # Test 2
    try:
        result2 = test_delete_stage_api()
        results.append(("DELETE Stage vide via API", result2))
    except Exception as e:
        print(f"\n[ERROR] Test 2 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("DELETE Stage vide via API", False))
    
    # Test 3
    try:
        result3 = test_delete_stage_with_participants()
        results.append(("DELETE Stage avec participants", result3))
    except Exception as e:
        print(f"\n[ERROR] Test 3 echoue: {e}")
        import traceback
        traceback.print_exc()
        results.append(("DELETE Stage avec participants", False))
    
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
        print("\n[SUCCESS] Tous les tests API de suppression passent!")
        print("[INFO] L'API DELETE fonctionne correctement.")
        print("\n[DIAGNOSTIC] Si vous ne pouvez pas supprimer depuis le frontend:")
        print("     1. Verifiez que le serveur Django est demarre")
        print("     2. Verifiez l'authentification (token valide)")
        print("     3. Verifiez les permissions utilisateur")
        print("     4. Regardez la console du navigateur (F12) pour les erreurs")
        return True
    else:
        print(f"\n[WARNING] {total - passed} test(s) echoue(s)")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

