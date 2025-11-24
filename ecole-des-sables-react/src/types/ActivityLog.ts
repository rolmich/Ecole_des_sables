export interface ActivityLog {
  id: number;
  user: number | null;
  userName: string;
  userEmail: string | null;
  actionType: 'create' | 'update' | 'delete' | 'assign' | 'unassign';
  actionTypeDisplay: string;
  modelName: 'Stage' | 'Participant' | 'Bungalow' | 'Village' | 'Language';
  modelNameDisplay: string;
  objectId: number | null;
  objectRepr: string;
  description: string;
  changes: Record<string, any>;
  timestamp: string;
}

export interface ActivityLogStats {
  total: number;
  recent24h: number;
  byType: {
    type: string;
    count: number;
  }[];
  byModel: {
    model: string;
    count: number;
  }[];
  topUsers: {
    id: number;
    username: string;
    name: string;
    count: number;
  }[];
}
