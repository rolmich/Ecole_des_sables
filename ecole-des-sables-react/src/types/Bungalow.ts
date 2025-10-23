export interface Bungalow {
  id: number;
  name: string;
  village: 'A' | 'B' | 'C';
  type: 'A' | 'B'; // A: 3 single beds, B: 1 single + 1 double
  capacity: number;
  occupancy: number;
  beds: { id: string; type: 'single' | 'double'; occupiedBy: number | null }[];
  amenities: string[]; // e.g., 'shared_bathroom', 'private_bathroom'
}


