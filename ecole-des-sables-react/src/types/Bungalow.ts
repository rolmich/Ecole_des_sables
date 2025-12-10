// Type pour l'information d'occupation d'un lit
export interface BedOccupant {
  registrationId: number;
  participantId: number;
  name: string;
  gender: 'M' | 'F';
  age?: number;
  nationality?: string;
  languages?: string[];
  role?: 'instructor' | 'musician' | 'staff' | 'participant';
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  stageName: string;
  wasForced?: boolean;  // Indique si l'assignation a été forcée (conflit accepté)
}

export interface Bed {
  id: string;
  type: 'single' | 'double';
  // occupiedBy peut être:
  // - un objet BedOccupant (données du backend)
  // - une string (ancien format)
  // - un number (données de fallback locales)
  // - null (lit non occupé)
  occupiedBy: BedOccupant | string | number | null;
}

export interface Bungalow {
  id: number;
  name: string;
  village: 'A' | 'B' | 'C';
  type: 'A' | 'B'; // A: 3 single beds, B: 1 single + 1 double
  capacity: number;
  occupancy: number;
  beds: Bed[];
  amenities: string[]; // e.g., 'shared_bathroom', 'private_bathroom'
}
