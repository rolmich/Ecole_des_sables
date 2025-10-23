#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Diagnostic complet pour les problèmes de suppression.
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


def diagnostic_complete():
    """Diagnostic complet du système de suppression."""
    print("\n" + "="*70)
    print(" DIAGNOSTIC SUPPRESSION - PARTICIPANTS & STAGES ".center(70, "="))
    print("="*70)
    
    # 1. Vérifier les utilisateurs
    print("\n[1] VERIFICATION DES UTILISATEURS")
    print("-" * 70)
    users = User.objects.all()
    print(f"Nombre d'utilisateurs: {users.count()}")
    for user in users:
        print(f"  - {user.email} (role: {user.role if hasattr(user, 'role') else 'N/A'})")
    
    # 2. Vérifier les participants
    print("\n[2] VERIFICATION DES PARTICIPANTS")
    print("-" * 70)
    participants = Participant.objects.all()
    print(f"Nombre de participants: {participants.count()}")
    
    if participants.count() == 0:
        print("[INFO] Aucun participant en base. Creation d'un participant de test...")
        
        user = User.objects.first()
        stage = Stage.objects.first()
        
        if not stage:
            stage = Stage.objects.create(
                name='Stage Test Diagnostic',
                start_date=date.today(),
                end_date=date.today() + timedelta(days=7),
                instructor='Test',
                capacity=10,
                created_by=user
            )
        
        participant = Participant.objects.create(
            first_name='Test',
            last_name='Diagnostic',
            email='test.diagnostic@example.com',
            gender='M',
            age=25,
            language='Francais',
            status='student',
            created_by=user
        )
        participant.stages.add(stage)
        print(f"  [OK] Participant de test cree: {participant.full_name} (ID: {participant.id})")
        participants = Participant.objects.all()
    
    for p in participants[:5]:
        stages_names = [s.name for s in p.stages.all()]
        print(f"  - ID: {p.id}, Nom: {p.full_name}, Email: {p.email}")
        print(f"    Stages: {', '.join(stages_names) if stages_names else 'Aucun'}")
        print(f"    Created by: {p.created_by.email if p.created_by else 'None'}")
    
    if participants.count() > 5:
        print(f"  ... et {participants.count() - 5} autres")
    
    # 3. Vérifier les stages
    print("\n[3] VERIFICATION DES STAGES")
    print("-" * 70)
    stages = Stage.objects.all()
    print(f"Nombre de stages: {stages.count()}")
    for s in stages[:5]:
        participant_count = s.participants.count()
        print(f"  - ID: {s.id}, Nom: {s.name}")
        print(f"    Participants: {participant_count}")
        print(f"    Created by: {s.created_by.email if s.created_by else 'None'}")
    
    # 4. Test de suppression directe
    print("\n[4] TEST SUPPRESSION DIRECTE (VIA MODELE)")
    print("-" * 70)
    
    # Créer un participant de test
    user = User.objects.first()
    stage = Stage.objects.first()
    
    test_participant = Participant.objects.create(
        first_name='Delete',
        last_name='DirectTest',
        email='delete.direct.test@example.com',
        gender='F',
        age=27,
        language='Francais',
        status='student',
        created_by=user
    )
    test_participant.stages.add(stage)
    
    test_id = test_participant.id
    print(f"[INFO] Participant de test cree: ID {test_id}")
    
    # Supprimer
    try:
        test_participant.delete()
        exists = Participant.objects.filter(id=test_id).exists()
        if not exists:
            print(f"[OK] Suppression directe fonctionne!")
        else:
            print(f"[ERROR] La suppression a echoue!")
    except Exception as e:
        print(f"[ERROR] Exception lors de la suppression: {e}")
        import traceback
        traceback.print_exc()
    
    # 5. Informations sur les permissions
    print("\n[5] VERIFICATION DES PERMISSIONS")
    print("-" * 70)
    print("Permissions configurees dans les vues:")
    print("  - StageRetrieveUpdateDestroyView: IsAuthenticated")
    print("  - ParticipantRetrieveUpdateDestroyView: IsAuthenticated")
    print("\n[INFO] Toute personne authentifiee peut supprimer!")
    print("       Si vous voulez restreindre, il faut ajouter des permissions personnalisees.")
    
    # 6. Endpoints API
    print("\n[6] ENDPOINTS DE SUPPRESSION")
    print("-" * 70)
    print("DELETE /api/participants/<id>/")
    print("  -> Permission: IsAuthenticated")
    print("  -> Vue: ParticipantRetrieveUpdateDestroyView")
    print("\nDELETE /api/stages/<id>/")
    print("  -> Permission: IsAuthenticated")
    print("  -> Vue: StageRetrieveUpdateDestroyView")
    
    # 7. Conseils de débogage
    print("\n[7] DEBOGAGE FRONTEND")
    print("-" * 70)
    print("Si la suppression ne fonctionne pas depuis le frontend:")
    print("\n1. Verifiez la console du navigateur (F12)")
    print("   - Erreurs JavaScript?")
    print("   - Erreurs de requete HTTP?")
    print("   - Token d'authentification present?")
    print("\n2. Verifiez le Network tab (F12)")
    print("   - La requete DELETE est-elle envoyee?")
    print("   - Quel est le status code de la reponse?")
    print("   - Quel est le message d'erreur?")
    print("\n3. Verifiez l'authentification")
    print("   - Etes-vous connecte?")
    print("   - Le token est-il valide?")
    print("   - Le token est-il envoye dans les headers?")
    print("\n4. Testez avec curl ou Postman")
    print("   curl -X DELETE http://localhost:8000/api/participants/<ID>/ \\")
    print("        -H 'Authorization: Bearer <TOKEN>'")
    
    print("\n" + "="*70)
    print(" FIN DU DIAGNOSTIC ".center(70, "="))
    print("="*70)


if __name__ == "__main__":
    diagnostic_complete()

