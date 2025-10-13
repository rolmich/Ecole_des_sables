import apiService from './api';
import { User } from '../types/User';

class AuthService {
  /**
   * Login - Connexion utilisateur
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const response = await apiService.login(email, password);
      return response.user;
    } catch (error: any) {
      throw new Error(error.message || 'Échec de la connexion');
    }
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
  }): Promise<User> {
    try {
      const response = await apiService.register(userData);
      return response.user;
    } catch (error: any) {
      throw new Error(error.message || 'Échec de l\'inscription');
    }
  }

  /**
   * Logout - Déconnexion utilisateur
   */
  async logout(): Promise<void> {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }

  /**
   * Get current user - Récupérer l'utilisateur actuel
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // D'abord vérifier si on a un utilisateur en cache
      const storedUser = apiService.getStoredUser();
      
      if (!storedUser) {
        return null;
      }

      // Essayer de récupérer l'utilisateur à jour depuis le backend
      try {
        const user = await apiService.getCurrentUser();
        localStorage.setItem('current_user', JSON.stringify(user));
        return user;
      } catch (error) {
        // Si l'API échoue, retourner l'utilisateur en cache
        return storedUser;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  }

  /**
   * Get stored user - Récupérer l'utilisateur stocké en local
   */
  getStoredUser(): User | null {
    return apiService.getStoredUser();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return apiService.isAuthenticated();
  }

  /**
   * Check if user is logged in (alias for isAuthenticated)
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}

const authService = new AuthService();
export default authService;
