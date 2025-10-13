#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Test des restrictions sur les modifications de stages et participants."""

import os
import sys
import io
import django
from datetime import date, timedelta

# Fix pour Windows UTF-8
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eds_backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from participants.models import Stage, Participant, Village, Bungalow
from participants.serializers import StageUpdateSerializer, ParticipantUpdateSerializer

def test_stage_date_modification_restriction():
    """Test: Empêcher la modification des dates d'un stage avec participants assignés."""
    print("\n" + "="*80)
    print("TEST 1: Modification des dates d'un stage avec participants assignés")
    print("="*80)
    
    # Créer un stage
    stage = Stage.objects.create(
        name="Stage Test Restriction",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=7),
        instructor="Prof Test",
        capacity=10
    )
    print(f"✅ Stage créé: {stage}")
    
    # Créer un village et un bungalow
    village, _ = Village.objects.get_or_create(name='A', defaults={'amenities_type': 'shared'})
    bungalow, _ = Bungalow.objects.get_or_create(
        village=village,
        name='A1',
        defaults={
            'type': 'A',
            'capacity': 3,
            'beds': [
                {'id': 'bed1', 'type': 'simple', 'occupiedBy': None},
                {'id': 'bed2', 'type': 'simple', 'occupiedBy': None},
                {'id': 'bed3', 'type': 'simple', 'occupiedBy': None}
            ]
        }
    )
    print(f"✅ Bungalow créé: {bungalow}")
    
    # Créer un participant et l'assigner au stage
    participant = Participant.objects.create(
        first_name="Jean",
        last_name="Dupont",
        email="jean.dupont@test.com",
        gender='M',
        age=25,
        language="Français",
        status="student"
    )
    participant.stages.add(stage)
    print(f"✅ Participant créé et assigné au stage: {participant}")
    
    # Essayer de modifier les dates (devrait fonctionner car pas encore assigné à un bungalow)
    print("\n📝 Tentative de modification des dates (participant non assigné)...")
    serializer = StageUpdateSerializer(
        stage,
        data={'startDate': str(date.today() + timedelta(days=1))},
        partial=True
    )
    if serializer.is_valid():
        serializer.save()
        print("✅ Modification réussie (normal, participant non assigné)")
    else:
        print(f"❌ Erreur: {serializer.errors}")
    
    # Assigner le participant à un bungalow
    participant.assigned_bungalow = bungalow
    participant.assigned_bed = 'bed1'
    participant.save()
    bungalow.beds[0]['occupiedBy'] = participant.id
    bungalow.save()
    print(f"\n✅ Participant assigné au bungalow {bungalow.name}, lit {participant.assigned_bed}")
    
    # Essayer de modifier les dates (devrait échouer)
    print("\n📝 Tentative de modification des dates (participant assigné)...")
    serializer = StageUpdateSerializer(
        stage,
        data={'startDate': str(date.today() + timedelta(days=2))},
        partial=True
    )
    if serializer.is_valid():
        serializer.save()
        print("❌ ÉCHEC: La modification ne devrait PAS être autorisée!")
    else:
        print(f"✅ Modification bloquée (attendu): {serializer.errors}")
    
    # Nettoyage
    participant.delete()
    bungalow.delete()
    stage.delete()
    print("\n🧹 Nettoyage effectué")


def test_participant_stage_modification_restriction():
    """Test: Empêcher la modification du stage d'un participant assigné."""
    print("\n" + "="*80)
    print("TEST 2: Modification du stage d'un participant assigné à un bungalow")
    print("="*80)
    
    # Créer deux stages
    stage1 = Stage.objects.create(
        name="Stage 1",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=7),
        instructor="Prof 1",
        capacity=10
    )
    stage2 = Stage.objects.create(
        name="Stage 2",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=7),
        instructor="Prof 2",
        capacity=10
    )
    print(f"✅ Stages créés: {stage1}, {stage2}")
    
    # Créer un village et un bungalow
    village, _ = Village.objects.get_or_create(name='B', defaults={'amenities_type': 'shared'})
    bungalow, _ = Bungalow.objects.get_or_create(
        village=village,
        name='B1',
        defaults={
            'type': 'A',
            'capacity': 3,
            'beds': [
                {'id': 'bed1', 'type': 'simple', 'occupiedBy': None},
                {'id': 'bed2', 'type': 'simple', 'occupiedBy': None},
                {'id': 'bed3', 'type': 'simple', 'occupiedBy': None}
            ]
        }
    )
    print(f"✅ Bungalow créé: {bungalow}")
    
    # Créer un participant et l'assigner au stage1
    participant = Participant.objects.create(
        first_name="Marie",
        last_name="Martin",
        email="marie.martin@test.com",
        gender='F',
        age=28,
        language="Français",
        status="student"
    )
    participant.stages.add(stage1)
    print(f"✅ Participant créé et assigné au stage 1: {participant}")
    
    # Essayer de modifier le stage (devrait fonctionner car pas encore assigné à un bungalow)
    print("\n📝 Tentative de modification du stage (participant non assigné)...")
    serializer = ParticipantUpdateSerializer(
        participant,
        data={'stageIds': [stage2.id]},
        partial=True
    )
    if serializer.is_valid():
        serializer.save()
        print(f"✅ Modification réussie (normal, participant non assigné): stages = {[s.name for s in participant.stages.all()]}")
    else:
        print(f"❌ Erreur: {serializer.errors}")
    
    # Remettre sur stage1 et assigner au bungalow
    participant.stages.set([stage1])
    participant.assigned_bungalow = bungalow
    participant.assigned_bed = 'bed1'
    participant.save()
    bungalow.beds[0]['occupiedBy'] = participant.id
    bungalow.save()
    print(f"\n✅ Participant assigné au bungalow {bungalow.name}, lit {participant.assigned_bed}")
    
    # Essayer de modifier le stage (devrait échouer)
    print("\n📝 Tentative de modification du stage (participant assigné)...")
    serializer = ParticipantUpdateSerializer(
        participant,
        data={'stageIds': [stage2.id]},
        partial=True
    )
    if serializer.is_valid():
        serializer.save()
        print("❌ ÉCHEC: La modification ne devrait PAS être autorisée!")
    else:
        print(f"✅ Modification bloquée (attendu): {serializer.errors}")
    
    # Nettoyage
    participant.delete()
    bungalow.delete()
    stage1.delete()
    stage2.delete()
    print("\n🧹 Nettoyage effectué")


def test_assigned_counts():
    """Test: Vérifier les compteurs de participants et bungalows assignés."""
    print("\n" + "="*80)
    print("TEST 3: Compteurs de participants et bungalows assignés")
    print("="*80)
    
    # Créer un stage
    stage = Stage.objects.create(
        name="Stage Compteurs",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=7),
        instructor="Prof Compteurs",
        capacity=20
    )
    print(f"✅ Stage créé: {stage}")
    
    # Créer des bungalows
    village, _ = Village.objects.get_or_create(name='C', defaults={'amenities_type': 'shared'})
    bungalow1, _ = Bungalow.objects.get_or_create(
        village=village,
        name='C1',
        defaults={
            'type': 'A',
            'capacity': 3,
            'beds': [
                {'id': 'bed1', 'type': 'simple', 'occupiedBy': None},
                {'id': 'bed2', 'type': 'simple', 'occupiedBy': None},
                {'id': 'bed3', 'type': 'simple', 'occupiedBy': None}
            ]
        }
    )
    bungalow2, _ = Bungalow.objects.get_or_create(
        village=village,
        name='C2',
        defaults={
            'type': 'A',
            'capacity': 3,
            'beds': [
                {'id': 'bed1', 'type': 'simple', 'occupiedBy': None},
                {'id': 'bed2', 'type': 'simple', 'occupiedBy': None},
                {'id': 'bed3', 'type': 'simple', 'occupiedBy': None}
            ]
        }
    )
    print(f"✅ Bungalows créés: {bungalow1}, {bungalow2}")
    
    # Créer 5 participants
    participants = []
    for i in range(5):
        p = Participant.objects.create(
            first_name=f"Participant{i}",
            last_name=f"Test{i}",
            email=f"participant{i}@test.com",
            gender='M' if i % 2 == 0 else 'F',
            age=20 + i,
            language="Français",
            status="student"
        )
        p.stages.add(stage)
        participants.append(p)
    print(f"✅ {len(participants)} participants créés et assignés au stage")
    
    # Assigner 3 participants au bungalow1
    for i in range(3):
        participants[i].assigned_bungalow = bungalow1
        participants[i].assigned_bed = f'bed{i+1}'
        participants[i].save()
        bungalow1.beds[i]['occupiedBy'] = participants[i].id
    bungalow1.save()
    print(f"\n✅ 3 participants assignés au bungalow {bungalow1.name}")
    
    # Assigner 2 participants au bungalow2
    for i in range(3, 5):
        participants[i].assigned_bungalow = bungalow2
        participants[i].assigned_bed = f'bed{i-2}'
        participants[i].save()
        bungalow2.beds[i-3]['occupiedBy'] = participants[i].id
    bungalow2.save()
    print(f"✅ 2 participants assignés au bungalow {bungalow2.name}")
    
    # Rafraîchir le stage depuis la DB
    stage.refresh_from_db()
    
    # Vérifier les compteurs
    print(f"\n📊 Statistiques du stage:")
    print(f"   - Total participants: {stage.current_participants}")
    print(f"   - Participants assignés: {stage.assigned_participants_count}")
    print(f"   - Bungalows utilisés: {stage.assigned_bungalows_count}")
    
    assert stage.assigned_participants_count == 5, f"Attendu 5, obtenu {stage.assigned_participants_count}"
    assert stage.assigned_bungalows_count == 2, f"Attendu 2, obtenu {stage.assigned_bungalows_count}"
    print("✅ Compteurs corrects!")
    
    # Nettoyage
    for p in participants:
        p.delete()
    bungalow1.delete()
    bungalow2.delete()
    stage.delete()
    print("\n🧹 Nettoyage effectué")


if __name__ == '__main__':
    print("\n" + "="*80)
    print("🧪 TESTS DES RESTRICTIONS STAGE/PARTICIPANT")
    print("="*80)
    
    try:
        test_stage_date_modification_restriction()
        test_participant_stage_modification_restriction()
        test_assigned_counts()
        
        print("\n" + "="*80)
        print("✅ TOUS LES TESTS RÉUSSIS!")
        print("="*80)
    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

