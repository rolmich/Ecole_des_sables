export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  role: 'admin' | 'manager' | 'staff';
  department?: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string | null;
  createdAt: string;
  createdBy: string;
  password?: string; // Ajout du champ password optionnel pour la création
}

