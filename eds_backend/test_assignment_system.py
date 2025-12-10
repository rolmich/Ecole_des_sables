"""
Script de test complet pour le système d'assignation des bungalows.
Teste les cas de:
- Chevauchement de dates
- Sureffectif dans une chambre
- Respect des règles (encadrants seuls, musiciens ensemble, etc.)
- Assignations multiples au même lit
"""

import os
import django
import sys
from datetime import datetime, timedelta, time

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eds_backend.settings')
django.setup()

from participants.models import Participant, Stage, ParticipantStage, Bungalow, Village
from participants.assignment_logic import assign_participants_automatically_for_stage

def print_header(title):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)

def print_section(title):
    print(f"\n--- {title} ---")

def create_test_data():
    """Créer des données de test avec différents scénarios."""
    print_header("CRÉATION DES DONNÉES DE TEST")

    # Nettoyer les anciennes données de test
    print_section("Nettoyage des données existantes")
    ParticipantStage.objects.all().delete()
    Participant.objects.filter(email__endswith='@test.com').delete()
    Stage.objects.filter(name__startswith='TEST_').delete()

    # Réinitialiser les lits des bungalows
    for bungalow in Bungalow.objects.all():
        for bed in bungalow.beds:
            bed['occupiedBy'] = None
        bungalow.save()
        bungalow.update_occupancy()

    print("[OK] Données nettoyées")

    # Créer des événements de test
    print_section("Création des événements")

    base_date = datetime.now().date()

    # Événement 1: 10 jours (du 1er au 10)
    stage1 = Stage.objects.create(
        name='TEST_Event_1',
        start_date=base_date + timedelta(days=1),
        end_date=base_date + timedelta(days=10),
        capacity=20,
        event_type='stage'
    )
    print(f"[OK] {stage1.name}: {stage1.start_date} -> {stage1.end_date}")

    # Événement 2: Chevauche partiellement avec l'événement 1 (du 5 au 15)
    stage2 = Stage.objects.create(
        name='TEST_Event_2',
        start_date=base_date + timedelta(days=5),
        end_date=base_date + timedelta(days=15),
        capacity=15,
        event_type='workshop'
    )
    print(f"[OK] {stage2.name}: {stage2.start_date} -> {stage2.end_date}")

    # Événement 3: Après les deux autres (du 16 au 20)
    stage3 = Stage.objects.create(
        name='TEST_Event_3',
        start_date=base_date + timedelta(days=16),
        end_date=base_date + timedelta(days=20),
        capacity=10,
        event_type='stage'
    )
    print(f"[OK] {stage3.name}: {stage3.start_date} -> {stage3.end_date}")

    # Créer des participants de test
    print_section("Création des participants")

    participants = []

    # 3 Encadrants
    for i in range(1, 4):
        p = Participant.objects.create(
            first_name=f'Encadrant{i}',
            last_name='TEST',
            email=f'encadrant{i}@test.com',
            gender='M' if i % 2 == 0 else 'F',
            status='instructor',
            nationality='FR',
            age=40 + i
        )
        participants.append(p)
        print(f"[OK] {p.full_name} (Encadrant)")

    # 5 Musiciens
    for i in range(1, 6):
        p = Participant.objects.create(
            first_name=f'Musicien{i}',
            last_name='TEST',
            email=f'musicien{i}@test.com',
            gender='M' if i % 2 == 0 else 'F',
            status='professional',
            nationality='SN',
            age=30 + i
        )
        participants.append(p)
        print(f"[OK] {p.full_name} (Musicien)")

    # 12 Étudiants
    for i in range(1, 13):
        p = Participant.objects.create(
            first_name=f'Etudiant{i}',
            last_name='TEST',
            email=f'etudiant{i}@test.com',
            gender='M' if i % 2 == 0 else 'F',
            status='student',
            nationality='FR' if i % 3 == 0 else 'US',
            age=18 + i
        )
        participants.append(p)
        print(f"[OK] {p.full_name} (Étudiant)")

    return stage1, stage2, stage3, participants

def create_registrations(stage1, stage2, stage3, participants):
    """Créer les inscriptions avec différents scénarios."""
    print_header("CRÉATION DES INSCRIPTIONS")

    base_date = datetime.now().date()

    # Scénario 1: EVENT 1 - Participants qui restent toute la durée
    print_section(f"Inscriptions pour {stage1.name}")

    # 2 Encadrants pour l'événement 1
    for i in range(2):
        reg = ParticipantStage.objects.create(
            participant=participants[i],
            stage=stage1,
            role='instructor',
            arrival_date=stage1.start_date,
            departure_date=stage1.end_date,
            arrival_time=time(14, 0),
            departure_time=time(12, 0)
        )
        print(f"[OK] {reg.participant.full_name} - {reg.arrival_date} -> {reg.departure_date}")

    # 3 Musiciens pour l'événement 1
    for i in range(3, 6):
        reg = ParticipantStage.objects.create(
            participant=participants[i],
            stage=stage1,
            role='musician',
            arrival_date=stage1.start_date,
            departure_date=stage1.end_date,
            arrival_time=time(16, 0),
            departure_time=time(10, 0)
        )
        print(f"[OK] {reg.participant.full_name} - {reg.arrival_date} -> {reg.departure_date}")

    # 6 Étudiants pour l'événement 1
    for i in range(8, 14):
        reg = ParticipantStage.objects.create(
            participant=participants[i],
            stage=stage1,
            role='participant',
            arrival_date=stage1.start_date,
            departure_date=stage1.end_date,
            arrival_time=time(15, 0),
            departure_time=time(11, 0)
        )
        print(f"[OK] {reg.participant.full_name} - {reg.arrival_date} -> {reg.departure_date}")

    # Scénario 2: EVENT 2 - Certains arrivent pendant que l'événement 1 est en cours
    print_section(f"Inscriptions pour {stage2.name} (CHEVAUCHEMENT avec Event 1)")

    # 1 Encadrant qui arrive pendant l'événement 1 (jour 5)
    reg = ParticipantStage.objects.create(
        participant=participants[2],
        stage=stage2,
        role='instructor',
        arrival_date=stage2.start_date,
        departure_date=stage2.end_date,
        arrival_time=time(14, 0),
        departure_time=time(12, 0)
    )
    print(f"[OK] {reg.participant.full_name} - {reg.arrival_date} -> {reg.departure_date} (CHEVAUCHEMENT)")

    # 2 Musiciens pour l'événement 2
    for i in range(6, 8):
        reg = ParticipantStage.objects.create(
            participant=participants[i],
            stage=stage2,
            role='musician',
            arrival_date=stage2.start_date,
            departure_date=stage2.end_date,
            arrival_time=time(16, 0),
            departure_time=time(10, 0)
        )
        print(f"[OK] {reg.participant.full_name} - {reg.arrival_date} -> {reg.departure_date}")

    # 5 Étudiants pour l'événement 2
    for i in range(14, 19):
        reg = ParticipantStage.objects.create(
            participant=participants[i],
            stage=stage2,
            role='participant',
            arrival_date=stage2.start_date,
            departure_date=stage2.end_date,
            arrival_time=time(15, 0),
            departure_time=time(11, 0)
        )
        print(f"[OK] {reg.participant.full_name} - {reg.arrival_date} -> {reg.departure_date}")

    # Scénario 3: EVENT 3 - Participants avec dates personnalisées
    print_section(f"Inscriptions pour {stage3.name}")

    # Étudiant qui part avant la fin
    reg = ParticipantStage.objects.create(
        participant=participants[19],
        stage=stage3,
        role='participant',
        arrival_date=stage3.start_date,
        departure_date=stage3.start_date + timedelta(days=2),  # Part 2 jours avant la fin
        arrival_time=time(15, 0),
        departure_time=time(11, 0)
    )
    print(f"[OK] {reg.participant.full_name} - {reg.arrival_date} -> {reg.departure_date} (DÉPART ANTICIPÉ)")

    # Étudiant qui arrive en retard
    reg = ParticipantStage.objects.create(
        participant=participants[8],
        stage=stage3,
        role='participant',
        arrival_date=stage3.start_date + timedelta(days=2),  # Arrive 2 jours après le début
        departure_date=stage3.end_date,
        arrival_time=time(18, 0),
        departure_time=time(10, 0)
    )
    print(f"[OK] {reg.participant.full_name} - {reg.arrival_date} -> {reg.departure_date} (ARRIVÉE TARDIVE)")

def test_assignment(stage):
    """Tester l'assignation automatique pour un événement."""
    print_header(f"TEST D'ASSIGNATION: {stage.name}")

    print_section("État avant assignation")
    registrations = ParticipantStage.objects.filter(stage=stage, assigned_bungalow__isnull=True)
    print(f"Inscriptions non assignées: {registrations.count()}")
    for reg in registrations:
        print(f"  - {reg.participant.full_name} ({reg.role}) : {reg.arrival_date} -> {reg.departure_date}")

    print_section("Lancement de l'assignation automatique")
    result = assign_participants_automatically_for_stage(stage.id)

    print_section("Résultats")
    print(f"[{'OK' if result['success'] else 'ERREUR'}] Succès: {result['success']}")
    print(f"Total assigné: {result['summary']['total_assigned']}")
    print(f"Total échoué: {result['summary']['total_failed']}")
    print(f"Taux de réussite: {result['summary']['success_rate']}%")

    if result['assignments']:
        print("\nAssignations réussies:")
        for assignment in result['assignments']:
            print(f"  [OK] {assignment['participant_name']} -> {assignment['bungalow_name']} (lit: {assignment['bed_id']})")

    if result['failures']:
        print("\nÉchecs:")
        for failure in result['failures']:
            print(f"  [ERREUR] {failure['participant_name']}: {failure['reason']}")

    return result

def check_overlaps():
    """Vérifier les chevauchements de dates dans les assignations."""
    print_header("VÉRIFICATION DES CHEVAUCHEMENTS")

    issues = []

    # Pour chaque bungalow
    for bungalow in Bungalow.objects.all():
        if not bungalow.beds:
            continue

        for bed in bungalow.beds:
            if not bed.get('occupiedBy'):
                continue

            bed_id = bed['id']

            # Récupérer toutes les inscriptions pour ce lit
            registrations = ParticipantStage.objects.filter(
                assigned_bungalow=bungalow,
                assigned_bed=bed_id
            ).select_related('participant', 'stage')

            if registrations.count() > 1:
                # Vérifier les chevauchements
                reg_list = list(registrations)
                for i, reg1 in enumerate(reg_list):
                    for reg2 in reg_list[i+1:]:
                        # Dates effectives
                        start1 = reg1.effective_arrival_date
                        end1 = reg1.effective_departure_date
                        start2 = reg2.effective_arrival_date
                        end2 = reg2.effective_departure_date

                        # Vérifier le chevauchement
                        if end1 >= start2 and start1 <= end2:
                            issue = {
                                'type': 'CHEVAUCHEMENT',
                                'bungalow': bungalow.name,
                                'bed': bed_id,
                                'participant1': f"{reg1.participant.full_name} ({reg1.stage.name})",
                                'dates1': f"{start1} -> {end1}",
                                'participant2': f"{reg2.participant.full_name} ({reg2.stage.name})",
                                'dates2': f"{start2} -> {end2}"
                            }
                            issues.append(issue)

    # Vérifier les sureffectifs
    for bungalow in Bungalow.objects.all():
        registrations = ParticipantStage.objects.filter(assigned_bungalow=bungalow)

        if registrations.count() > bungalow.capacity:
            issue = {
                'type': 'SUREFFECTIF',
                'bungalow': bungalow.name,
                'capacity': bungalow.capacity,
                'assigned': registrations.count(),
                'participants': [f"{r.participant.full_name} ({r.stage.name})" for r in registrations]
            }
            issues.append(issue)

    if issues:
        print(f"\n[ATTENTION] {len(issues)} problème(s) détecté(s):\n")
        for issue in issues:
            if issue['type'] == 'CHEVAUCHEMENT':
                print(f"[ERREUR] CHEVAUCHEMENT dans {issue['bungalow']} - {issue['bed']}")
                print(f"  - {issue['participant1']}: {issue['dates1']}")
                print(f"  - {issue['participant2']}: {issue['dates2']}")
            elif issue['type'] == 'SUREFFECTIF':
                print(f"[ERREUR] SUREFFECTIF dans {issue['bungalow']}")
                print(f"  Capacité: {issue['capacity']}, Assignés: {issue['assigned']}")
                for p in issue['participants']:
                    print(f"    - {p}")
            print()
    else:
        print("[OK] Aucun problème de chevauchement ou sureffectif détecté")

    return issues

def check_rules():
    """Vérifier le respect des règles d'assignation."""
    print_header("VÉRIFICATION DES RÈGLES D'ASSIGNATION")

    violations = []

    # Règle 1: Les encadrants doivent être seuls
    print_section("Règle 1: Encadrants seuls dans leur chambre")
    instructors = ParticipantStage.objects.filter(
        role='instructor',
        assigned_bungalow__isnull=False
    ).select_related('assigned_bungalow', 'participant')

    for instructor in instructors:
        # Compter les autres occupants du même bungalow pendant la même période
        other_occupants = ParticipantStage.objects.filter(
            assigned_bungalow=instructor.assigned_bungalow
        ).exclude(id=instructor.id)

        if other_occupants.exists():
            # Vérifier le chevauchement de dates
            for other in other_occupants:
                if (instructor.effective_departure_date >= other.effective_arrival_date and
                    instructor.effective_arrival_date <= other.effective_departure_date):
                    violation = {
                        'rule': 'Encadrant seul',
                        'instructor': instructor.participant.full_name,
                        'bungalow': instructor.assigned_bungalow.name,
                        'other': other.participant.full_name,
                        'dates': f"{instructor.effective_arrival_date} -> {instructor.effective_departure_date}"
                    }
                    violations.append(violation)
                    print(f"[ERREUR] {instructor.participant.full_name} partage {instructor.assigned_bungalow.name} avec {other.participant.full_name}")

    if not violations:
        print("[OK] Tous les encadrants sont seuls dans leur chambre")

    # Règle 2: Les musiciens dans le Village C
    print_section("Règle 2: Musiciens dans le Village C")
    musicians = ParticipantStage.objects.filter(
        role='musician',
        assigned_bungalow__isnull=False
    ).select_related('assigned_bungalow', 'participant')

    for musician in musicians:
        if musician.assigned_bungalow.village != 'C':
            violation = {
                'rule': 'Musiciens dans Village C',
                'musician': musician.participant.full_name,
                'bungalow': musician.assigned_bungalow.name,
                'village': musician.assigned_bungalow.village
            }
            violations.append(violation)
            print(f"[ATTENTION] {musician.participant.full_name} assigné à {musician.assigned_bungalow.name} (Village {musician.assigned_bungalow.village})")

    if musicians.filter(assigned_bungalow__village='C').count() == musicians.count():
        print("[OK] Tous les musiciens sont dans le Village C")

    # Règle 3: Pas de mixité dans les chambres
    print_section("Règle 3: Pas de mixité dans les chambres")
    for bungalow in Bungalow.objects.all():
        registrations = ParticipantStage.objects.filter(
            assigned_bungalow=bungalow
        ).select_related('participant')

        if registrations.count() > 1:
            genders = set(r.participant.gender for r in registrations)
            if len(genders) > 1:
                violation = {
                    'rule': 'Pas de mixité',
                    'bungalow': bungalow.name,
                    'participants': [f"{r.participant.full_name} ({r.participant.gender})" for r in registrations]
                }
                violations.append(violation)
                print(f"[ERREUR] Mixité dans {bungalow.name}:")
                for p in violation['participants']:
                    print(f"    - {p}")

    if not any(v['rule'] == 'Pas de mixité' for v in violations):
        print("[OK] Pas de mixité dans les chambres")

    print_section("Résumé")
    if violations:
        print(f"[ATTENTION] {len(violations)} violation(s) de règles détectée(s)")
    else:
        print("[OK] Toutes les règles sont respectées")

    return violations

def display_summary():
    """Afficher un résumé de toutes les assignations."""
    print_header("RÉSUMÉ DES ASSIGNATIONS")

    for stage in Stage.objects.filter(name__startswith='TEST_'):
        print_section(f"{stage.name} ({stage.start_date} -> {stage.end_date})")

        registrations = ParticipantStage.objects.filter(stage=stage).select_related('participant', 'assigned_bungalow')

        assigned = registrations.filter(assigned_bungalow__isnull=False)
        unassigned = registrations.filter(assigned_bungalow__isnull=True)

        print(f"Total inscriptions: {registrations.count()}")
        print(f"Assignés: {assigned.count()}")
        print(f"Non assignés: {unassigned.count()}")

        if assigned.exists():
            print("\nAssignations:")
            for reg in assigned.order_by('assigned_bungalow__name', 'assigned_bed'):
                print(f"  {reg.participant.full_name} ({reg.role}) -> {reg.assigned_bungalow.name} - {reg.assigned_bed}")
                print(f"    Dates: {reg.effective_arrival_date} -> {reg.effective_departure_date}")

        if unassigned.exists():
            print("\nNon assignés:")
            for reg in unassigned:
                print(f"  {reg.participant.full_name} ({reg.role})")

def main():
    """Fonction principale du script de test."""
    print_header("SCRIPT DE TEST - SYSTÈME D'ASSIGNATION DES BUNGALOWS")
    print("Ce script va tester:")
    print("  1. Chevauchements de dates entre événements")
    print("  2. Sureffectif dans les chambres")
    print("  3. Respect des règles d'assignation")
    print("  4. Gestion des dates personnalisées")

    # Créer les données de test
    stage1, stage2, stage3, participants = create_test_data()
    create_registrations(stage1, stage2, stage3, participants)

    # Tester l'assignation pour chaque événement
    test_assignment(stage1)
    test_assignment(stage2)
    test_assignment(stage3)

    # Vérifier les problèmes
    overlaps = check_overlaps()
    violations = check_rules()

    # Afficher le résumé
    display_summary()

    # Résumé final
    print_header("RÉSUMÉ FINAL")
    if overlaps or violations:
        print(f"[ATTENTION] Problèmes détectés:")
        print(f"  - Chevauchements/Sureffectifs: {len(overlaps)}")
        print(f"  - Violations de règles: {len(violations)}")
    else:
        print("[OK] Tous les tests sont passés avec succès!")
        print("  - Aucun chevauchement de dates")
        print("  - Aucun sureffectif")
        print("  - Toutes les règles sont respectées")

if __name__ == '__main__':
    main()
