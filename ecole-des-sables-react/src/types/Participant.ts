export interface Participant {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  gender: 'M' | 'F';
  age: number;
  language: string;
  status: 'student' | 'instructor' | 'professional' | 'staff';
  stageIds: number[];  // Changed from stageId to stageIds (array)
  assignedBungalowId?: number;
  assignedBed?: string;
}
