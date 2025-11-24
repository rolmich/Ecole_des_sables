// Type pour l'inscription d'un participant à un événement
export interface ParticipantStage {
  id: number;

  // Informations du participant
  participantId: number;
  participantName: string;
  participantEmail: string;
  participantGender: 'M' | 'F';
  participantAge: number;
  participantNationality: string;
  participantStatus: 'student' | 'instructor' | 'professional' | 'staff';
  participantLanguage: string;

  // Informations de l'événement
  stageId: number;
  stageName: string;
  stageStartDate: string;
  stageEndDate: string;

  // Informations spécifiques à la participation
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  role: 'participant' | 'musician' | 'instructor' | 'staff';
  roleDisplay: string;
  notes?: string;

  // Dates effectives (arrival/departure ou dates du stage si non spécifiées)
  effectiveArrivalDate: string;
  effectiveDepartureDate: string;

  // Informations d'assignation
  assignedBungalowId?: number;
  assignedBungalowName?: string;
  assignedBed?: string;
  isAssigned: boolean;

  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

// Type pour créer une nouvelle inscription
export interface ParticipantStageCreate {
  participantId: number;
  stageId: number;
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  role?: 'participant' | 'musician' | 'instructor' | 'staff';
  notes?: string;
}

// Type pour mettre à jour une inscription
export interface ParticipantStageUpdate {
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  role?: 'participant' | 'musician' | 'instructor' | 'staff';
  notes?: string;
}

// Statistiques des participants d'un événement
export interface StageParticipantsStats {
  stageId: number;
  stageName: string;
  totalParticipants: number;
  capacity: number;
  availableSpots: number;
  assignedToBungalow: number;
  notAssigned: number;
  byRole: {
    participant: number;
    musician: number;
    instructor: number;
    staff: number;
  };
}
