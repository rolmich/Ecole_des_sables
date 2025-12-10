import { User } from '../types/User';
import { Participant, ParticipantCreate } from '../types/Participant';
import { Stage } from '../types/Stage';
import { Bungalow } from '../types/Bungalow';
import { ActivityLog, ActivityLogStats } from '../types/ActivityLog';
import { ParticipantStage, ParticipantStageCreate, ParticipantStageUpdate, StageParticipantsStats } from '../types/ParticipantStage';
import apiService from './api';

class DataService {
  private users: User[] = [
    {
      id: 1,
      firstName: 'Marie',
      lastName: 'Dubois',
      email: 'marie.dubois@ecoledesables.org',
      username: 'marie.dubois',
      phone: '+221 77 123 45 67',
      role: 'admin',
      department: 'administration',
      permissions: ['stages', 'participants', 'villages', 'assignments', 'reports', 'users'],
      status: 'active',
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: '2023-01-15T10:00:00Z',
      createdBy: 'System'
    },
    {
      id: 2,
      firstName: 'Ahmed',
      lastName: 'Diallo',
      email: 'ahmed.diallo@ecoledesables.org',
      username: 'ahmed.diallo',
      phone: '+221 77 234 56 78',
      role: 'manager',
      department: 'logements',
      permissions: ['stages', 'participants', 'villages', 'assignments'],
      status: 'active',
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2023-02-20T14:30:00Z',
      createdBy: 'Marie Dubois'
    },
    {
      id: 3,
      firstName: 'Sophie',
      lastName: 'Martin',
      email: 'sophie.martin@ecoledesables.org',
      username: 'sophie.martin',
      phone: '+221 77 345 67 89',
      role: 'staff',
      department: 'accueil',
      permissions: ['participants', 'villages'],
      status: 'active',
      lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2023-03-10T09:15:00Z',
      createdBy: 'Marie Dubois'
    },
    {
      id: 4,
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@ecoledesables.org',
      username: 'jean.dupont',
      phone: '+221 77 456 78 90',
      role: 'manager',
      department: 'stages',
      permissions: ['stages', 'participants', 'reports'],
      status: 'pending',
      lastLogin: null,
      createdAt: new Date().toISOString(),
      createdBy: 'Marie Dubois'
    },
    {
      id: 5,
      firstName: 'Fatou',
      lastName: 'Cissé',
      email: 'fatou.cisse@ecoledesables.org',
      username: 'fatou.cisse',
      phone: '+221 77 567 89 01',
      role: 'admin',
      department: 'stages',
      permissions: ['stages', 'participants', 'villages', 'assignments', 'reports', 'users'],
      status: 'inactive',
      lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2023-01-01T08:00:00Z',
      createdBy: 'System'
    }
  ];

  private participants: Participant[] = [
    // Participants assignés
    {
      id: 1,
      firstName: 'Aïcha',
      lastName: 'Diop',
      email: 'aicha.diop@email.com',
      gender: 'F',
      age: 28,
      language: 'Français',
      status: 'professional',
      stageIds: [1],
      assignedBungalowId: 1,
      assignedBed: 'A1'
    },
    {
      id: 2,
      firstName: 'Moussa',
      lastName: 'Traoré',
      email: 'moussa.traore@email.com',
      gender: 'M',
      age: 32,
      language: 'Français',
      status: 'instructor',
      stageIds: [1],
      assignedBungalowId: 2,
      assignedBed: 'A2'
    },
    {
      id: 3,
      firstName: 'Fatou',
      lastName: 'Cissé',
      email: 'fatou.cisse@email.com',
      gender: 'F',
      age: 25,
      language: 'Français',
      status: 'student',
      stageIds: [2],
      assignedBungalowId: 3,
      assignedBed: 'B1'
    },
    // Participants non assignés pour le drag & drop
    {
      id: 4,
      firstName: 'Sophie',
      lastName: 'Martin',
      email: 'sophie.martin@email.com',
      gender: 'F',
      age: 32,
      language: 'Français',
      status: 'student',
      stageIds: [1],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 5,
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@email.com',
      gender: 'M',
      age: 26,
      language: 'Français',
      status: 'student',
      stageIds: [1],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 6,
      firstName: 'Marie',
      lastName: 'Dubois',
      email: 'marie.dubois@email.com',
      gender: 'F',
      age: 24,
      language: 'Français',
      status: 'student',
      stageIds: [2],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 7,
      firstName: 'Ahmed',
      lastName: 'Diallo',
      email: 'ahmed.diallo@email.com',
      gender: 'M',
      age: 28,
      language: 'Wolof',
      status: 'student',
      stageIds: [2],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 8,
      firstName: 'Aminata',
      lastName: 'Sarr',
      email: 'aminata.sarr@email.com',
      gender: 'F',
      age: 31,
      language: 'Français',
      status: 'student',
      stageIds: [3],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 9,
      firstName: 'Ousmane',
      lastName: 'Faye',
      email: 'ousmane.faye@email.com',
      gender: 'M',
      age: 33,
      language: 'Pulaar',
      status: 'student',
      stageIds: [3],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 10,
      firstName: 'Ndeye',
      lastName: 'Fall',
      email: 'ndeye.fall@email.com',
      gender: 'F',
      age: 29,
      language: 'Wolof',
      status: 'student',
      stageIds: [1],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 11,
      firstName: 'Cheikh',
      lastName: 'Niang',
      email: 'cheikh.niang@email.com',
      gender: 'M',
      age: 27,
      language: 'Français',
      status: 'student',
      stageIds: [2],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 12,
      firstName: 'Awa',
      lastName: 'Gueye',
      email: 'awa.gueye@email.com',
      gender: 'F',
      age: 26,
      language: 'Français',
      status: 'student',
      stageIds: [3],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 13,
      firstName: 'Modou',
      lastName: 'Diagne',
      email: 'modou.diagne@email.com',
      gender: 'M',
      age: 30,
      language: 'Wolof',
      status: 'student',
      stageIds: [1],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 14,
      firstName: 'Rokhaya',
      lastName: 'Mbaye',
      email: 'rokhaya.mbaye@email.com',
      gender: 'F',
      age: 25,
      language: 'Français',
      status: 'student',
      stageIds: [2],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 15,
      firstName: 'Mamadou',
      lastName: 'Thiam',
      email: 'mamadou.thiam@email.com',
      gender: 'M',
      age: 34,
      language: 'Pulaar',
      status: 'student',
      stageIds: [3],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 16,
      firstName: 'Aïssatou',
      lastName: 'Camara',
      email: 'aissatou.camara@email.com',
      gender: 'F',
      age: 28,
      language: 'Français',
      status: 'student',
      stageIds: [1],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 17,
      firstName: 'Papa',
      lastName: 'Sène',
      email: 'papa.sene@email.com',
      gender: 'M',
      age: 31,
      language: 'Wolof',
      status: 'student',
      stageIds: [2],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 18,
      firstName: 'Khadija',
      lastName: 'Ndiaye',
      email: 'khadija.ndiaye@email.com',
      gender: 'F',
      age: 27,
      language: 'Français',
      status: 'student',
      stageIds: [3],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 19,
      firstName: 'Ibrahima',
      lastName: 'Sow',
      email: 'ibrahima.sow@email.com',
      gender: 'M',
      age: 29,
      language: 'Pulaar',
      status: 'student',
      stageIds: [1],
      assignedBungalowId: undefined,
      assignedBed: undefined
    },
    {
      id: 20,
      firstName: 'Mariama',
      lastName: 'Diallo',
      email: 'mariama.diallo@email.com',
      gender: 'F',
      age: 30,
      language: 'Français',
      status: 'student',
      stageIds: [2],
      assignedBungalowId: undefined,
      assignedBed: undefined
    }
  ];

  private stages: Stage[] = [
    // Stages Actifs (en cours) - Dates 2025
    {
      id: 1,
      name: 'Danse Contemporaine Avancée',
      startDate: '2025-09-15',
      endDate: '2025-12-15',
      eventType: 'stage',
      instructor: 'Germaine Acogny',
      capacity: 20,
      currentParticipants: 18,
      musiciansCount: 2,
      constraints: ['Village A uniquement', 'Pas de mixité']
    },
    {
      id: 2,
      name: 'Formation Professionnelle',
      startDate: '2025-10-01',
      endDate: '2025-12-31',
      eventType: 'stage',
      instructor: 'Patrick Acogny',
      capacity: 15,
      currentParticipants: 12,
      musiciansCount: 2,
      constraints: ['Village B uniquement']
    },
    {
      id: 3,
      name: 'Technique de Base',
      startDate: '2025-10-15',
      endDate: '2026-01-15',
      eventType: 'stage',
      instructor: 'Marie Dubois',
      capacity: 30,
      currentParticipants: 25,
      musiciansCount: 1,
      constraints: ['Tous villages']
    },
    // Stages À Venir - Dates futures 2026
    {
      id: 4,
      name: 'Danse Africaine Moderne',
      startDate: '2026-01-15',
      endDate: '2026-03-15',
      eventType: 'stage',
      instructor: 'Fatou Cissé',
      capacity: 18,
      currentParticipants: 0,
      musiciansCount: 2,
      constraints: ['Village A uniquement']
    },
    {
      id: 5,
      name: 'Perfectionnement Technique',
      startDate: '2026-02-01',
      endDate: '2026-04-01',
      eventType: 'stage',
      instructor: 'Amadou Ba',
      capacity: 22,
      currentParticipants: 0,
      musiciansCount: 1,
      constraints: ['Village B uniquement', 'Niveau avancé']
    },
    {
      id: 6,
      name: 'Création Chorégraphique',
      startDate: '2026-03-01',
      endDate: '2026-05-01',
      eventType: 'resident',
      instructor: 'Khadija Ndiaye',
      capacity: 12,
      currentParticipants: 0,
      musiciansCount: 3,
      constraints: ['Village C uniquement', 'Projet final']
    },
    // Stages Terminés
    {
      id: 7,
      name: 'Danse Traditionnelle',
      startDate: '2023-12-01',
      endDate: '2023-12-14',
      eventType: 'stage',
      instructor: 'Aïcha Diallo',
      capacity: 25,
      currentParticipants: 25,
      musiciansCount: 2,
      constraints: ['Tous villages']
    },
    {
      id: 8,
      name: 'Initiation à la Danse',
      startDate: '2023-11-15',
      endDate: '2023-11-30',
      eventType: 'stage',
      instructor: 'Moussa Traoré',
      capacity: 20,
      currentParticipants: 20,
      musiciansCount: 1,
      constraints: ['Débutants uniquement']
    },
    {
      id: 9,
      name: 'Stage Intensif',
      startDate: '2023-10-01',
      endDate: '2023-10-15',
      eventType: 'stage',
      instructor: 'Ibrahima Sow',
      capacity: 15,
      currentParticipants: 15,
      musiciansCount: 1,
      constraints: ['Village A uniquement', 'Stage intensif']
    },
    {
      id: 10,
      name: 'Masterclass Internationale',
      startDate: '2023-09-01',
      endDate: '2023-09-10',
      eventType: 'autres',
      instructor: 'Guest International',
      capacity: 30,
      currentParticipants: 30,
      musiciansCount: 0,
      constraints: ['Tous niveaux', 'Langue française']
    }
  ];

  private bungalows: Bungalow[] = [
    // Village A - 8 bungalows
    {
      id: 1,
      name: 'A1',
      village: 'A',
      type: 'A',
      capacity: 3,
      occupancy: 2,
      beds: [
        { id: 'A1-1', type: 'single', occupiedBy: 1 },
        { id: 'A1-2', type: 'single', occupiedBy: 2 },
        { id: 'A1-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 2,
      name: 'A2',
      village: 'A',
      type: 'A',
      capacity: 3,
      occupancy: 3,
      beds: [
        { id: 'A2-1', type: 'single', occupiedBy: 3 },
        { id: 'A2-2', type: 'single', occupiedBy: 4 },
        { id: 'A2-3', type: 'single', occupiedBy: 5 }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 3,
      name: 'A3',
      village: 'A',
      type: 'A',
      capacity: 3,
      occupancy: 1,
      beds: [
        { id: 'A3-1', type: 'single', occupiedBy: 6 },
        { id: 'A3-2', type: 'single', occupiedBy: null },
        { id: 'A3-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 4,
      name: 'A4',
      village: 'A',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'A4-1', type: 'single', occupiedBy: null },
        { id: 'A4-2', type: 'single', occupiedBy: null },
        { id: 'A4-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 5,
      name: 'A5',
      village: 'A',
      type: 'B',
      capacity: 2,
      occupancy: 2,
      beds: [
        { id: 'A5-1', type: 'single', occupiedBy: 7 },
        { id: 'A5-2', type: 'double', occupiedBy: 8 }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 6,
      name: 'A6',
      village: 'A',
      type: 'A',
      capacity: 3,
      occupancy: 1,
      beds: [
        { id: 'A6-1', type: 'single', occupiedBy: 9 },
        { id: 'A6-2', type: 'single', occupiedBy: null },
        { id: 'A6-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 7,
      name: 'A7',
      village: 'A',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'A7-1', type: 'single', occupiedBy: null },
        { id: 'A7-2', type: 'single', occupiedBy: null },
        { id: 'A7-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 8,
      name: 'A8',
      village: 'A',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'A8-1', type: 'single', occupiedBy: null },
        { id: 'A8-2', type: 'single', occupiedBy: null },
        { id: 'A8-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    // Village B - 8 bungalows
    {
      id: 9,
      name: 'B1',
      village: 'B',
      type: 'B',
      capacity: 2,
      occupancy: 1,
      beds: [
        { id: 'B1-1', type: 'single', occupiedBy: 10 },
        { id: 'B1-2', type: 'double', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 10,
      name: 'B2',
      village: 'B',
      type: 'A',
      capacity: 3,
      occupancy: 2,
      beds: [
        { id: 'B2-1', type: 'single', occupiedBy: 11 },
        { id: 'B2-2', type: 'single', occupiedBy: 12 },
        { id: 'B2-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 11,
      name: 'B3',
      village: 'B',
      type: 'A',
      capacity: 3,
      occupancy: 3,
      beds: [
        { id: 'B3-1', type: 'single', occupiedBy: 13 },
        { id: 'B3-2', type: 'single', occupiedBy: 14 },
        { id: 'B3-3', type: 'single', occupiedBy: 15 }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 12,
      name: 'B4',
      village: 'B',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'B4-1', type: 'single', occupiedBy: null },
        { id: 'B4-2', type: 'single', occupiedBy: null },
        { id: 'B4-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 13,
      name: 'B5',
      village: 'B',
      type: 'B',
      capacity: 2,
      occupancy: 0,
      beds: [
        { id: 'B5-1', type: 'single', occupiedBy: null },
        { id: 'B5-2', type: 'double', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 14,
      name: 'B6',
      village: 'B',
      type: 'A',
      capacity: 3,
      occupancy: 1,
      beds: [
        { id: 'B6-1', type: 'single', occupiedBy: 16 },
        { id: 'B6-2', type: 'single', occupiedBy: null },
        { id: 'B6-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 15,
      name: 'B7',
      village: 'B',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'B7-1', type: 'single', occupiedBy: null },
        { id: 'B7-2', type: 'single', occupiedBy: null },
        { id: 'B7-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    {
      id: 16,
      name: 'B8',
      village: 'B',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'B8-1', type: 'single', occupiedBy: null },
        { id: 'B8-2', type: 'single', occupiedBy: null },
        { id: 'B8-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['shared_bathroom', 'air_conditioning']
    },
    // Village C - 8 bungalows
    {
      id: 17,
      name: 'C1',
      village: 'C',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'C1-1', type: 'single', occupiedBy: null },
        { id: 'C1-2', type: 'single', occupiedBy: null },
        { id: 'C1-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['private_bathroom', 'air_conditioning', 'wifi']
    },
    {
      id: 18,
      name: 'C2',
      village: 'C',
      type: 'B',
      capacity: 2,
      occupancy: 2,
      beds: [
        { id: 'C2-1', type: 'single', occupiedBy: 17 },
        { id: 'C2-2', type: 'double', occupiedBy: 18 }
      ],
      amenities: ['private_bathroom', 'air_conditioning', 'wifi']
    },
    {
      id: 19,
      name: 'C3',
      village: 'C',
      type: 'A',
      capacity: 3,
      occupancy: 1,
      beds: [
        { id: 'C3-1', type: 'single', occupiedBy: 19 },
        { id: 'C3-2', type: 'single', occupiedBy: null },
        { id: 'C3-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['private_bathroom', 'air_conditioning', 'wifi']
    },
    {
      id: 20,
      name: 'C4',
      village: 'C',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'C4-1', type: 'single', occupiedBy: null },
        { id: 'C4-2', type: 'single', occupiedBy: null },
        { id: 'C4-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['private_bathroom', 'air_conditioning', 'wifi']
    },
    {
      id: 21,
      name: 'C5',
      village: 'C',
      type: 'B',
      capacity: 2,
      occupancy: 0,
      beds: [
        { id: 'C5-1', type: 'single', occupiedBy: null },
        { id: 'C5-2', type: 'double', occupiedBy: null }
      ],
      amenities: ['private_bathroom', 'air_conditioning', 'wifi']
    },
    {
      id: 22,
      name: 'C6',
      village: 'C',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'C6-1', type: 'single', occupiedBy: null },
        { id: 'C6-2', type: 'single', occupiedBy: null },
        { id: 'C6-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['private_bathroom', 'air_conditioning', 'wifi']
    },
    {
      id: 23,
      name: 'C7',
      village: 'C',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'C7-1', type: 'single', occupiedBy: null },
        { id: 'C7-2', type: 'single', occupiedBy: null },
        { id: 'C7-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['private_bathroom', 'air_conditioning', 'wifi']
    },
    {
      id: 24,
      name: 'C8',
      village: 'C',
      type: 'A',
      capacity: 3,
      occupancy: 0,
      beds: [
        { id: 'C8-1', type: 'single', occupiedBy: null },
        { id: 'C8-2', type: 'single', occupiedBy: null },
        { id: 'C8-3', type: 'single', occupiedBy: null }
      ],
      amenities: ['private_bathroom', 'air_conditioning', 'wifi']
    }
  ];

  // Méthodes pour récupérer les utilisateurs (maintenant depuis l'API)
  async getUsers(params?: { role?: string; status?: string; search?: string }): Promise<User[]> {
    try {
      const response = await apiService.getUsers(params);
      // L'API retourne une liste paginée avec {count, next, previous, results}
      return response.results || response;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      // Fallback sur les données locales en cas d'erreur
      return this.users;
    }
  }

  async addUser(userData: any): Promise<User> {
    try {
      const newUser = await apiService.createUser(userData);
      return newUser;
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la création de l\'utilisateur');
    }
  }

  async updateUser(id: number, updates: any): Promise<User> {
    try {
      const updatedUser = await apiService.updateUser(id, updates);
      return updatedUser;
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la mise à jour de l\'utilisateur');
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await apiService.deleteUser(id);
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la suppression de l\'utilisateur');
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await apiService.changePassword(oldPassword, newPassword);
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors du changement de mot de passe');
    }
  }

  async resetUserPassword(userId: number, newPassword: string): Promise<void> {
    try {
      await apiService.resetUserPassword(userId, newPassword);
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la réinitialisation du mot de passe');
    }
  }

  // Méthodes pour les stages (maintenant depuis l'API)
  async getStages(params?: { status?: string; search?: string }): Promise<Stage[]> {
    try {
      const response = await apiService.getStages(params);
      return response.results || response;
    } catch (error) {
      console.error('Erreur lors de la récupération des stages:', error);
      return this.stages; // Fallback sur les données locales
    }
  }

  async addStage(stage: Omit<Stage, 'id' | 'currentParticipants'>): Promise<Stage> {
    try {
      const newStage = await apiService.createStage(stage);
      return newStage;
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la création du stage');
    }
  }

  async updateStage(id: number, updates: Partial<Stage>): Promise<Stage> {
    try {
      const updatedStage = await apiService.updateStage(id, updates);
      return updatedStage;
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la mise à jour du stage');
    }
  }

  async deleteStage(id: number): Promise<boolean> {
    try {
      await apiService.deleteStage(id);
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la suppression du stage');
    }
  }

  async getStageDetail(id: number): Promise<Stage> {
    try {
      return await apiService.getStageDetail(id);
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la récupération du stage');
    }
  }

  async getStageById(id: number): Promise<Stage> {
    try {
      return await apiService.getStageDetail(id);
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la récupération du stage');
    }
  }

  // Méthodes pour les participants (maintenant depuis l'API)
  async getParticipants(params?: { stageIds?: number[]; status?: string; search?: string; assigned?: boolean }): Promise<Participant[]> {
    try {
      const response = await apiService.getParticipants(params);
      return response.results || response;
    } catch (error) {
      console.error('Erreur lors de la récupération des participants:', error);
      return this.participants; // Fallback sur les données locales
    }
  }

  async addParticipant(participant: Omit<Participant, 'id' | 'assignedBungalowId' | 'assignedBed'>): Promise<Participant> {
    try {
      const newParticipant = await apiService.createParticipant(participant);
      return newParticipant;
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la création du participant');
    }
  }

  async updateParticipant(id: number, updates: Partial<Participant>): Promise<Participant> {
    try {
      const updatedParticipant = await apiService.updateParticipant(id, updates);
      return updatedParticipant;
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la mise à jour du participant');
    }
  }

  async deleteParticipant(id: number): Promise<boolean> {
    try {
      await apiService.deleteParticipant(id);
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la suppression du participant');
    }
  }

  async getParticipantDetail(id: number): Promise<Participant> {
    try {
      return await apiService.getParticipantDetail(id);
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la récupération du participant');
    }
  }

  async getParticipantsByStage(stageId: number): Promise<Participant[]> {
    try {
      const response = await apiService.getParticipantsByStage(stageId);
      return response.participants || [];
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la récupération des participants du stage');
    }
  }

  async getUnassignedParticipants(): Promise<Participant[]> {
    try {
      const response = await apiService.getUnassignedParticipants();
      return response.participants || [];
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la récupération des participants non assignés');
    }
  }

  // Méthodes pour les bungalows (maintenant depuis l'API)
  async getBungalows(params?: { village?: string; available?: boolean }): Promise<Bungalow[]> {
    try {
      const response = await apiService.getBungalows(params);
      return response.results || response;
    } catch (error) {
      console.error('Erreur lors de la récupération des bungalows:', error);
      return this.bungalows; // Fallback sur les données locales
    }
  }

  async getBungalowDetail(id: number): Promise<Bungalow> {
    try {
      return await apiService.getBungalowDetail(id);
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la récupération du bungalow');
    }
  }

  async getBungalowsByVillage(villageName: string): Promise<Bungalow[]> {
    try {
      const response = await apiService.getBungalowsByVillage(villageName);
      return response.bungalows || [];
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la récupération des bungalows du village');
    }
  }

  async getAvailableBungalows(): Promise<Bungalow[]> {
    try {
      const response = await apiService.getAvailableBungalows();
      return response.bungalows || [];
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la récupération des bungalows disponibles');
    }
  }

  // Méthodes pour les villages
  async getVillages(): Promise<any[]> {
    try {
      return await apiService.getVillages();
    } catch (error) {
      console.error('Erreur lors de la récupération des villages:', error);
      return [];
    }
  }

  async getVillageDetail(id: number): Promise<any> {
    try {
      return await apiService.getVillageDetail(id);
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la récupération du village');
    }
  }

  async getVillageStatistics(): Promise<any> {
    try {
      return await apiService.getVillageStatistics();
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la récupération des statistiques des villages');
    }
  }

  // Méthodes d'assignation
  async assignParticipant(participantId: number, bungalowId: number, bed: string, stageId: number): Promise<any> {
    try {
      console.log('[DataService] assignParticipant:', { participantId, bungalowId, bed, stageId });
      const result = await apiService.assignParticipant(participantId, { bungalowId, bed, stageId });
      console.log('[DataService] assignParticipant result:', result);
      return result;
    } catch (error: any) {
      console.error('[DataService] assignParticipant error:', error);
      throw error;
    }
  }

  async unassignParticipant(participantId: number): Promise<any> {
    try {
      console.log('[DataService] unassignParticipant:', participantId);
      return await apiService.unassignParticipant(participantId);
    } catch (error: any) {
      console.error('[DataService] unassignParticipant error:', error);
      throw error;
    }
  }

  // ==================== ACTIVITY LOG METHODS ====================

  async getActivityLogs(params?: {
    user_id?: number;
    action_type?: string;
    model_name?: string;
    search?: string;
  }): Promise<ActivityLog[]> {
    try {
      console.log('[DataService] getActivityLogs:', params);
      return await apiService.getActivityLogs(params);
    } catch (error: any) {
      console.error('[DataService] getActivityLogs error:', error);
      throw error;
    }
  }

  async getActivityLogStats(): Promise<ActivityLogStats> {
    try {
      console.log('[DataService] getActivityLogStats');
      return await apiService.getActivityLogStats();
    } catch (error: any) {
      console.error('[DataService] getActivityLogStats error:', error);
      throw error;
    }
  }

  // ==================== PARTICIPANT STAGE METHODS (inscriptions) ====================

  async getStageParticipants(stageId: number): Promise<ParticipantStage[]> {
    try {
      console.log('[DataService] getStageParticipants:', stageId);
      const response = await apiService.getStageParticipants(stageId);
      // Gérer la pagination si l'API retourne un objet {results: [...]}
      return Array.isArray(response) ? response : (response.results || []);
    } catch (error: any) {
      console.error('[DataService] getStageParticipants error:', error);
      throw error;
    }
  }

  async getStageParticipantsStats(stageId: number): Promise<StageParticipantsStats> {
    try {
      console.log('[DataService] getStageParticipantsStats:', stageId);
      return await apiService.getStageParticipantsStats(stageId);
    } catch (error: any) {
      console.error('[DataService] getStageParticipantsStats error:', error);
      throw error;
    }
  }

  async addParticipantToStage(data: ParticipantStageCreate): Promise<ParticipantStage> {
    try {
      console.log('[DataService] addParticipantToStage:', data);
      return await apiService.addParticipantToStage(data);
    } catch (error: any) {
      console.error('[DataService] addParticipantToStage error:', error);
      throw error;
    }
  }

  async updateParticipantStage(id: number, data: ParticipantStageUpdate): Promise<ParticipantStage> {
    try {
      console.log('[DataService] updateParticipantStage:', id, data);
      return await apiService.updateParticipantStage(id, data);
    } catch (error: any) {
      console.error('[DataService] updateParticipantStage error:', error);
      throw error;
    }
  }

  async removeParticipantFromStage(id: number): Promise<void> {
    try {
      console.log('[DataService] removeParticipantFromStage:', id);
      await apiService.removeParticipantFromStage(id);
    } catch (error: any) {
      console.error('[DataService] removeParticipantFromStage error:', error);
      throw error;
    }
  }

  // ==================== PARTICIPANT DIRECTORY METHODS (sans événement) ====================

  async getParticipantsDirectory(): Promise<Participant[]> {
    try {
      console.log('[DataService] getParticipantsDirectory');
      const response = await apiService.getParticipantsDirectory();
      // Gérer la pagination si l'API retourne un objet {results: [...]}
      return Array.isArray(response) ? response : (response.results || []);
    } catch (error: any) {
      console.error('[DataService] getParticipantsDirectory error:', error);
      throw error;
    }
  }

  async createParticipantSimple(data: ParticipantCreate): Promise<Participant> {
    try {
      console.log('[DataService] createParticipantSimple:', data);
      return await apiService.createParticipantSimple(data);
    } catch (error: any) {
      console.error('[DataService] createParticipantSimple error:', error);
      throw error;
    }
  }

  async searchParticipants(query: string, excludeStageId?: number): Promise<Participant[]> {
    try {
      console.log('[DataService] searchParticipants:', query, excludeStageId);
      const response = await apiService.searchParticipants(query, excludeStageId);
      // Gérer la pagination si l'API retourne un objet {results: [...]}
      return Array.isArray(response) ? response : (response.results || []);
    } catch (error: any) {
      console.error('[DataService] searchParticipants error:', error);
      throw error;
    }
  }
}

const dataService = new DataService();
export default dataService;
