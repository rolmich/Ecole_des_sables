/**
 * Service API pour communiquer avec le backend Django
 */

const API_BASE_URL = 'http://localhost:8000/api';

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
}

// Export une instance unique du service
const apiService = new ApiService();
export default apiService;

