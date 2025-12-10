"""
Logique d'assignation des participants aux bungalows.

Règles d'assignation:
1. Capacité de la chambre ne doit pas être dépassée
2. Durée du participant dans la chambre = durée de son stage
3. Tous les participants dans une chambre doivent appartenir au même stage
4. Pas de mixité homme/femme dans la même chambre
5. Gestion des chevauchements de périodes
"""

from datetime import date
from typing import Tuple, List, Dict, Optional
from .models import Participant, Bungalow, Stage


class AssignmentError(Exception):
    """Exception personnalisée pour les erreurs d'assignation."""
    
    def __init__(self, message: str, code: str = None, details: dict = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)


def check_date_overlap(start1: date, end1: date, start2: date, end2: date) -> bool:
    """
    Vérifie si deux périodes se chevauchent.
    
    Exemples:
    - [11-13] et [14-16] → False (pas de chevauchement)
    - [11-13] et [12-15] → True (chevauchement)
    - [11-15] et [12-14] → True (chevauchement)
    """
    return start1 <= end2 and end1 >= start2


def get_participant_assignment_dates(participant: Participant, stage: Stage) -> Tuple[date, date]:
    """
    Retourne les dates d'assignation pour un participant basées sur son stage.
    """
    return stage.start_date, stage.end_date


def validate_assignment(
    participant: Participant,
    bungalow: Bungalow,
    bed_id: str,
    stage: Stage
) -> Tuple[bool, Optional[str], Optional[Dict]]:
    """
    Valide qu'un participant peut être assigné à un bungalow.
    
    Returns:
        Tuple[bool, Optional[str], Optional[Dict]]: 
        (is_valid, error_message, error_details)
    """
    
    # Règle 1: Vérifier que le lit existe
    bed_found = False
    for bed in bungalow.beds:
        if bed.get('id') == bed_id:
            bed_found = True
            break
    
    if not bed_found:
        available = [b.get('id') for b in bungalow.beds]
        return False, f"❌ LIT INTROUVABLE: Le lit '{bed_id}' n'existe pas dans le bungalow {bungalow.name}. Les lits disponibles dans ce bungalow sont: {', '.join(available)}. Veuillez choisir un lit valide.", {
            'code': 'BED_NOT_FOUND',
            'bungalow': bungalow.name,
            'bed_id': bed_id,
            'available_beds': available
        }
    
    # Règle 2: Vérifier que le participant appartient au stage
    participant_stage_registrations = ParticipantStage.objects.filter(participant=participant)
    participant_stages = [ps.stage for ps in participant_stage_registrations]

    if stage not in participant_stages:
        participant_stage_names = [s.name for s in participant_stages]
        if len(participant_stage_names) == 0:
            return False, f"⚠️ PAS DE STAGE: {participant.full_name} n'est inscrit à AUCUN stage. Vous devez d'abord inscrire cette personne à un stage de formation avant de pouvoir lui attribuer une chambre.", {
                'code': 'PARTICIPANT_NOT_IN_STAGE',
                'participant': participant.full_name,
                'stage': stage.name,
                'participant_stages': []
            }
        else:
            return False, f"⚠️ MAUVAIS STAGE: {participant.full_name} n'est PAS inscrit au stage '{stage.name}'. Cette personne est inscrite aux stages: {', '.join(participant_stage_names)}. Vous devez l'assigner pour un de SES stages, pas pour un autre stage.", {
                'code': 'PARTICIPANT_NOT_IN_STAGE',
                'participant': participant.full_name,
                'stage_requested': stage.name,
                'participant_stages': participant_stage_names
            }
    
    # Obtenir les dates d'assignation basées sur le stage
    assignment_start, assignment_end = get_participant_assignment_dates(participant, stage)
    
    # Règle 3: Vérifier les participants déjà assignés à ce bungalow
    existing_assignments = Participant.objects.filter(
        assigned_bungalow=bungalow
    ).exclude(id=participant.id)
    
    # Règle 4: Vérifier la mixité (pas homme/femme ensemble)
    for existing in existing_assignments:
        # Vérifier s'il y a chevauchement de dates
        if existing.assignment_start_date and existing.assignment_end_date:
            if check_date_overlap(
                assignment_start, assignment_end,
                existing.assignment_start_date, existing.assignment_end_date
            ):
                # Il y a chevauchement, vérifier la mixité
                if existing.gender != participant.gender:
                    return False, f"🚫 CHAMBRES NON-MIXTES: Ce bungalow {bungalow.name} est occupé par {existing.full_name} ({existing.get_gender_display()}) du {existing.assignment_start_date.strftime('%d/%m')} au {existing.assignment_end_date.strftime('%d/%m')}. Vous ne pouvez PAS ajouter {participant.full_name} ({participant.get_gender_display()}) car LES HOMMES ET LES FEMMES NE PEUVENT PAS PARTAGER LA MÊME CHAMBRE. Veuillez choisir un autre bungalow réservé aux {participant.get_gender_display()}s.", {
                        'code': 'GENDER_MIXING_NOT_ALLOWED',
                        'bungalow': bungalow.name,
                        'existing_participant': existing.full_name,
                        'existing_gender': existing.get_gender_display(),
                        'new_participant': participant.full_name,
                        'new_gender': participant.get_gender_display(),
                        'overlap_period': {
                            'existing': f"{existing.assignment_start_date} - {existing.assignment_end_date}",
                            'requested': f"{assignment_start} - {assignment_end}"
                        }
                    }
    
    # Règle 5: Vérifier que tous les participants appartiennent au même stage
    for existing in existing_assignments:
        if existing.assignment_start_date and existing.assignment_end_date:
            if check_date_overlap(
                assignment_start, assignment_end,
                existing.assignment_start_date, existing.assignment_end_date
            ):
                # Vérifier que c'est le même stage
                existing_stage_registrations = ParticipantStage.objects.filter(participant=existing)
                existing_stages = [ps.stage for ps in existing_stage_registrations]

                # Trouver le stage de l'assignation existante
                # On suppose que l'assignation est pour le stage correspondant aux dates
                existing_stage = None
                for es in existing_stages:
                    if (es.start_date == existing.assignment_start_date and
                        es.end_date == existing.assignment_end_date):
                        existing_stage = es
                        break

                if existing_stage and existing_stage != stage:
                    return False, f"🚫 STAGES DIFFÉRENTS: Ce bungalow {bungalow.name} est déjà réservé pour le stage '{existing_stage.name}' (avec {existing.full_name}) du {existing.assignment_start_date.strftime('%d/%m')} au {existing.assignment_end_date.strftime('%d/%m')}. Vous ne pouvez PAS mélanger des participants de STAGES DIFFÉRENTS dans la même chambre pendant la même période. Le stage '{stage.name}' doit avoir ses propres chambres séparées.", {
                        'code': 'DIFFERENT_STAGES_NOT_ALLOWED',
                        'bungalow': bungalow.name,
                        'existing_participant': existing.full_name,
                        'existing_stage': existing_stage.name if existing_stage else 'Inconnu',
                        'new_stage': stage.name
                    }
    
    # Règle 6: Vérifier la capacité du bungalow pour cette période
    # Compter combien de lits sont occupés pendant la période demandée
    occupied_beds_during_period = set()
    
    for existing in existing_assignments:
        if existing.assignment_start_date and existing.assignment_end_date and existing.assigned_bed:
            if check_date_overlap(
                assignment_start, assignment_end,
                existing.assignment_start_date, existing.assignment_end_date
            ):
                occupied_beds_during_period.add(existing.assigned_bed)
    
    # Vérifier si le lit demandé est déjà occupé pendant cette période
    if bed_id in occupied_beds_during_period:
        conflicting = existing_assignments.filter(
            assigned_bed=bed_id,
            assignment_start_date__lte=assignment_end,
            assignment_end_date__gte=assignment_start
        ).first()
        
        return False, f"🛏️ LIT DÉJÀ OCCUPÉ: Ce lit ({bed_id}) du bungalow {bungalow.name} est déjà réservé par {conflicting.full_name} du {conflicting.assignment_start_date.strftime('%d/%m/%Y')} au {conflicting.assignment_end_date.strftime('%d/%m/%Y')}. Les dates se chevauchent avec celles de {participant.full_name} ({assignment_start.strftime('%d/%m/%Y')} au {assignment_end.strftime('%d/%m/%Y')}). Un lit ne peut pas être occupé par deux personnes en même temps. Veuillez choisir un AUTRE LIT disponible.", {
            'code': 'BED_OCCUPIED_OVERLAP',
            'bungalow': bungalow.name,
            'bed_id': bed_id,
            'occupied_by': conflicting.full_name,
            'occupied_period': f"{conflicting.assignment_start_date.strftime('%d/%m')} - {conflicting.assignment_end_date.strftime('%d/%m')}",
            'requested_period': f"{assignment_start.strftime('%d/%m')} - {assignment_end.strftime('%d/%m')}"
        }
    
    # Vérifier que le nombre total de lits occupés ne dépasse pas la capacité
    if len(occupied_beds_during_period) >= bungalow.capacity:
        return False, f"🏠 BUNGALOW COMPLET: Le bungalow {bungalow.name} est COMPLET pour la période du {assignment_start.strftime('%d/%m/%Y')} au {assignment_end.strftime('%d/%m/%Y')}. Il a {bungalow.capacity} lits et TOUS sont déjà réservés ({len(occupied_beds_during_period)} occupés). Il n'y a plus de place pour {participant.full_name}. Veuillez choisir un AUTRE BUNGALOW avec des lits disponibles pour cette période.", {
            'code': 'BUNGALOW_FULL_FOR_PERIOD',
            'bungalow': bungalow.name,
            'capacity': bungalow.capacity,
            'occupied_count': len(occupied_beds_during_period),
            'period': f"{assignment_start.strftime('%d/%m')} - {assignment_end.strftime('%d/%m')}",
            'occupied_beds': list(occupied_beds_during_period)
        }
    
    # Toutes les validations sont passées
    return True, None, None


def assign_participant_to_bungalow(
    participant: Participant,
    bungalow: Bungalow,
    bed_id: str,
    stage: Stage
) -> Tuple[bool, str, Optional[Dict]]:
    """
    Assigne un participant à un bungalow en vérifiant toutes les règles.
    
    Returns:
        Tuple[bool, str, Optional[Dict]]: (success, message, details)
    """
    
    # Valider l'assignation
    is_valid, error_message, error_details = validate_assignment(
        participant, bungalow, bed_id, stage
    )
    
    if not is_valid:
        return False, error_message, error_details
    
    # Obtenir les dates d'assignation
    assignment_start, assignment_end = get_participant_assignment_dates(participant, stage)
    
    # Effectuer l'assignation
    participant.assigned_bungalow = bungalow
    participant.assigned_bed = bed_id
    participant.assignment_start_date = assignment_start
    participant.assignment_end_date = assignment_end
    participant.save()
    
    # Mettre à jour l'occupation du bungalow (pour la période actuelle)
    bungalow.update_occupancy()
    
    success_message = f"SUCCÈS: {participant.full_name} assigné au bungalow {bungalow.name} (Village {bungalow.village.name}), lit {bed_id}, du {assignment_start} au {assignment_end} (Stage: {stage.name})"
    
    details = {
        'participant': participant.full_name,
        'bungalow': bungalow.name,
        'village': bungalow.village.name,
        'bed': bed_id,
        'start_date': str(assignment_start),
        'end_date': str(assignment_end),
        'stage': stage.name
    }
    
    return True, success_message, details


def get_bungalow_availability(bungalow: Bungalow, start_date: date, end_date: date) -> Dict:
    """
    Retourne la disponibilité d'un bungalow pour une période donnée.
    """
    occupied_beds = set()
    assignments = []

    # Récupérer tous les participants assignés pendant cette période
    participants_in_period = Participant.objects.filter(
        assigned_bungalow=bungalow,
        assignment_start_date__lte=end_date,
        assignment_end_date__gte=start_date
    )

    for p in participants_in_period:
        if p.assigned_bed:
            occupied_beds.add(p.assigned_bed)
            # Récupérer les stages via ParticipantStage
            p_stage_registrations = ParticipantStage.objects.filter(participant=p)
            p_stages = [ps.stage.name for ps in p_stage_registrations]

            assignments.append({
                'participant': p.full_name,
                'bed': p.assigned_bed,
                'gender': p.get_gender_display(),
                'period': f"{p.assignment_start_date} - {p.assignment_end_date}",
                'stages': p_stages
            })

    available_beds = []
    for bed in bungalow.beds:
        bed_id = bed.get('id')
        if bed_id not in occupied_beds:
            available_beds.append({
                'id': bed_id,
                'type': bed.get('type')
            })

    return {
        'bungalow': bungalow.name,
        'village': bungalow.village.name,
        'capacity': bungalow.capacity,
        'occupied_count': len(occupied_beds),
        'available_count': len(available_beds),
        'available_beds': available_beds,
        'current_assignments': assignments,
        'is_full': len(occupied_beds) >= bungalow.capacity
    }


# ========== ASSIGNATION AUTOMATIQUE ==========

from .models import ParticipantStage

def get_bungalow_occupants_for_stage(bungalow: Bungalow, stage: Stage) -> List:
    """
    Retourne tous les participants assignés à un bungalow pour un stage donné.
    """
    from .models import ParticipantStage

    assignment_start, assignment_end = stage.start_date, stage.end_date

    # Récupérer les inscriptions au stage qui sont assignées à ce bungalow
    registrations = ParticipantStage.objects.filter(
        stage=stage,
        assigned_bungalow=bungalow
    ).select_related('participant')

    return [reg.participant for reg in registrations]


def find_best_bed_for_instructor(
    registration: 'ParticipantStage',
    stage: Stage,
    all_bungalows: List[Bungalow]
) -> Optional[Tuple[Bungalow, str]]:
    """
    Trouve le meilleur bungalow et lit pour un encadrant.

    Règles:
    - SEUL dans sa chambre (chambre individuelle obligatoire)
    - Priorité aux chambres avec WC/salle de bain privée
    - Priorité au lit double si disponible

    Args:
        registration: L'inscription (ParticipantStage) de l'encadrant
        stage: Le stage concerné
        all_bungalows: Liste de tous les bungalows disponibles

    Returns:
        Tuple[Bungalow, bed_id] ou None si aucun lit approprié n'est trouvé
    """
    participant = registration.participant

    # Priorité 1: Chercher un bungalow vide avec salle de bain privée + lit double
    for bungalow in all_bungalows:
        bungalow.refresh_from_db()
        occupied_bed_ids = {bed.get('id') for bed in bungalow.beds if bed.get('occupiedBy') is not None}

        if len(occupied_bed_ids) == 0:  # Bungalow vide (SEUL)
            has_private_bathroom = 'private_bathroom' in bungalow.amenities

            if has_private_bathroom:
                # Chercher un lit double
                for bed in bungalow.beds:
                    bed_id = bed.get('id')
                    bed_type = bed.get('type')

                    if bed_type == 'double':
                        is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                        if is_valid:
                            return bungalow, bed_id

    # Priorité 2: Bungalow vide avec salle de bain privée (n'importe quel lit)
    for bungalow in all_bungalows:
        bungalow.refresh_from_db()
        occupied_bed_ids = {bed.get('id') for bed in bungalow.beds if bed.get('occupiedBy') is not None}

        if len(occupied_bed_ids) == 0:  # Bungalow vide (SEUL)
            has_private_bathroom = 'private_bathroom' in bungalow.amenities

            if has_private_bathroom:
                for bed in bungalow.beds:
                    bed_id = bed.get('id')
                    is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                    if is_valid:
                        return bungalow, bed_id

    # Priorité 3: N'importe quel bungalow vide avec lit double
    for bungalow in all_bungalows:
        bungalow.refresh_from_db()
        occupied_bed_ids = {bed.get('id') for bed in bungalow.beds if bed.get('occupiedBy') is not None}

        if len(occupied_bed_ids) == 0:  # Bungalow vide (SEUL)
            for bed in bungalow.beds:
                bed_id = bed.get('id')
                bed_type = bed.get('type')

                if bed_type == 'double':
                    is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                    if is_valid:
                        return bungalow, bed_id

    # Priorité 4: N'importe quel bungalow vide
    for bungalow in all_bungalows:
        bungalow.refresh_from_db()
        occupied_bed_ids = {bed.get('id') for bed in bungalow.beds if bed.get('occupiedBy') is not None}

        if len(occupied_bed_ids) == 0:  # Bungalow vide (SEUL)
            for bed in bungalow.beds:
                bed_id = bed.get('id')
                is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                if is_valid:
                    return bungalow, bed_id

    return None


def find_best_bed_for_musician(
    registration: 'ParticipantStage',
    stage: Stage,
    all_bungalows: List[Bungalow]
) -> Optional[Tuple[Bungalow, str]]:
    """
    Trouve le meilleur bungalow et lit pour un musicien.

    Règles:
    - Musiciens ensemble (peuvent partager)
    - Priorité au Village C (chambres avec douche intégrée = private_bathroom)
    - Optimiser l'utilisation des lits (remplir les chambres existantes d'abord)
    - Utiliser les lits doubles si disponibles
    """
    participant = registration.participant

    # Priorité 1: Remplir une chambre déjà occupée par des musiciens (même genre) dans Village C
    village_c_bungalows = [b for b in all_bungalows if b.village.name == 'C']

    for bungalow in village_c_bungalows:
        bungalow.refresh_from_db()
        occupied_bed_ids = {bed.get('id') for bed in bungalow.beds if bed.get('occupiedBy') is not None}

        if 0 < len(occupied_bed_ids) < bungalow.capacity:  # Partiellement rempli
            # Vérifier que ce sont des musiciens du même genre
            occupants = get_bungalow_occupants_for_stage(bungalow, stage)

            # Vérifier le rôle des occupants
            musician_occupants = [o for o in occupants if ParticipantStage.objects.filter(
                participant=o, stage=stage, role='musician'
            ).exists()]

            if musician_occupants and all(o.gender == participant.gender for o in musician_occupants):
                # Chercher un lit double d'abord, sinon single
                for bed in sorted(bungalow.beds, key=lambda b: 0 if b.get('type') == 'double' else 1):
                    bed_id = bed.get('id')
                    if bed_id not in occupied_bed_ids:
                        is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                        if is_valid:
                            return bungalow, bed_id

    # Priorité 2: Nouveau bungalow vide dans Village C
    for bungalow in village_c_bungalows:
        bungalow.refresh_from_db()
        occupied_bed_ids = {bed.get('id') for bed in bungalow.beds if bed.get('occupiedBy') is not None}

        if len(occupied_bed_ids) == 0:  # Bungalow vide
            # Chercher un lit double d'abord
            for bed in sorted(bungalow.beds, key=lambda b: 0 if b.get('type') == 'double' else 1):
                bed_id = bed.get('id')
                is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                if is_valid:
                    return bungalow, bed_id

    # Priorité 3: Si Village C plein, chercher ailleurs avec private_bathroom
    for bungalow in all_bungalows:
        if bungalow.village.name == 'C':
            continue  # Déjà vérifié

        if 'private_bathroom' in bungalow.amenities:
            bungalow.refresh_from_db()
            occupied_bed_ids = {bed.get('id') for bed in bungalow.beds if bed.get('occupiedBy') is not None}

            # Remplir une chambre existante avec des musiciens
            if 0 < len(occupied_bed_ids) < bungalow.capacity:
                occupants = get_bungalow_occupants_for_stage(bungalow, stage)
                musician_occupants = [o for o in occupants if ParticipantStage.objects.filter(
                    participant=o, stage=stage, role='musician'
                ).exists()]

                if musician_occupants and all(o.gender == participant.gender for o in musician_occupants):
                    for bed in sorted(bungalow.beds, key=lambda b: 0 if b.get('type') == 'double' else 1):
                        bed_id = bed.get('id')
                        if bed_id not in occupied_bed_ids:
                            is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                            if is_valid:
                                return bungalow, bed_id

            # Nouveau bungalow vide
            if len(occupied_bed_ids) == 0:
                for bed in sorted(bungalow.beds, key=lambda b: 0 if b.get('type') == 'double' else 1):
                    bed_id = bed.get('id')
                    is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                    if is_valid:
                        return bungalow, bed_id

    return None


def find_best_bed_for_participant(
    registration: 'ParticipantStage',
    stage: Stage,
    all_bungalows: List[Bungalow]
) -> Optional[Tuple[Bungalow, str]]:
    """
    Trouve le meilleur bungalow et lit pour un participant/étudiant.

    Règles:
    - Étudiants ensemble (peuvent partager)
    - SÉPARÉS des musiciens et encadrants
    - Optimiser l'utilisation des lits (remplir les chambres existantes)
    - Utiliser les lits doubles si disponibles
    - Éviter Village C (réservé aux musiciens de préférence)
    """
    participant = registration.participant

    # Priorité 1: Remplir une chambre déjà occupée par des étudiants (même genre)
    for bungalow in all_bungalows:
        bungalow.refresh_from_db()
        occupied_bed_ids = {bed.get('id') for bed in bungalow.beds if bed.get('occupiedBy') is not None}

        if 0 < len(occupied_bed_ids) < bungalow.capacity:  # Partiellement rempli
            occupants = get_bungalow_occupants_for_stage(bungalow, stage)

            # Vérifier que ce sont des participants/étudiants (pas musiciens ou encadrants)
            student_occupants = [o for o in occupants if ParticipantStage.objects.filter(
                participant=o, stage=stage, role='participant'
            ).exists()]

            if student_occupants and all(o.gender == participant.gender for o in student_occupants):
                # Chercher un lit double d'abord, sinon single
                for bed in sorted(bungalow.beds, key=lambda b: 0 if b.get('type') == 'double' else 1):
                    bed_id = bed.get('id')
                    if bed_id not in occupied_bed_ids:
                        is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                        if is_valid:
                            return bungalow, bed_id

    # Priorité 2: Nouveau bungalow vide (éviter Village C)
    # D'abord villages A et B
    preferred_villages = ['A', 'B']
    for village_name in preferred_villages:
        village_bungalows = [b for b in all_bungalows if b.village.name == village_name]

        for bungalow in village_bungalows:
            bungalow.refresh_from_db()
            occupied_bed_ids = {bed.get('id') for bed in bungalow.beds if bed.get('occupiedBy') is not None}

            if len(occupied_bed_ids) == 0:  # Bungalow vide
                # Chercher un lit double d'abord
                for bed in sorted(bungalow.beds, key=lambda b: 0 if b.get('type') == 'double' else 1):
                    bed_id = bed.get('id')
                    is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                    if is_valid:
                        return bungalow, bed_id

    # Priorité 3: Si villages A et B pleins, utiliser n'importe quel bungalow vide
    for bungalow in all_bungalows:
        bungalow.refresh_from_db()
        occupied_bed_ids = {bed.get('id') for bed in bungalow.beds if bed.get('occupiedBy') is not None}

        if len(occupied_bed_ids) == 0:  # Bungalow vide
            for bed in sorted(bungalow.beds, key=lambda b: 0 if b.get('type') == 'double' else 1):
                bed_id = bed.get('id')
                is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                if is_valid:
                    return bungalow, bed_id

    return None


def assign_participants_automatically_for_stage(
    stage: Stage,
    all_bungalows: Optional[List[Bungalow]] = None
) -> Dict[str, List[Dict]]:
    """
    Assigne automatiquement tous les participants non assignés d'un stage aux bungalows.

    Logique d'assignation par priorité:
    1. Encadrants (instructors) → chambre individuelle + lit double si possible
    2. Staff → chambre individuelle si possible
    3. Musiciens → comme les participants
    4. Participants → optimisation du remplissage (regrouper par genre)

    Args:
        stage: Le stage pour lequel assigner les participants
        all_bungalows: Liste des bungalows (si None, récupère tous les bungalows)

    Returns:
        Dict avec 'success' (liste des assignations réussies) et 'failure' (liste des échecs)
    """
    if all_bungalows is None:
        all_bungalows = list(Bungalow.objects.all().select_related('village'))

    results = {'success': [], 'failure': []}

    # Récupérer toutes les inscriptions non assignées pour ce stage
    unassigned_registrations = ParticipantStage.objects.filter(
        stage=stage,
        assigned_bungalow__isnull=True
    ).select_related('participant').order_by('role', 'participant__gender', 'participant__age')

    # Séparer par rôle
    instructors = [r for r in unassigned_registrations if r.role == 'instructor']
    staff = [r for r in unassigned_registrations if r.role == 'staff']
    musicians = [r for r in unassigned_registrations if r.role == 'musician']
    participants = [r for r in unassigned_registrations if r.role == 'participant']

    # Priorité 1: Encadrants
    for registration in instructors:
        assignment = find_best_bed_for_instructor(registration, stage, all_bungalows)
        if assignment:
            bungalow, bed_id = assignment
            participant = registration.participant

            # Assigner via ParticipantStage
            registration.assigned_bungalow = bungalow
            registration.assigned_bed = bed_id
            registration.save()

            # Mettre à jour le lit du bungalow
            start_date = registration.effective_arrival_date
            end_date = registration.effective_departure_date

            for bed in bungalow.beds:
                if bed.get('id') == bed_id:
                    bed['occupiedBy'] = {
                        'registrationId': registration.id,
                        'participantId': participant.id,
                        'name': participant.full_name,
                        'gender': participant.gender,
                        'age': participant.age if participant.age else None,
                        'nationality': participant.nationality if participant.nationality else None,
                        'languages': [lang.name for lang in participant.languages.all()] if participant.languages.exists() else [],
                        'role': registration.role,
                        'startDate': str(start_date),
                        'startTime': str(registration.arrival_time) if registration.arrival_time else '',
                        'endDate': str(end_date),
                        'endTime': str(registration.departure_time) if registration.departure_time else '',
                        'stageName': stage.name
                    }
                    break
            bungalow.save()
            bungalow.update_occupancy()

            results['success'].append({
                'participant': registration.participant.full_name,
                'role': 'Encadrant',
                'bungalow': bungalow.name,
                'village': bungalow.village.name,
                'bed': bed_id,
                'stage': stage.name
            })
        else:
            results['failure'].append({
                'participant': registration.participant.full_name,
                'role': 'Encadrant',
                'reason': "Aucune chambre individuelle avec lit double disponible"
            })

    # Priorité 2: Musiciens (village C avec douche)
    for registration in musicians:
        assignment = find_best_bed_for_musician(registration, stage, all_bungalows)
        if assignment:
            bungalow, bed_id = assignment
            participant = registration.participant

            registration.assigned_bungalow = bungalow
            registration.assigned_bed = bed_id
            registration.save()

            # Mettre à jour le lit du bungalow
            start_date = registration.effective_arrival_date
            end_date = registration.effective_departure_date

            for bed in bungalow.beds:
                if bed.get('id') == bed_id:
                    bed['occupiedBy'] = {
                        'registrationId': registration.id,
                        'participantId': participant.id,
                        'name': participant.full_name,
                        'gender': participant.gender,
                        'age': participant.age if participant.age else None,
                        'nationality': participant.nationality if participant.nationality else None,
                        'languages': [lang.name for lang in participant.languages.all()] if participant.languages.exists() else [],
                        'role': registration.role,
                        'startDate': str(start_date),
                        'startTime': str(registration.arrival_time) if registration.arrival_time else '',
                        'endDate': str(end_date),
                        'endTime': str(registration.departure_time) if registration.departure_time else '',
                        'stageName': stage.name
                    }
                    break
            bungalow.save()
            bungalow.update_occupancy()

            results['success'].append({
                'participant': registration.participant.full_name,
                'role': 'Musicien',
                'bungalow': bungalow.name,
                'village': bungalow.village.name,
                'bed': bed_id,
                'stage': stage.name
            })
        else:
            results['failure'].append({
                'participant': registration.participant.full_name,
                'role': 'Musicien',
                'reason': "Aucune chambre avec douche disponible"
            })

    # Priorité 3: Staff
    for registration in staff:
        assignment = find_best_bed_for_instructor(registration, stage, all_bungalows)  # Même traitement que les encadrants
        if assignment:
            bungalow, bed_id = assignment
            participant = registration.participant

            registration.assigned_bungalow = bungalow
            registration.assigned_bed = bed_id
            registration.save()

            # Mettre à jour le lit du bungalow
            start_date = registration.effective_arrival_date
            end_date = registration.effective_departure_date

            for bed in bungalow.beds:
                if bed.get('id') == bed_id:
                    bed['occupiedBy'] = {
                        'registrationId': registration.id,
                        'participantId': participant.id,
                        'name': participant.full_name,
                        'gender': participant.gender,
                        'age': participant.age if participant.age else None,
                        'nationality': participant.nationality if participant.nationality else None,
                        'languages': [lang.name for lang in participant.languages.all()] if participant.languages.exists() else [],
                        'role': registration.role,
                        'startDate': str(start_date),
                        'startTime': str(registration.arrival_time) if registration.arrival_time else '',
                        'endDate': str(end_date),
                        'endTime': str(registration.departure_time) if registration.departure_time else '',
                        'stageName': stage.name
                    }
                    break
            bungalow.save()
            bungalow.update_occupancy()

            results['success'].append({
                'participant': registration.participant.full_name,
                'role': 'Staff',
                'bungalow': bungalow.name,
                'village': bungalow.village.name,
                'bed': bed_id,
                'stage': stage.name
            })
        else:
            results['failure'].append({
                'participant': registration.participant.full_name,
                'role': 'Staff',
                'reason': "Aucune chambre individuelle disponible"
            })

    # Priorité 4: Participants/Étudiants (optimisation de remplissage)
    for registration in participants:
        assignment = find_best_bed_for_participant(registration, stage, all_bungalows)
        if assignment:
            bungalow, bed_id = assignment
            participant = registration.participant

            registration.assigned_bungalow = bungalow
            registration.assigned_bed = bed_id
            registration.save()

            # Mettre à jour le lit du bungalow
            start_date = registration.effective_arrival_date
            end_date = registration.effective_departure_date

            for bed in bungalow.beds:
                if bed.get('id') == bed_id:
                    bed['occupiedBy'] = {
                        'registrationId': registration.id,
                        'participantId': participant.id,
                        'name': participant.full_name,
                        'gender': participant.gender,
                        'age': participant.age if participant.age else None,
                        'nationality': participant.nationality if participant.nationality else None,
                        'languages': [lang.name for lang in participant.languages.all()] if participant.languages.exists() else [],
                        'role': registration.role,
                        'startDate': str(start_date),
                        'startTime': str(registration.arrival_time) if registration.arrival_time else '',
                        'endDate': str(end_date),
                        'endTime': str(registration.departure_time) if registration.departure_time else '',
                        'stageName': stage.name
                    }
                    break
            bungalow.save()
            bungalow.update_occupancy()

            results['success'].append({
                'participant': registration.participant.full_name,
                'role': 'Participant',
                'bungalow': bungalow.name,
                'village': bungalow.village.name,
                'bed': bed_id,
                'stage': stage.name
            })
        else:
            results['failure'].append({
                'participant': registration.participant.full_name,
                'role': 'Participant',
                'reason': "Aucun lit disponible respectant toutes les contraintes (genre, capacité, chevauchement)"
            })

    return results

