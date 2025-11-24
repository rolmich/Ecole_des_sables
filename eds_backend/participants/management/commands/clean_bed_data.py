"""
Commande pour nettoyer les données des lits dans les bungalows.
Convertit tous les objets time en chaînes de caractères et synchronise
les données avec les inscriptions actuelles.
"""

from django.core.management.base import BaseCommand
from participants.models import Bungalow, ParticipantStage


class Command(BaseCommand):
    help = 'Nettoie et synchronise les données des lits dans les bungalows'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les changements sans les appliquer',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        self.stdout.write(self.style.NOTICE('=== Nettoyage des données des lits ===\n'))

        bungalows = Bungalow.objects.all()
        total_cleaned = 0
        total_synced = 0

        for bungalow in bungalows:
            changed = False

            # Récupérer toutes les inscriptions assignées à ce bungalow
            registrations = ParticipantStage.objects.filter(
                assigned_bungalow=bungalow
            ).select_related('participant', 'stage')

            # Créer un dictionnaire des inscriptions par lit
            registrations_by_bed = {}
            for reg in registrations:
                if reg.assigned_bed:
                    registrations_by_bed[reg.assigned_bed] = reg

            # Parcourir tous les lits
            for bed in bungalow.beds:
                bed_id = bed.get('id')
                occupied_by = bed.get('occupiedBy')

                # Cas 1: Lit marqué comme occupé mais pas d'inscription correspondante
                if occupied_by is not None and bed_id not in registrations_by_bed:
                    self.stdout.write(
                        f"  {bungalow.name}/{bed_id}: Occupant fantôme supprimé "
                        f"({occupied_by.get('name', occupied_by) if isinstance(occupied_by, dict) else occupied_by})"
                    )
                    bed['occupiedBy'] = None
                    changed = True
                    total_cleaned += 1

                # Cas 2: Inscription existe mais lit non marqué ou données incorrectes
                elif bed_id in registrations_by_bed:
                    reg = registrations_by_bed[bed_id]
                    participant = reg.participant

                    # Formater correctement les données
                    correct_data = {
                        'registrationId': reg.id,
                        'participantId': participant.id,
                        'name': participant.full_name,
                        'gender': participant.gender,
                        'startDate': str(reg.effective_arrival_date),
                        'startTime': str(reg.arrival_time) if reg.arrival_time else '',
                        'endDate': str(reg.effective_departure_date),
                        'endTime': str(reg.departure_time) if reg.departure_time else '',
                        'stageName': reg.stage.name
                    }

                    # Vérifier si les données doivent être mises à jour
                    needs_update = False
                    if not isinstance(occupied_by, dict):
                        needs_update = True
                    elif occupied_by != correct_data:
                        # Vérifier s'il y a des différences importantes
                        for key in correct_data:
                            if str(occupied_by.get(key, '')) != str(correct_data[key]):
                                needs_update = True
                                break

                    if needs_update:
                        self.stdout.write(
                            f"  {bungalow.name}/{bed_id}: Données synchronisées "
                            f"({participant.full_name})"
                        )
                        bed['occupiedBy'] = correct_data
                        changed = True
                        total_synced += 1

            # Sauvegarder si des changements ont été effectués
            if changed:
                if not dry_run:
                    bungalow.save()
                    bungalow.update_occupancy()
                self.stdout.write(f"  -> Bungalow {bungalow.name} mis à jour")

        # Résumé
        self.stdout.write('\n')
        if dry_run:
            self.stdout.write(self.style.WARNING('=== Mode DRY-RUN (aucun changement appliqué) ==='))

        self.stdout.write(self.style.SUCCESS(
            f'\nRésumé:\n'
            f'  - Occupants fantômes supprimés: {total_cleaned}\n'
            f'  - Données synchronisées: {total_synced}'
        ))

        if not dry_run and (total_cleaned > 0 or total_synced > 0):
            self.stdout.write(self.style.SUCCESS('\nNettoyage terminé avec succès!'))
