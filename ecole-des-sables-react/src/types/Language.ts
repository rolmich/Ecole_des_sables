export interface Language {
  id: number;
  code: string;
  name: string;
  nativeName?: string;
  isActive: boolean;
  displayOrder: number;
  participantCount?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
}

export interface LanguageCreateData {
  code: string;
  name: string;
  nativeName?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface LanguageUpdateData {
  code?: string;
  name?: string;
  nativeName?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface LanguageStatistics {
  total: number;
  active: number;
  inactive: number;
  topLanguages: Array<{
    id: number;
    name: string;
    code: string;
    count: number;
  }>;
}
