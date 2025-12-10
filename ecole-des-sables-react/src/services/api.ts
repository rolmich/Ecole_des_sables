/**
 * Service API pour communiquer avec le backend Django
 */

// Fonction pour détecter l'adresse IP du backend
const getBackendUrl = (): string => {
  // Vérifier si une variable d'environnement est définie
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }

  // Détecter automatiquement l'IP depuis l'URL actuelle
  const currentHostname = window.location.hostname;

  // Si on accède via une IP réseau (pas localhost), utiliser cette IP pour le backend
  if (currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
    return `http://${currentHostname}:8000/api`;
  }

  // Par défaut, utiliser localhost
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getBackendUrl();

interface ApiError {
  message: string;
  status: number;
  data?: any;
}

/**
 * Classe pour gérer les requêtes HTTP vers le backend
 */
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }
                                                                     
  /**
   * Récupérer le token d'accès depuis localStorage
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Récupérer le refresh token depuis localStorage
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Sauvegarder les tokens dans localStorage
   */
  private saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  /**
   * Supprimer les tokens du localStorage
   */
  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
  }

  /**
   * Rafraîchir le token d'accès
   */
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.saveTokens(data.access, data.refresh);
        return data.access;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }

    return null;
  }

  /**
   * Faire une requête HTTP avec gestion automatique des tokens
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const accessToken = this.getAccessToken();

    // Ajouter le token d'authentification si disponible
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken && !endpoint.includes('/login') && !endpoint.includes('/register')) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      let response = await fetch(url, {
        ...options,
        headers,
      });

      // Si le token a expiré (401), essayer de le rafraîchir
      if (response.status === 401 && !endpoint.includes('/token/refresh/')) {
        const newAccessToken = await this.refreshAccessToken();
        
        if (newAccessToken) {
          // Retry la requête avec le nouveau token
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          response = await fetch(url, {
            ...options,
            headers,
          });
        } else {
          // Impossible de rafraîchir le token, déconnecter l'utilisateur
          this.clearTokens();
          window.location.href = '/login';
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      if (!response.ok) {
        console.error(`[API] HTTP Error ${response.status} for ${endpoint}`);
        
        const error: any = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        error.response = { status: response.status, data: null };

        try {
          const text = await response.text();
          console.error(`[API] Error response text:`, text);
          
          if (text) {
            try {
              error.response.data = JSON.parse(text);
              error.data = error.response.data;
              console.error(`[API] Error data parsed:`, error.data);
              
              // Extraire le message d'erreur
              if (error.data.error) {
                error.message = error.data.error;
              } else if (error.data.detail) {
                error.message = error.data.detail;
              } else if (typeof error.data === 'object') {
                // Construire un message à partir de tous les champs d'erreur
                const errorMessages = [];
                for (const [field, messages] of Object.entries(error.data)) {
                  if (Array.isArray(messages)) {
                    errorMessages.push(`${field}: ${messages.join(', ')}`);
                  } else if (typeof messages === 'string') {
                    errorMessages.push(`${field}: ${messages}`);
                  }
                }
                if (errorMessages.length > 0) {
                  error.message = errorMessages.join('\n');
                }
              }
            } catch (parseError) {
              console.error(`[API] Failed to parse error JSON:`, parseError);
              error.message = text;
            }
          }
        } catch (e) {
          console.error(`[API] Failed to read error response:`, e);
        }

        console.error(`[API] Final error:`, error);
        throw error;
      }

      // Pour les réponses 204 No Content (DELETE success), pas de JSON
      if (response.status === 204) {
        return null as T;
      }

      // Parser le JSON pour les autres réponses
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Une erreur est survenue lors de la requête');
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Login - Connexion utilisateur
   */
  async login(email: string, password: string): Promise<any> {
    const response = await this.post<any>('/auth/login/', { email, password });
    
    // Sauvegarder les tokens
    if (response.tokens) {
      this.saveTokens(response.tokens.access, response.tokens.refresh);
      
      // Sauvegarder l'utilisateur
      if (response.user) {
        localStorage.setItem('current_user', JSON.stringify(response.user));
      }
    }
    
    return response;
  }

  /**
   * Register - Inscription utilisateur
   */
  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
    password2: string;
  }): Promise<any> {
    const response = await this.post<any>('/auth/register/', userData);
    
    // Sauvegarder les tokens
    if (response.tokens) {
      this.saveTokens(response.tokens.access, response.tokens.refresh);
      
      // Sauvegarder l'utilisateur
      if (response.user) {
        localStorage.setItem('current_user', JSON.stringify(response.user));
      }
    }
    
    return response;
  }

  /**
   * Logout - Déconnexion utilisateur
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    
    if (refreshToken) {
      try {
        await this.post('/auth/logout/', { refresh: refreshToken });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }
    
    this.clearTokens();
  }

  /**
   * Get current user - Récupérer l'utilisateur actuel
   */
  async getCurrentUser(): Promise<any> {
    return this.get('/auth/me/');
  }

  /**
   * Get users - Récupérer la liste des utilisateurs
   */
  async getUsers(params?: {
    role?: string;
    status?: string;
    search?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    
    const query = queryParams.toString();
    return this.get(`/auth/users/${query ? '?' + query : ''}`);
  }

  /**
   * Create user - Créer un utilisateur
   */
  async createUser(userData: any): Promise<any> {
    return this.post('/auth/users/create/', userData);
  }

  /**
   * Get user by ID - Récupérer un utilisateur par son ID
   */
  async getUser(id: number): Promise<any> {
    return this.get(`/auth/users/${id}/`);
  }

  /**
   * Update user - Mettre à jour un utilisateur
   */
  async updateUser(id: number, userData: any): Promise<any> {
    return this.patch(`/auth/users/${id}/update/`, userData);
  }

  /**
   * Delete user - Supprimer un utilisateur
   */
  async deleteUser(id: number): Promise<any> {
    return this.delete(`/auth/users/${id}/delete/`);
  }

  /**
   * Change password - Changer le mot de passe de l'utilisateur courant
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    return this.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword
    });
  }

  /**
   * Reset user password - Réinitialiser le mot de passe d'un utilisateur (admin only)
   */
  async resetUserPassword(userId: number, newPassword: string): Promise<any> {
    return this.post(`/auth/users/${userId}/reset-password/`, {
      new_password: newPassword
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Get stored current user
   */
  getStoredUser(): any | null {
    const userStr = localStorage.getItem('current_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // --- Stage Management Endpoints ---

  async getStages(params?: { status?: string; search?: string }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const endpoint = queryString ? `/stages/?${queryString}` : '/stages/';
    return this.request<any>(endpoint, { method: 'GET' });
  }

  async createStage(stageData: any): Promise<any> {
    return this.request<any>('/stages/', {
      method: 'POST',
      body: JSON.stringify(stageData),
    });
  }

  async getStageDetail(id: number): Promise<any> {
    return this.request<any>(`/stages/${id}/`, { method: 'GET' });
  }

  async updateStage(id: number, updates: any): Promise<any> {
    return this.request<any>(`/stages/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteStage(id: number): Promise<any> {
    console.log(`[API] DELETE Stage ID: ${id}`);
    try {
      const response = await this.request<any>(`/stages/${id}/`, { method: 'DELETE' });
      console.log(`[API] DELETE Stage ${id} - SUCCESS`, response);
      return response;
    } catch (error: any) {
      console.error(`[API] DELETE Stage ${id} - ERROR:`, error);
      console.error(`[API] Error status:`, error.response?.status);
      console.error(`[API] Error data:`, error.response?.data);
      throw error;
    }
  }

  async getStageStatistics(): Promise<any> {
    return this.request<any>('/stages/statistics/', { method: 'GET' });
  }

  // --- Participant Management Endpoints ---

  async getParticipants(params?: { stageIds?: number[]; status?: string; search?: string; assigned?: boolean }): Promise<any> {
    const query = new URLSearchParams();
    // Pour l'instant on n'envoie que le premier stage (backend ne supporte pas encore multi-stage filter)
    if (params?.stageIds && params.stageIds.length > 0) query.append('stageId', params.stageIds[0].toString());
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.assigned !== undefined) query.append('assigned', params.assigned.toString());

    const queryString = query.toString();
    const endpoint = queryString ? `/participants/?${queryString}` : '/participants/';
    return this.request<any>(endpoint, { method: 'GET' });
  }

  async createParticipant(participantData: any): Promise<any> {
    console.log('[API] CREATE Participant - Data sent:', participantData);
    try {
      const response = await this.request<any>('/participants/', {
        method: 'POST',
        body: JSON.stringify(participantData),
      });
      console.log('[API] CREATE Participant - SUCCESS:', response);
      return response;
    } catch (error: any) {
      console.error('[API] CREATE Participant - ERROR:', error);
      console.error('[API] Error details:', {
        status: error.status,
        message: error.message,
        data: error.data
      });
      throw error;
    }
  }

  async getParticipantDetail(id: number): Promise<any> {
    return this.request<any>(`/participants/${id}/`, { method: 'GET' });
  }

  async updateParticipant(id: number, updates: any): Promise<any> {
    return this.request<any>(`/participants/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteParticipant(id: number): Promise<any> {
    console.log(`[API] DELETE Participant ID: ${id}`);
    try {
      const response = await this.request<any>(`/participants/${id}/`, { method: 'DELETE' });
      console.log(`[API] DELETE Participant ${id} - SUCCESS`, response);
      return response;
    } catch (error: any) {
      console.error(`[API] DELETE Participant ${id} - ERROR:`, error);
      console.error(`[API] Error status:`, error.response?.status);
      console.error(`[API] Error data:`, error.response?.data);
      throw error;
    }
  }

  async getParticipantStatistics(): Promise<any> {
    return this.request<any>('/participants/statistics/', { method: 'GET' });
  }

  async getParticipantsByStage(stageId: number): Promise<any> {
    return this.request<any>(`/participants/by-stage/${stageId}/`, { method: 'GET' });
  }

  async getUnassignedParticipants(): Promise<any> {
    return this.request<any>('/participants/unassigned/', { method: 'GET' });
  }

  async assignParticipant(participantId: number, assignmentData: { bungalowId: number; bed: string; stageId: number }): Promise<any> {
    console.log('[API] ASSIGN Participant:', { participantId, ...assignmentData });
    try {
      const response = await this.request<any>(`/participants/${participantId}/assign/`, {
        method: 'POST',
        body: JSON.stringify(assignmentData),
      });
      console.log('[API] ASSIGN SUCCESS:', response);
      return response;
    } catch (error: any) {
      console.error('[API] ASSIGN ERROR:', error);
      throw error;
    }
  }

  async unassignParticipant(participantId: number): Promise<any> {
    console.log('[API] UNASSIGN Participant:', participantId);
    try {
      const response = await this.request<any>(`/participants/${participantId}/unassign/`, {
        method: 'POST',
      });
      console.log('[API] UNASSIGN SUCCESS:', response);
      return response;
    } catch (error: any) {
      console.error('[API] UNASSIGN ERROR:', error);
      throw error;
    }
  }

  // ==================== VILLAGES API ====================

  async getVillages(): Promise<any> {
    return this.request<any>('/villages/');
  }

  async getVillageDetail(id: number): Promise<any> {
    return this.request<any>(`/villages/${id}/`);
  }

  async getVillageStatistics(): Promise<any> {
    return this.request<any>('/villages/statistics/');
  }

  async getBungalowsByVillage(villageName: string): Promise<any> {
    return this.request<any>(`/villages/${villageName}/bungalows/`);
  }

  // ==================== BUNGALOWS API ====================

  async getBungalows(params?: { village?: string; available?: boolean }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.village) queryParams.append('village', params.village);
    if (params?.available !== undefined) queryParams.append('available', params.available.toString());
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/bungalows/?${queryString}` : '/bungalows/';
    
    return this.request<any>(endpoint);
  }

  async getBungalowDetail(id: number): Promise<any> {
    return this.request<any>(`/bungalows/${id}/`);
  }

  async getBungalowDetailsWithParticipants(id: number): Promise<any> {
    return this.request<any>(`/bungalows/${id}/details/`);
  }

  async getAvailableBungalows(): Promise<any> {
    return this.request<any>('/bungalows/available/');
  }

  // ==================== LANGUAGES API ====================

  async getLanguages(params?: { is_active?: boolean; search?: string }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/languages/?${queryString}` : '/languages/';

    return this.request<any>(endpoint);
  }

  async getLanguageDetail(id: number): Promise<any> {
    return this.request<any>(`/languages/${id}/`);
  }

  async createLanguage(languageData: any): Promise<any> {
    return this.request<any>('/languages/', {
      method: 'POST',
      body: JSON.stringify(languageData),
    });
  }

  async updateLanguage(id: number, updates: any): Promise<any> {
    return this.request<any>(`/languages/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteLanguage(id: number): Promise<any> {
    return this.request<any>(`/languages/${id}/`, {
      method: 'DELETE',
    });
  }

  async getLanguageStatistics(): Promise<any> {
    return this.request<any>('/languages/statistics/');
  }

  // ==================== ACTIVITY LOG ENDPOINTS ====================

  async getActivityLogs(params?: {
    user_id?: number;
    action_type?: string;
    model_name?: string;
    search?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.user_id) queryParams.append('user_id', params.user_id.toString());
      if (params.action_type) queryParams.append('action_type', params.action_type);
      if (params.model_name) queryParams.append('model_name', params.model_name);
      if (params.search) queryParams.append('search', params.search);
    }
    const queryString = queryParams.toString();
    return this.request<any>(`/activity-logs/${queryString ? '?' + queryString : ''}`);
  }

  async getActivityLogStats(): Promise<any> {
    return this.request<any>('/activity-logs/statistics/');
  }

  // ==================== PARTICIPANT STAGE METHODS (inscriptions) ====================

  async getStageParticipants(stageId: number): Promise<any> {
    return this.request<any>(`/stages/${stageId}/participants/`);
  }

  async getStageParticipantsStats(stageId: number): Promise<any> {
    return this.request<any>(`/stages/${stageId}/participants/stats/`);
  }

  async addParticipantToStage(data: any): Promise<any> {
    return this.request<any>('/participant-stages/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateParticipantStage(id: number, data: any): Promise<any> {
    return this.request<any>(`/participant-stages/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async removeParticipantFromStage(id: number): Promise<void> {
    await this.request<void>(`/participant-stages/${id}/`, {
      method: 'DELETE',
    });
  }

  // ==================== PARTICIPANT DIRECTORY METHODS ====================

  async getParticipantsDirectory(): Promise<any> {
    return this.request<any>('/participants-directory/');
  }

  async createParticipantSimple(data: any): Promise<any> {
    return this.request<any>('/participants-directory/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async searchParticipants(query: string, excludeStageId?: number): Promise<any> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (excludeStageId) {
      params.append('exclude_stage', excludeStageId.toString());
    }
    return this.request<any>(`/participants/search/?${params.toString()}`);
  }

  // ==================== REGISTRATION ASSIGNMENT METHODS (inscriptions aux bungalows) ====================

  /**
   * Récupère toutes les inscriptions non assignées à un bungalow.
   * Un participant inscrit à 2 événements retournera 2 entrées.
   */
  async getUnassignedRegistrations(params?: { startDate?: string; endDate?: string }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    const queryString = queryParams.toString();
    return this.request<any>(`/registrations/unassigned/${queryString ? '?' + queryString : ''}`);
  }

  /**
   * Assigne une inscription (ParticipantStage) à un bungalow.
   * La durée est basée sur arrival_date/departure_date de l'inscription.
   */
  async assignRegistration(registrationId: number, data: { bungalowId: number; bed: string; force_assign?: boolean }): Promise<any> {
    return this.request<any>(`/registrations/${registrationId}/assign/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Désassigne une inscription de son bungalow.
   */
  async unassignRegistration(registrationId: number): Promise<any> {
    return this.request<any>(`/registrations/${registrationId}/unassign/`, {
      method: 'POST',
    });
  }

  /**
   * Exporte les assignations.
   * @param stageId - Optionnel: filtrer par événement
   */
  async exportAssignments(stageId?: number): Promise<any> {
    const queryParams = stageId ? `?stage_id=${stageId}` : '';
    return this.request<any>(`/registrations/export/${queryParams}`);
  }

  /**
   * Assigne automatiquement tous les participants non assignés d'un événement.
   * @param stageId - ID de l'événement
   */
  async autoAssignStageParticipants(stageId: number): Promise<any> {
    return this.request<any>(`/stages/${stageId}/auto-assign/`, {
      method: 'POST',
    });
  }

  // ==================== EXCEL IMPORT METHODS ====================

  async validateExcelImport(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/import/validate/`;
    let accessToken = this.getAccessToken();

    // Si pas de token, essayer de rafraîchir
    if (!accessToken) {
      accessToken = await this.refreshAccessToken();
    }

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      },
      body: formData,
    });

    // Si erreur 401, essayer de rafraîchir le token et réessayer
    if (response.status === 401) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
          body: formData,
        });
      }
    }

    if (!response.ok) {
      // Traduire les erreurs techniques en messages compréhensibles
      if (response.status === 401) {
        throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
      }
      if (response.status === 403) {
        throw new Error('Vous n\'avez pas les droits pour effectuer cette action.');
      }
      if (response.status === 500) {
        throw new Error('Erreur serveur. Veuillez réessayer plus tard ou contacter l\'administrateur.');
      }

      let errorMessage = 'Erreur lors de la validation du fichier';
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          // Traduire les messages d'erreur Django courants
          const detail = errorData.detail;
          if (detail.includes('token') || detail.includes('jeton') || detail.includes('authentification')) {
            errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
          } else if (detail.includes('permission')) {
            errorMessage = 'Vous n\'avez pas les droits pour effectuer cette action.';
          } else {
            errorMessage = detail;
          }
        } else if (errorData.code === 'token_not_valid') {
          errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
        } else if (typeof errorData === 'object') {
          const messages = Object.entries(errorData)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          if (messages) errorMessage = messages;
        }
      } catch (e) {
        // Si le parsing JSON échoue, garder le message par défaut
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async executeExcelImport(data: { valid_imports: any[]; new_participants: any[] }): Promise<any> {
    return this.request<any>('/import/execute/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== REPORTS / BILANS METHODS ====================

  /**
   * Récupère le bilan de fréquentation pour une période donnée.
   * @param startDate - Date de début (YYYY-MM-DD)
   * @param endDate - Date de fin (YYYY-MM-DD)
   */
  async getFrequencyReport(startDate: string, endDate: string): Promise<any> {
    return this.request<any>(`/reports/frequency/?start_date=${startDate}&end_date=${endDate}`);
  }

  // ==================== DASHBOARD METHODS ====================

  /**
   * Récupère les statistiques complètes du tableau de bord.
   */
  async getDashboardStats(): Promise<any> {
    return this.request<any>('/dashboard/stats/');
  }
}

// Export une instance unique du service
const apiService = new ApiService();
export default apiService;

