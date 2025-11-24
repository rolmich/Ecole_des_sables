import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import UserProfile from './UserProfile';
import { useCurrentUser } from '../hooks/useCurrentUser';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUser();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    { path: '/dashboard', label: 'Tableau de Bord', icon: 'fas fa-tachometer-alt' },
    { path: '/stages', label: 'Événements', icon: 'fas fa-calendar-alt' },
    { path: '/participants', label: 'Participants', icon: 'fas fa-users' },
    { path: '/villages', label: 'Villages', icon: 'fas fa-home' },
    { path: '/assignments', label: 'Assignations', icon: 'fas fa-bed' },
    { path: '/reports', label: 'Rapports', icon: 'fas fa-chart-bar' },
    { path: '/languages', label: 'Langues', icon: 'fas fa-language' },
    { path: '/history', label: 'Historique', icon: 'fas fa-history' },
    { path: '/users', label: 'Utilisateurs', icon: 'fas fa-user-cog' }
  ];

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-text">
              <div className="logo-line logo-red">ECOLE</div>
              <div className="logo-line logo-maroon">DES</div>
              <div className="logo-line logo-dark">SABLES</div>
            </div>
          </div>
          
          {/* User Profile in Sidebar */}
          {currentUser && (
            <UserProfile user={currentUser} variant="sidebar" />
          )}
        </div>
        
        <ul className="nav-menu">
          {menuItems.map((item) => (
            <li key={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`}>
              <a 
                href="#" 
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
        
        {/* Logout Button */}
        <div className="sidebar-footer">
          <button 
            className="logout-btn"
            onClick={handleLogout}
            title="Se déconnecter"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Déconnexion</span>
          </button>
        </div>
      </nav>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
