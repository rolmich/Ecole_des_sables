"""
Utilitaire pour enregistrer automatiquement les activités des utilisateurs.
"""

from .models import ActivityLog


def log_activity(user, action_type, model_name, obj, description, changes=None):
    """
    Enregistre une activité dans le journal.

    Args:
        user: L'utilisateur qui effectue l'action
        action_type: Type d'action ('create', 'update', 'delete', 'assign', 'unassign')
        model_name: Nom du modèle concerné ('Stage', 'Participant', etc.)
        obj: L'objet concerné (ou None si supprimé)
        description: Description textuelle de l'action
        changes: Dictionnaire optionnel des changements (avant/après)
    """
    ActivityLog.objects.create(
        user=user,
        action_type=action_type,
        model_name=model_name,
        object_id=obj.id if obj and hasattr(obj, 'id') else None,
        object_repr=str(obj) if obj else "Objet supprimé",
        description=description,
        changes=changes or {}
    )


def log_stage_create(user, stage):
    """Enregistre la création d'un événement."""
    description = f"{user.first_name} {user.last_name} a créé l'événement '{stage.name}'"
    log_activity(
        user=user,
        action_type='create',
        model_name='Stage',
        obj=stage,
        description=description,
        changes={
            'created': {
                'name': stage.name,
                'start_date': str(stage.start_date),
                'end_date': str(stage.end_date),
                'event_type': stage.event_type,
                'capacity': stage.capacity
            }
        }
    )


def log_stage_update(user, stage, old_data, new_data):
    """Enregistre la modification d'un événement."""
    changes = {}
    change_descriptions = []

    # Détecter les changements
    for field, old_value in old_data.items():
        new_value = new_data.get(field)
        if old_value != new_value:
            changes[field] = {'before': old_value, 'after': new_value}

            # Créer description lisible
            field_labels = {
                'name': 'le nom',
                'start_date': 'la date de début',
                'end_date': 'la date de fin',
                'event_type': 'le type',
                'instructor': 'l\'encadrant principal',
                'instructor2': 'l\'encadrant 2',
                'instructor3': 'l\'encadrant 3',
                'capacity': 'la capacité',
                'musicians_count': 'le nombre de musiciens'
            }
            label = field_labels.get(field, field)
            change_descriptions.append(f"{label} de '{old_value}' à '{new_value}'")

    if change_descriptions:
        description = f"{user.first_name} {user.last_name} a modifié l'événement '{stage.name}': " + ", ".join(change_descriptions)
    else:
        description = f"{user.first_name} {user.last_name} a modifié l'événement '{stage.name}'"

    log_activity(
        user=user,
        action_type='update',
        model_name='Stage',
        obj=stage,
        description=description,
        changes=changes
    )


def log_stage_delete(user, stage_name, stage_id):
    """Enregistre la suppression d'un événement."""
    description = f"{user.first_name} {user.last_name} a supprimé l'événement '{stage_name}'"
    ActivityLog.objects.create(
        user=user,
        action_type='delete',
        model_name='Stage',
        object_id=stage_id,
        object_repr=stage_name,
        description=description,
        changes={}
    )


def log_participant_create(user, participant):
    """Enregistre la création d'un participant."""
    description = f"{user.first_name} {user.last_name} a créé le participant '{participant.full_name}'"
    log_activity(
        user=user,
        action_type='create',
        model_name='Participant',
        obj=participant,
        description=description,
        changes={
            'created': {
                'first_name': participant.first_name,
                'last_name': participant.last_name,
                'email': participant.email,
                'status': participant.status
            }
        }
    )


def log_participant_update(user, participant, old_data, new_data):
    """Enregistre la modification d'un participant."""
    changes = {}
    change_descriptions = []

    for field, old_value in old_data.items():
        new_value = new_data.get(field)
        if old_value != new_value:
            changes[field] = {'before': old_value, 'after': new_value}

            field_labels = {
                'first_name': 'le prénom',
                'last_name': 'le nom',
                'email': 'l\'email',
                'gender': 'le sexe',
                'age': 'l\'âge',
                'status': 'le statut'
            }
            label = field_labels.get(field, field)
            change_descriptions.append(f"{label} de '{old_value}' à '{new_value}'")

    if change_descriptions:
        description = f"{user.first_name} {user.last_name} a modifié le participant '{participant.full_name}': " + ", ".join(change_descriptions)
    else:
        description = f"{user.first_name} {user.last_name} a modifié le participant '{participant.full_name}'"

    log_activity(
        user=user,
        action_type='update',
        model_name='Participant',
        obj=participant,
        description=description,
        changes=changes
    )


def log_participant_delete(user, participant_name, participant_id):
    """Enregistre la suppression d'un participant."""
    description = f"{user.first_name} {user.last_name} a supprimé le participant '{participant_name}'"
    ActivityLog.objects.create(
        user=user,
        action_type='delete',
        model_name='Participant',
        object_id=participant_id,
        object_repr=participant_name,
        description=description,
        changes={}
    )


def log_assignment(user, participant, bungalow, bed):
    """Enregistre l'assignation d'un participant à un bungalow."""
    description = f"{user.first_name} {user.last_name} a assigné le participant '{participant.full_name}' au bungalow '{bungalow}' (lit: {bed})"
    log_activity(
        user=user,
        action_type='assign',
        model_name='Participant',
        obj=participant,
        description=description,
        changes={
            'assignment': {
                'bungalow': str(bungalow),
                'bed': bed,
                'participant': participant.full_name
            }
        }
    )


def log_unassignment(user, participant, old_bungalow, old_bed):
    """Enregistre la désassignation d'un participant."""
    description = f"{user.first_name} {user.last_name} a désassigné le participant '{participant.full_name}' du bungalow '{old_bungalow}' (lit: {old_bed})"
    log_activity(
        user=user,
        action_type='unassign',
        model_name='Participant',
        obj=participant,
        description=description,
        changes={
            'unassignment': {
                'old_bungalow': str(old_bungalow),
                'old_bed': old_bed,
                'participant': participant.full_name
            }
        }
    )


def log_language_create(user, language):
    """Enregistre la création d'une langue."""
    description = f"{user.first_name} {user.last_name} a créé la langue '{language.name}' ({language.code})"
    log_activity(
        user=user,
        action_type='create',
        model_name='Language',
        obj=language,
        description=description,
        changes={
            'created': {
                'name': language.name,
                'code': language.code,
                'native_name': language.native_name
            }
        }
    )


def log_language_update(user, language, old_data, new_data):
    """Enregistre la modification d'une langue."""
    changes = {}
    change_descriptions = []

    for field, old_value in old_data.items():
        new_value = new_data.get(field)
        if old_value != new_value:
            changes[field] = {'before': old_value, 'after': new_value}

            field_labels = {
                'name': 'le nom',
                'code': 'le code',
                'native_name': 'le nom natif',
                'is_active': 'le statut',
                'display_order': 'l\'ordre d\'affichage'
            }
            label = field_labels.get(field, field)
            change_descriptions.append(f"{label} de '{old_value}' à '{new_value}'")

    if change_descriptions:
        description = f"{user.first_name} {user.last_name} a modifié la langue '{language.name}': " + ", ".join(change_descriptions)
    else:
        description = f"{user.first_name} {user.last_name} a modifié la langue '{language.name}'"

    log_activity(
        user=user,
        action_type='update',
        model_name='Language',
        obj=language,
        description=description,
        changes=changes
    )


def log_language_delete(user, language_name, language_id):
    """Enregistre la suppression d'une langue."""
    description = f"{user.first_name} {user.last_name} a supprimé la langue '{language_name}'"
    ActivityLog.objects.create(
        user=user,
        action_type='delete',
        model_name='Language',
        object_id=language_id,
        object_repr=language_name,
        description=description,
        changes={}
    )


def log_participant_stage_create(user, participant, stage):
    """Enregistre l'ajout d'un participant à un événement."""
    description = f"{user.first_name} {user.last_name} a ajouté le participant '{participant.full_name}' à l'événement '{stage.name}'"
    log_activity(
        user=user,
        action_type='create',
        model_name='ParticipantStage',
        obj=participant,
        description=description,
        changes={
            'participant': participant.full_name,
            'stage': stage.name,
            'stage_id': stage.id
        }
    )


def log_participant_stage_delete(user, participant_name, stage_name):
    """Enregistre la suppression d'un participant d'un événement."""
    description = f"{user.first_name} {user.last_name} a retiré le participant '{participant_name}' de l'événement '{stage_name}'"
    ActivityLog.objects.create(
        user=user,
        action_type='delete',
        model_name='ParticipantStage',
        object_id=None,
        object_repr=f"{participant_name} - {stage_name}",
        description=description,
        changes={
            'participant': participant_name,
            'stage': stage_name
        }
    )


def log_excel_import_participant(user, participant_name, stage_name, was_created=False, languages=None):
    """Enregistre l'import Excel d'un participant individuel."""
    if was_created:
        description = f"{user.first_name} {user.last_name} a créé et ajouté le participant '{participant_name}' à l'événement '{stage_name}' via import Excel"
        action_type = 'create'
    else:
        description = f"{user.first_name} {user.last_name} a ajouté le participant existant '{participant_name}' à l'événement '{stage_name}' via import Excel"
        action_type = 'create'

    changes = {
        'import_type': 'excel',
        'stage': stage_name,
        'participant': participant_name,
        'was_created': was_created
    }

    if languages:
        changes['languages'] = languages
        if languages:
            description += f" (langues: {', '.join(languages)})"

    ActivityLog.objects.create(
        user=user,
        action_type=action_type,
        model_name='ParticipantStage',
        object_id=None,
        object_repr=f"{participant_name} - {stage_name}",
        description=description,
        changes=changes
    )


def log_excel_import_summary(user, stage_name, imported_count, created_count):
    """Enregistre un résumé de l'import Excel."""
    total = imported_count + created_count
    description = f"{user.first_name} {user.last_name} a terminé l'import Excel pour l'événement '{stage_name}': {total} participant(s) ({imported_count} existant(s), {created_count} créé(s))"
    ActivityLog.objects.create(
        user=user,
        action_type='create',
        model_name='Stage',
        object_id=None,
        object_repr=f"Import Excel - {stage_name}",
        description=description,
        changes={
            'import_type': 'excel_summary',
            'stage': stage_name,
            'imported_existing': imported_count,
            'created_new': created_count,
            'total': total
        }
    )


def log_auto_assignment_individual(user, participant_name, stage_name, bungalow_name, bed_id, village_name=None):
    """Enregistre l'assignation automatique d'un participant individuel."""
    if village_name:
        description = f"{user.first_name} {user.last_name} a assigné automatiquement '{participant_name}' au bungalow '{bungalow_name}' ({village_name}) lit {bed_id} pour l'événement '{stage_name}'"
    else:
        description = f"{user.first_name} {user.last_name} a assigné automatiquement '{participant_name}' au bungalow '{bungalow_name}' lit {bed_id} pour l'événement '{stage_name}'"

    ActivityLog.objects.create(
        user=user,
        action_type='assign',
        model_name='Participant',
        object_id=None,
        object_repr=f"{participant_name} - {bungalow_name}",
        description=description,
        changes={
            'assignment_type': 'automatic',
            'stage': stage_name,
            'participant': participant_name,
            'bungalow': bungalow_name,
            'bed': bed_id,
            'village': village_name
        }
    )


def log_auto_assignment_summary(user, stage_name, success_count, failure_count):
    """Enregistre un résumé de l'assignation automatique."""
    description = f"{user.first_name} {user.last_name} a terminé l'assignation automatique pour l'événement '{stage_name}': {success_count} réussite(s), {failure_count} échec(s)"
    ActivityLog.objects.create(
        user=user,
        action_type='assign',
        model_name='Stage',
        object_id=None,
        object_repr=f"Assignation automatique - {stage_name}",
        description=description,
        changes={
            'assignment_type': 'automatic_summary',
            'stage': stage_name,
            'success_count': success_count,
            'failure_count': failure_count,
            'total_processed': success_count + failure_count
        }
    )
