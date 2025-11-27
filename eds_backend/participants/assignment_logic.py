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
    if stage not in participant.stages.all():
        participant_stages = [s.name for s in participant.stages.all()]
        if len(participant_stages) == 0:
            return False, f"⚠️ PAS DE STAGE: {participant.full_name} n'est inscrit à AUCUN stage. Vous devez d'abord inscrire cette personne à un stage de formation avant de pouvoir lui attribuer une chambre.", {
                'code': 'PARTICIPANT_NOT_IN_STAGE',
                'participant': participant.full_name,
                'stage': stage.name,
                'participant_stages': []
            }
        else:
            return False, f"⚠️ MAUVAIS STAGE: {participant.full_name} n'est PAS inscrit au stage '{stage.name}'. Cette personne est inscrite aux stages: {', '.join(participant_stages)}. Vous devez l'assigner pour un de SES stages, pas pour un autre stage.", {
                'code': 'PARTICIPANT_NOT_IN_STAGE',
                'participant': participant.full_name,
                'stage_requested': stage.name,
                'participant_stages': participant_stages
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
                existing_stages = existing.stages.all()
                
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
            assignments.append({
                'participant': p.full_name,
                'bed': p.assigned_bed,
                'gender': p.get_gender_display(),
                'period': f"{p.assignment_start_date} - {p.assignment_end_date}",
                'stages': [s.name for s in p.stages.all()]
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

class ParticipantType:
    STUDENT = "Eleve"
    TEACHER = "Enseignant"
    STAFF = "Salarie"
    RESIDENT = "Resident"

class BedType:
    SINGLE = "simple"
    DOUBLE = "double"

# --- Automatic Assignment Helper Functions ---

# Note: The existing functions 'check_date_overlap', 
# 'get_participant_assignment_dates', and 'validate_assignment' (which enforces 
# gender, stage, and overlap rules) are reused here.

def find_best_bed_for_teacher_or_staff(
    participant: 'Participant', 
    stage: 'Stage', 
    all_bungalows: List['Bungalow'], 
    is_teacher: bool
) -> Optional[Tuple['Bungalow', str]]:
    """
    Finds the best bungalow and bed for a single-occupancy assignment.
    Priority: Double bed (for teacher), then any single/double bed (for staff).
    """
    
    target_bed_type = BedType.DOUBLE if is_teacher else None

    # Try to find a completely free room first (for exclusivity)
    for bungalow in all_bungalows:
        assignment_start, assignment_end = get_participant_assignment_dates(participant, stage)
        
        # Check if the bungalow is empty during the period
        # In a real Django setup, this would be an expensive query:
        occupants = bungalow.get_current_occupants(assignment_start, assignment_end) 
        if occupants:
            continue # We want an empty room for priority 1 and 2

        for bed in bungalow.beds:
            bed_id = bed.get('id')
            bed_type = bed.get('type')
            
            # 1. Double bed required for teachers
            if is_teacher and bed_type != target_bed_type:
                continue

            # 2. Single or double bed for staff (Any valid bed)
            if not is_teacher and bed_type not in [BedType.SINGLE, BedType.DOUBLE]:
                continue
                
            # Check basic validity (gender, stage, overlap - though overlap 
            # shouldn't fail if the room is empty)
            is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
            
            if is_valid:
                return bungalow, bed_id

    return None

def find_best_bed_for_student(
    participant: 'Participant', 
    stage: 'Stage', 
    all_bungalows: List['Bungalow']
) -> Optional[Tuple['Bungalow', str]]:
    """
    Finds the best bed for a student, prioritizing fill optimization.
    Priority:
    1. Bungalow already occupied by a student of the same stage/gender, with an available single bed.
    2. New, empty bungalow.
    """
    assignment_start, assignment_end = get_participant_assignment_dates(participant, stage)
    
    # 1. Search for a PARTIALLY filled bungalow (Optimization step)
    for bungalow in all_bungalows:
        occupants = bungalow.get_current_occupants(assignment_start, assignment_end)
        
        if occupants:
            # Check if at least one occupant is compatible (same stage, same gender)
            compatible_occupant = next(
                (
                    o for o in occupants 
                    if o.gender == participant.gender and 
                       o.stages_all() and any(s.name == stage.name for s in o.stages_all()) # Check same stage
                ), 
                None
            )
            
            if compatible_occupant:
                # Check the max capacity constraint for this specific stage
                if len(occupants) < stage.max_students_per_room:
                    # Find the first available single bed
                    for bed in bungalow.beds:
                        bed_id = bed.get('id')
                        # Ensure the bed is not already occupied
                        if not any(o.assigned_bed == bed_id for o in occupants):
                            # The validation function handles all remaining checks (overlap on bed)
                            is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                            if is_valid:
                                return bungalow, bed_id

    # 2. Search for a NEW bungalow (empty)
    for bungalow in all_bungalows:
        # Check if the bungalow is empty during the period
        if not bungalow.get_current_occupants(assignment_start, assignment_end):
            # Find the first available single bed
            for bed in bungalow.beds:
                bed_id = bed.get('id')
                is_valid, _, _ = validate_assignment(participant, bungalow, bed_id, stage)
                if is_valid:
                    return bungalow, bed_id
                    
    return None


def assign_participants_automatically(
    participants_to_assign: List['Participant'], 
    stage: 'Stage', 
    all_bungalows: List['Bungalow']
) -> Dict[str, List[Dict]]:
    """
    Optimized automatic assignment of participants for a given stage.
    """
    
    results = {'success': [], 'failure': []}
    
    # --- 1. SEPARATE GROUPS FOR PRIORITIZATION ---
    teachers = [p for p in participants_to_assign if p.p_type == ParticipantType.TEACHER]
    staff = [p for p in participants_to_assign if p.p_type == ParticipantType.STAFF]
    students_and_residents = [p for p in participants_to_assign if p.p_type in [ParticipantType.STUDENT, ParticipantType.RESIDENT]]
    
    # --- 2. PRIORITY 1: TEACHERS (Individual room, Double bed) ---
    for p in teachers:
        assignment = find_best_bed_for_teacher_or_staff(p, stage, all_bungalows, is_teacher=True)
        if assignment:
            bungalow, bed_id = assignment
            success, message, details = assign_participant_to_bungalow(p, bungalow, bed_id, stage)
            if success:
                results['success'].append(details)
            else:
                results['failure'].append({'participant': p.full_name, 'reason': message, 'details': details})
        else:
            results['failure'].append({'participant': p.full_name, 'reason': "No suitable individual room/double bed found for the teacher."})
            
    # --- 3. PRIORITY 2: STAFF / REINFORCEMENTS (Individual room) ---
    for p in staff:
        assignment = find_best_bed_for_teacher_or_staff(p, stage, all_bungalows, is_teacher=False)
        if assignment:
            bungalow, bed_id = assignment
            success, message, details = assign_participant_to_bungalow(p, bungalow, bed_id, stage)
            if success:
                results['success'].append(details)
            else:
                results['failure'].append({'participant': p.full_name, 'reason': message, 'details': details})
        else:
            results['failure'].append({'participant': p.full_name, 'reason': "No suitable individual room found for the staff member."})

    # --- 4. PRIORITY 3: STUDENTS / RESIDENTS (Fill Optimization) ---
    
    # Sort students for better cohabitation grouping (Optimization: Greedy Approach)
    # Sort key: (gender, language, age_group)
    students_and_residents.sort(key=lambda p: (p.gender, p.language, p.age_group))
    
    for p in students_and_residents:
        assignment = find_best_bed_for_student(p, stage, all_bungalows)
        if assignment:
            bungalow, bed_id = assignment
            # Assign the participant
            success, message, details = assign_participant_to_bungalow(p, bungalow, bed_id, stage)
            if success:
                results['success'].append(details)
            else:
                results['failure'].append({'participant': p.full_name, 'reason': message, 'details': details})
        else:
            results['failure'].append({'participant': p.full_name, 'reason': "No available bed found for the student while respecting all constraints. External housing may be required."})
            
    return results
