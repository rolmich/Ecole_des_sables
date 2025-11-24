export interface Stage {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  eventType: 'stage' | 'resident' | 'autres';
  instructor?: string;
  instructor2?: string;
  instructor3?: string;
  capacity: number;
  currentParticipants: number;
  musiciansCount: number;
  constraints: string[];
  assignedParticipantsCount?: number;
  assignedBungalowsCount?: number;
  warning?: {
    message: string;
    rooms_needed: number;
    total_rooms_used: number;
    total_available: number;
    overlapping_events: number;
    deficit: number;
  };
}


