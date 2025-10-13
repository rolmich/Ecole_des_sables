import { useState, useEffect } from 'react';
import { User } from '../types/User';
import authService from '../services/authService';

export const useCurrentUser = (): User | null => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        // Récupérer l'utilisateur connecté depuis le backend
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        // Fallback sur l'utilisateur stocké en local
        const storedUser = authService.getStoredUser();
        setCurrentUser(storedUser);
      }
    };

    loadCurrentUser();
  }, []);

  return currentUser;
};

