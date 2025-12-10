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
  ];

  // Menu items visible only for admins
  const adminMenuItems = [
    { path: '/users', label: 'Utilisateurs', icon: 'fas fa-user-cog' }
  ];

  // Combine menu items based on user role
  const allMenuItems = currentUser?.role === 'admin'
    ? [...menuItems, ...adminMenuItems]
    : menuItems;

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
          {allMenuItems.map((item) => (
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

        {/* User Actions */}
        <div className="sidebar-footer" style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '1rem',
          marginTop: 'auto'
        }}>
          <button
            className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
            style={{
              width: '100%',
              textAlign: 'left',
              background: isActive('/profile')
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.25) 100%)'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.15) 100%)',
              border: isActive('/profile')
                ? '2px solid rgba(59, 130, 246, 0.5)'
                : '2px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              padding: '0.875rem 1rem',
              color: isActive('/profile') ? '#DBEAFE' : '#93C5FD',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              marginBottom: '0.5rem',
              boxShadow: isActive('/profile')
                ? '0 4px 12px rgba(59, 130, 246, 0.25), 0 0 20px rgba(59, 130, 246, 0.15)'
                : '0 2px 8px rgba(59, 130, 246, 0.15)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={() => navigate('/profile')}
            title="Mon Profil"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(99, 102, 241, 0.3) 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.35), 0 0 30px rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
              e.currentTarget.style.color = '#DBEAFE';
            }}
            onMouseLeave={(e) => {
              if (!isActive('/profile')) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.15) 100%)';
                e.currentTarget.style.color = '#93C5FD';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
              } else {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.25) 100%)';
                e.currentTarget.style.color = '#DBEAFE';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25), 0 0 20px rgba(59, 130, 246, 0.15)';
              }
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(59, 130, 246, 0.4)',
              flexShrink: 0
            }}>
              <i className="fas fa-user-circle" style={{
                fontSize: '1.25rem',
                color: '#FFFFFF'
              }}></i>
            </div>
            <span style={{
              letterSpacing: '0.3px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}>Mon Profil</span>
          </button>
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Se déconnecter"
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '0.875rem 1rem',
              color: '#FCA5A5',
              transition: 'all 0.2s',
              fontSize: '0.95rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.color = '#FEE2E2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#FCA5A5';
            }}
          >
            <i className="fas fa-sign-out-alt" style={{ fontSize: '1.1rem' }}></i>
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
