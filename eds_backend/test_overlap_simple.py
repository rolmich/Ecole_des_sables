"""
Script de test simple pour vérifier les chevauchements et sureffectifs.
"""

import os
import django
import sys

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eds_backend.settings')
django.setup()

from participants.models import ParticipantStage, Bungalow

def print_header(title):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)

def check_overlaps():
    """Vérifier les chevauchements de dates dans les assignations actuelles."""
    print_header("VÉRIFICATION DES CHEVAUCHEMENTS ET SUREFFECTIFS")

    issues = []

    # Pour chaque bungalow
    for bungalow in Bungalow.objects.all():
        if not bungalow.beds:
            continue

        print(f"\n--- Bungalow {bungalow.name} (Village {bungalow.village}) ---")
        print(f"Capacité: {bungalow.capacity} lits")

        # Récupérer toutes les inscriptions pour ce bungalow
        all_registrations = ParticipantStage.objects.filter(
            assigned_bungalow=bungalow
        ).select_related('participant', 'stage').order_by('assigned_bed', 'arrival_date')

        if all_registrations.count() == 0:
            print("  [INFO] Bungalow vide")
            continue

        print(f"  Total assignations: {all_registrations.count()}")

        # Grouper par lit
        beds_assignments = {}
        for reg in all_registrations:
            bed_id = reg.assigned_bed
            if bed_id not in beds_assignments:
                beds_assignments[bed_id] = []
            beds_assignments[bed_id].append(reg)

        # Vérifier chaque lit
        for bed_id, registrations in beds_assignments.items():
            print(f"\n  Lit: {bed_id} - {len(registrations)} assignation(s)")

            for reg in registrations:
                start = reg.effective_arrival_date
                end = reg.effective_departure_date
                print(f"    - {reg.participant.full_name} ({reg.stage.name}): {start} -> {end}")

            # Vérifier les chevauchements si plusieurs personnes
            if len(registrations) > 1:
                reg_list = list(registrations)
                for i, reg1 in enumerate(reg_list):
                    for reg2 in reg_list[i+1:]:
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
                            print(f"    [ERREUR] CHEVAUCHEMENT DÉTECTÉ!")
                            print(f"      {reg1.participant.full_name}: {start1} -> {end1}")
                            print(f"      {reg2.participant.full_name}: {start2} -> {end2}")

        # Vérifier le sureffectif (plus d'assignations que de capacité)
        # NOTE: Ceci ne vérifie PAS les chevauchements temporels, juste le nombre total
        if all_registrations.count() > bungalow.capacity:
            issue = {
                'type': 'SUREFFECTIF_TOTAL',
                'bungalow': bungalow.name,
                'capacity': bungalow.capacity,
                'assigned': all_registrations.count()
            }
            issues.append(issue)
            print(f"\n  [ATTENTION] SUREFFECTIF: {all_registrations.count()} assignations pour {bungalow.capacity} lits")

    # Résumé
    print_header("RÉSUMÉ")
    if issues:
        print(f"\n[ATTENTION] {len(issues)} problème(s) détecté(s):\n")

        overlaps = [i for i in issues if i['type'] == 'CHEVAUCHEMENT']
        overfills = [i for i in issues if i['type'] == 'SUREFFECTIF_TOTAL']

        if overlaps:
            print(f"\n{len(overlaps)} CHEVAUCHEMENT(S) de dates:")
            for issue in overlaps:
                print(f"\n  Bungalow {issue['bungalow']} - Lit {issue['bed']}")
                print(f"    - {issue['participant1']}: {issue['dates1']}")
                print(f"    - {issue['participant2']}: {issue['dates2']}")

        if overfills:
            print(f"\n{len(overfills)} SUREFFECTIF(S):")
            for issue in overfills:
                print(f"  - {issue['bungalow']}: {issue['assigned']}/{issue['capacity']}")
    else:
        print("[OK] Aucun problème détecté!")
        print("  - Pas de chevauchements de dates")
        print("  - Pas de sureffectifs")

    return issues

def check_period_overlap():
    """Vérifier les chevauchements en tenant compte des périodes."""
    print_header("VÉRIFICATION AVANCÉE: OCCUPATION PAR PÉRIODE")

    # Pour chaque bungalow, vérifier l'occupation maximale à un moment donné
    issues = []

    for bungalow in Bungalow.objects.all():
        registrations = ParticipantStage.objects.filter(
            assigned_bungalow=bungalow
        ).select_related('participant', 'stage')

        if registrations.count() == 0:
            continue

        print(f"\n--- Bungalow {bungalow.name} (Capacité: {bungalow.capacity}) ---")

        # Créer une liste de tous les événements (arrivée/départ)
        events = []
        for reg in registrations:
            start = reg.effective_arrival_date
            end = reg.effective_departure_date
            events.append(('start', start, reg))
            events.append(('end', end, reg))

        # Trier par date
        events.sort(key=lambda x: x[1])

        # Simuler l'occupation au fil du temps
        current_occupants = []
        max_occupancy = 0

        for event_type, date, reg in events:
            if event_type == 'start':
                current_occupants.append(reg)
                if len(current_occupants) > max_occupancy:
                    max_occupancy = len(current_occupants)

                    # Vérifier si on dépasse la capacité
                    if len(current_occupants) > bungalow.capacity:
                        issue = {
                            'type': 'SUREFFECTIF_PERIODE',
                            'bungalow': bungalow.name,
                            'date': date,
                            'capacity': bungalow.capacity,
                            'occupants': len(current_occupants),
                            'participants': [o.participant.full_name for o in current_occupants]
                        }
                        issues.append(issue)

                        print(f"  [ERREUR] SUREFFECTIF à la date {date}")
                        print(f"    Capacité: {bungalow.capacity}, Occupants: {len(current_occupants)}")
                        print(f"    Présents:")
                        for o in current_occupants:
                            print(f"      - {o.participant.full_name} ({o.stage.name})")
            else:
                if reg in current_occupants:
                    current_occupants.remove(reg)

        print(f"  Occupation maximale: {max_occupancy}/{bungalow.capacity}")

    if issues:
        print_header("PROBLÈMES DÉTECTÉS")
        for issue in issues:
            print(f"\n[ERREUR] {issue['bungalow']} - {issue['date']}")
            print(f"  Capacité dépassée: {issue['occupants']}/{issue['capacity']}")
            print(f"  Participants présents:")
            for p in issue['participants']:
                print(f"    - {p}")
    else:
        print_header("RÉSULTAT")
        print("[OK] Aucun sureffectif temporel détecté!")

    return issues

def main():
    """Fonction principale."""
    print_header("SCRIPT DE VÉRIFICATION - CHEVAUCHEMENTS ET SUREFFECTIFS")
    print("Ce script vérifie les assignations actuelles dans la base de données")

    # Vérification basique
    issues1 = check_overlaps()

    # Vérification avancée par période
    issues2 = check_period_overlap()

    # Résumé final
    print_header("RÉSUMÉ FINAL")
    total_issues = len(issues1) + len(issues2)

    if total_issues > 0:
        print(f"[ATTENTION] {total_issues} problème(s) au total:")
        print(f"  - Chevauchements simples: {len([i for i in issues1 if i['type'] == 'CHEVAUCHEMENT'])}")
        print(f"  - Sureffectifs (total): {len([i for i in issues1 if i['type'] == 'SUREFFECTIF_TOTAL'])}")
        print(f"  - Sureffectifs (période): {len(issues2)}")
    else:
        print("[OK] SYSTÈME SAIN - Aucun problème détecté!")

if __name__ == '__main__':
    main()
