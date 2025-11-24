import React from 'react';
import { User } from '../types/User';

interface UserProfileProps {
  user: User;
  variant?: 'header' | 'sidebar';
  showRole?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, variant = 'header', showRole = true }) => {
  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'manager': return 'Gestionnaire';
      case 'user': return 'Utilisateur';
      default: return 'Utilisateur';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'role-admin';
      case 'manager': return 'role-manager';
      case 'user': return 'role-user';
      default: return 'role-user';
    }
  };

  const containerClass = variant === 'sidebar' ? 'sidebar-user-profile' : 'user-profile';
  const avatarClass = variant === 'sidebar' ? 'sidebar-user-avatar' : 'user-avatar';
  const infoClass = variant === 'sidebar' ? 'sidebar-user-info' : 'user-info';
  const nameClass = variant === 'sidebar' ? 'sidebar-user-name' : 'user-name';
  const roleClass = variant === 'sidebar' ? 'sidebar-user-role' : 'user-role';

  return (
    <div className={containerClass}>
      <div className={avatarClass}>
        <i className="fas fa-user"></i>
      </div>
      <div className={infoClass}>
        <div className={nameClass}>
          {user.firstName} {user.lastName}
        </div>
        {showRole && (
          <div className={`${roleClass} ${getRoleBadgeClass(user.role)}`}>
            {getRoleText(user.role)}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;




