"""
Commande Django pour supprimer toutes les assignations d'un stage et relancer l'assignation automatique.
Usage: python manage.py reset_and_auto_assign <stage_id>
"""

from django.core.management.base import BaseCommand, CommandError
from participants.models import ParticipantStage, Bungalow, Stage
from participants.assignment_logic import assign_participants_automatically_for_stage


class Command(BaseCommand):
    help = 'Supprime toutes les assignations dun stage et relance lassignation automatique'

    def add_arguments(self, parser):
        parser.add_argument('stage_id', type=int, help='ID du stage')

    def handle(self, *args, **options):
        stage_id = options['stage_id']

        try:
            stage = Stage.objects.get(pk=stage_id)
        except Stage.DoesNotExist:
            raise CommandError(f'Stage avec ID {stage_id} non trouve')

        self.stdout.write(f'Stage: {stage.name}')
        self.stdout.write('='* 50)

        # 1. Supprimer toutes les assignations de ce stage
        registrations = ParticipantStage.objects.filter(
            stage=stage,
            assigned_bungalow__isnull=False
        )

        count = registrations.count()
        self.stdout.write(f'\nSuppression de {count} assignations...')

        for reg in registrations:
            bungalow = reg.assigned_bungalow
            bed_id = reg.assigned_bed

            # Liberer le lit dans le bungalow
            if bungalow and bed_id:
                for bed in bungalow.beds:
                    if bed.get('id') == bed_id:
                        bed['occupiedBy'] = None
                        break
                bungalow.save()
                bungalow.update_occupancy()

            # Desassigner l'inscription
            reg.assigned_bungalow = None
            reg.assigned_bed = None
            reg.save()

        self.stdout.write(self.style.SUCCESS(f'[OK] {count} assignations supprimees'))

        # 2. Lancer l'assignation automatique
        self.stdout.write('\nLancement de lassignation automatique...')
        
        results = assign_participants_automatically_for_stage(stage)

        success_count = len(results['success'])
        failure_count = len(results['failure'])

        self.stdout.write(self.style.SUCCESS(f'\n[SUCCESS] Assignation automatique terminee!'))
        self.stdout.write(f'  - {success_count} participants assignes')
        self.stdout.write(f'  - {failure_count} echecs')

        if results['success']:
            self.stdout.write('\nAssignations reussies:')
            for assignment in results['success']:
                self.stdout.write(f'  [OK] {assignment["participant"]} -> {assignment["bungalow"]} ({assignment["bed"]})')

        if results['failure']:
            self.stdout.write(self.style.WARNING('\nEchecs:'))
            for failure in results['failure']:
                self.stdout.write(self.style.WARNING(f'  [WARN] {failure["participant"]}: {failure["reason"]}'))
