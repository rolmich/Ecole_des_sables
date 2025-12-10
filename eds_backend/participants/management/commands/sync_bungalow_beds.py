"""
Commande Django pour synchroniser les assignations ParticipantStage avec les lits des bungalows.
Usage: python manage.py sync_bungalow_beds
"""

from django.core.management.base import BaseCommand
from participants.models import ParticipantStage, Bungalow


class Command(BaseCommand):
    help = 'Synchronise les assignations ParticipantStage avec les lits des bungalows'

    def handle(self, *args, **options):
        self.stdout.write('Debut de la synchronisation...')

        # D'abord, nettoyer tous les lits des bungalows
        all_bungalows = Bungalow.objects.all()
        for bungalow in all_bungalows:
            for bed in bungalow.beds:
                bed['occupiedBy'] = None
            bungalow.save()
        
        self.stdout.write(f'[OK] {all_bungalows.count()} bungalows nettoyes')

        # Recuperer toutes les assignations actives
        assigned_registrations = ParticipantStage.objects.filter(
            assigned_bungalow__isnull=False,
            assigned_bed__isnull=False
        ).select_related('participant', 'stage', 'assigned_bungalow')

        success_count = 0
        error_count = 0

        for registration in assigned_registrations:
            try:
                bungalow = registration.assigned_bungalow
                bed_id = registration.assigned_bed
                participant = registration.participant
                stage = registration.stage

                # Trouver le lit dans le bungalow
                bed_found = False
                for bed in bungalow.beds:
                    if bed.get('id') == bed_id:
                        bed_found = True
                        # Mettre a jour occupiedBy
                        start_date = registration.effective_arrival_date
                        end_date = registration.effective_departure_date

                        bed['occupiedBy'] = {
                            'registrationId': registration.id,
                            'participantId': participant.id,
                            'name': participant.full_name,
                            'gender': participant.gender,
                            'startDate': str(start_date),
                            'startTime': str(registration.arrival_time) if registration.arrival_time else '',
                            'endDate': str(end_date),
                            'endTime': str(registration.departure_time) if registration.departure_time else '',
                            'stageName': stage.name
                        }
                        break

                if bed_found:
                    bungalow.save()
                    bungalow.update_occupancy()
                    success_count += 1
                    self.stdout.write(f'  [OK] {participant.full_name} -> {bungalow.name} ({bed_id})')
                else:
                    error_count += 1
                    self.stdout.write(self.style.WARNING(
                        f'  [WARN] Lit {bed_id} introuvable dans {bungalow.name} pour {participant.full_name}'
                    ))

            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'  [ERROR] {str(e)}'))

        self.stdout.write(self.style.SUCCESS(
            f'\n[SUCCESS] Synchronisation terminee: {success_count} assignations synchronisees, {error_count} erreurs'
        ))
