// Type pour un participant (données de base, indépendant des événements)
export interface Participant {
  id: number;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  gender: 'M' | 'F';
  age: number;
  nationality?: string;
  language: string;
  languageIds?: number[];
  status: 'student' | 'instructor' | 'professional' | 'staff';

  // Assignation au bungalow
  assignedBungalowId?: number;
  assignedBed?: string;
  isAssigned?: boolean;

  // DEPRECATED: Ces champs seront retirés dans une future version
  // Utilisez ParticipantStage pour la liaison participant-événement
  stageIds?: number[];

  // Nombre d'événements (calculé côté serveur via ParticipantStage)
  stageCount?: number;

  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

// Type pour créer un participant (sans lien événement)
export interface ParticipantCreate {
  firstName: string;
  lastName: string;
  email: string;
  gender: 'M' | 'F';
  age: number;
  nationality?: string;
  language: string;
  languageIds?: number[];
  status: 'student' | 'instructor' | 'professional' | 'staff';
}

// Type pour mettre à jour un participant
export interface ParticipantUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  gender?: 'M' | 'F';
  age?: number;
  nationality?: string;
  language?: string;
  languageIds?: number[];
  status?: 'student' | 'instructor' | 'professional' | 'staff';
}

// Type pour la recherche de participants
export interface ParticipantSearch {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  nationality?: string;
  stageCount: number;
}
