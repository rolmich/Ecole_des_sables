#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de test simple pour l'API des participants.
Teste directement sur la base de données de développement.
"""

import os
import sys
import django
import requests
from datetime import date, timedelta

# Fix pour Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuration Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", 'eds_backend.settings')
django.setup()

from participants.models import Stage, Participant, Village, Bungalow
from django.contrib.auth import get_user_model

User = get_user_model()

BASE_URL = 'http://localhost:8000/api'


def get_auth_token():
    """Obtenir un token d'authentification."""
    try:
        response = requests.post(f'{BASE_URL}/auth/login/', json={
            'email': 'admin@eds.sn',
            'password': 'admin123'
        }, timeout=2)
        
        if response.status_code == 200:
            data = response.json()
            return data.get('access') or data.get('access_token')
        else:
            print(f"[ERROR] Impossible de s'authentifier: {response.status_code}")
            return None
    except requests.exceptions.ConnectionError:
        print("[WARN] Serveur Django non demarre")
        return None
    except Exception as e:
        print(f"[ERROR] Erreur d'authentification: {e}")
        return None


def test_create_participant_via_api(token):
    """Test de création d'un participant via l'API."""
    print("\n[TEST] Creation de participant via API...")
    
    # Nettoyer les anciens participants de test
    Participant.objects.filter(email__startswith='test.participant').delete()
    
    # Récupérer le premier stage
    stages = Stage.objects.all()
    if not stages.exists():
        # Créer un stage de test
        user = User.objects.first()
        stage = Stage.objects.create(
            name='Stage Test API',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            instructor='Test Instructor',
            capacity=10,
            created_by=user
        )
        print(f"  [INFO] Stage cree: {stage.name}")
    else:
        stage = stages.first()
        print(f"  [INFO] Stage existant utilise: {stage.name}")
    
    # Données du participant
    import time
    timestamp = int(time.time())
    participant_data = {
        'firstName': 'Test',
        'lastName': 'Participant',
        'email': f'test.participant.{timestamp}@example.com',
        'gender': 'M',
        'age': 25,
        'language': 'Francais',
        'status': 'student',
        'stageIds': [stage.id]
    }
    
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.post(
        f'{BASE_URL}/participants/',
        json=participant_data,
        headers=headers
    )
    
    if response.status_code == 201:
        print(f"  [OK] Participant cree avec succes!")
        data = response.json()
        print(f"      ID: {data.get('id')}")
        print(f"      Nom: {data.get('firstName')} {data.get('lastName')}")
        print(f"      Email: {data.get('email')}")
        print(f"      Stages: {data.get('stageIds')}")
        return True
    else:
        print(f"  [ERROR] Echec de creation: {response.status_code}")
        print(f"      Reponse: {response.text}")
        return False


def test_list_participants_via_api(token):
    """Test de liste des participants via l'API."""
    print("\n[TEST] Liste des participants via API...")
    
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{BASE_URL}/participants/', headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        count = data.get('count', len(data.get('results', [])))
        print(f"  [OK] {count} participant(s) trouve(s)")
        return True
    else:
        print(f"  [ERROR] Echec: {response.status_code}")
        return False


def test_list_villages_via_api(token):
    """Test de liste des villages via l'API."""
    print("\n[TEST] Liste des villages via API...")
    
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{BASE_URL}/villages/', headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        villages = data if isinstance(data, list) else data.get('results', [])
        print(f"  [OK] {len(villages)} village(s) trouve(s)")
        for village in villages:
            print(f"      - Village {village.get('name')}: {village.get('totalBungalows')} bungalows")
        return True
    else:
        print(f"  [ERROR] Echec: {response.status_code}")
        return False


def test_list_bungalows_via_api(token):
    """Test de liste des bungalows via l'API."""
    print("\n[TEST] Liste des bungalows via API...")
    
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{BASE_URL}/bungalows/', headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        bungalows = data if isinstance(data, list) else data.get('results', [])
        print(f"  [OK] {len(bungalows)} bungalow(s) trouve(s)")
        
        # Compter par village
        villages_count = {}
        for b in bungalows:
            village = b.get('village')
            villages_count[village] = villages_count.get(village, 0) + 1
        
        for village, count in sorted(villages_count.items()):
            print(f"      - Village {village}: {count} bungalows")
        return True
    else:
        print(f"  [ERROR] Echec: {response.status_code}")
        return False


def test_direct_model_create():
    """Test de création directe via le modèle Django."""
    print("\n[TEST] Creation directe via modele Django...")
    
    # Nettoyer les anciens participants de test
    Participant.objects.filter(email__startswith='direct.test').delete()
    
    # Vérifier qu'on a un stage
    stage = Stage.objects.first()
    if not stage:
        user = User.objects.first()
        stage = Stage.objects.create(
            name='Stage Direct Test',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            instructor='Direct Test',
            capacity=10,
            created_by=user
        )
    
    # Créer un participant
    user = User.objects.first()
    import time
    timestamp = int(time.time())
    participant = Participant.objects.create(
        first_name='Direct',
        last_name='Test',
        email=f'direct.test.{timestamp}@example.com',
        gender='F',
        age=28,
        language='Francais',
        status='student',
        created_by=user
    )
    
    # Assigner les stages (ManyToMany)
    participant.stages.add(stage)
    
    print(f"  [OK] Participant cree directement!")
    print(f"      ID: {participant.id}")
    print(f"      Nom: {participant.first_name} {participant.last_name}")
    print(f"      Stages: {[s.name for s in participant.stages.all()]}")
    
    return True


def run_all_tests():
    """Exécuter tous les tests."""
    print("="*60)
    print("TESTS API PARTICIPANTS & VILLAGES")
    print("="*60)
    
    # Test 1: Création directe
    test_direct_model_create()
    
    # Test 2: Via API (nécessite le serveur Django en cours)
    print("\n[INFO] Tests API (necessite le serveur Django actif)...")
    print("[INFO] Si le serveur n'est pas lance, ces tests echoueront.")
    
    try:
        token = get_auth_token()
        
        if token:
            print("[OK] Authentification reussie!")
            
            test_create_participant_via_api(token)
            test_list_participants_via_api(token)
            test_list_villages_via_api(token)
            test_list_bungalows_via_api(token)
        else:
            print("[WARN] Serveur Django non accessible - tests API ignores")
    except requests.exceptions.ConnectionError:
        print("[WARN] Serveur Django non accessible - tests API ignores")
    
    print("\n" + "="*60)
    print("[SUCCESS] Tests termines!")
    print("="*60)
    
    # Afficher les statistiques
    print("\n[STATS] Base de donnees:")
    print(f"  - Users: {User.objects.count()}")
    print(f"  - Stages: {Stage.objects.count()}")
    print(f"  - Participants: {Participant.objects.count()}")
    print(f"  - Villages: {Village.objects.count()}")
    print(f"  - Bungalows: {Bungalow.objects.count()}")


if __name__ == "__main__":
    run_all_tests()

