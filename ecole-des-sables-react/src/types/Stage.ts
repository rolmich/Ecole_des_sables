export interface Stage {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  instructor: string;
  capacity: number;
  currentParticipants: number;
  constraints: string[];
  assignedParticipantsCount?: number;
  assignedBungalowsCount?: number;
}


