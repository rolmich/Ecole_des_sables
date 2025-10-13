#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Créer des stages de démonstration pour tester le système.
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

from participants.models import Stage
from django.contrib.auth import get_user_model
from datetime import date, timedelta

User = get_user_model()


def create_demo_stages():
    """Créer des stages de démonstration."""
    print("\n" + "="*60)
    print("CREATION DE STAGES DE DEMONSTRATION")
    print("="*60)
    
    user = User.objects.filter(role='admin').first()
    if not user:
        user = User.objects.first()
    
    print(f"\n[INFO] Utilisateur createur: {user.email}")
    
    # Nettoyer les anciens stages de test
    Stage.objects.filter(name__startswith='Stage').delete()
    
    today = date.today()
    
    stages_data = [
        {
            'name': 'Danse Contemporaine - Janvier 2025',
            'start_date': date(2025, 1, 11),
            'end_date': date(2025, 1, 31),
            'instructor': 'Germaine Acogny',
            'capacity': 20,
            'constraints': ['Village A ou B', 'Niveau intermédiaire']
        },
        {
            'name': 'Danse Traditionnelle - Février 2025',
            'start_date': date(2025, 2, 1),
            'end_date': date(2025, 2, 28),
            'instructor': 'Patrick Acogny',
            'capacity': 18,
            'constraints': ['Tous villages', 'Tous niveaux']
        },
        {
            'name': 'Chorégraphie Avancée - Mars 2025',
            'start_date': date(2025, 3, 1),
            'end_date': date(2025, 3, 31),
            'instructor': 'Marie Chouinard',
            'capacity': 15,
            'constraints': ['Village C', 'Niveau avancé']
        },
        {
            'name': 'Technique de Base - Avril 2025',
            'start_date': date(2025, 4, 1),
            'end_date': date(2025, 4, 30),
            'instructor': 'Jean Dupont',
            'capacity': 25,
            'constraints': ['Tous villages', 'Débutants']
        },
    ]
    
    print(f"\n[ACTION] Creation de {len(stages_data)} stages...")
    
    created_stages = []
    for stage_data in stages_data:
        stage = Stage.objects.create(
            name=stage_data['name'],
            start_date=stage_data['start_date'],
            end_date=stage_data['end_date'],
            instructor=stage_data['instructor'],
            capacity=stage_data['capacity'],
            constraints=stage_data['constraints'],
            created_by=user
        )
        created_stages.append(stage)
        print(f"\n[OK] Stage cree:")
        print(f"     ID: {stage.id}")
        print(f"     Nom: {stage.name}")
        print(f"     Periode: {stage.start_date.strftime('%d/%m/%Y')} - {stage.end_date.strftime('%d/%m/%Y')}")
        print(f"     Instructeur: {stage.instructor}")
        print(f"     Capacite: {stage.capacity} participants")
    
    print("\n" + "="*60)
    print(f"[SUCCESS] {len(created_stages)} stages crees!")
    print("="*60)
    
    print("\n[INFO] Stages disponibles:")
    for s in Stage.objects.all().order_by('id'):
        print(f"  - ID: {s.id}, Nom: {s.name}")
    
    return created_stages


if __name__ == "__main__":
    create_demo_stages()

