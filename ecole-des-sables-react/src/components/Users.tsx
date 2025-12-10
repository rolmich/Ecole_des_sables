import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types/User';
import dataService from '../services/dataService';
import PageHeader from './PageHeader';
import ConfirmModal from './ConfirmModal';
import { useCurrentUser } from '../hooks/useCurrentUser';

const Users: React.FC = () => {
  const currentUser = useCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    type?: 'warning' | 'danger' | 'info';
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  const filterUsers = useCallback(() => {
    let filtered = users.filter(user => {
      const matchesSearch = user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const usersData = await dataService.getUsers();
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les utilisateurs depuis l'API
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleCreateUser = async (userData: Omit<User, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      setLoading(true);
      const newUser = await dataService.addUser(userData);
      await loadUsers(); // Recharger la liste
      setShowCreateModal(false);
      showAlert('success', `Utilisateur ${newUser.firstName} ${newUser.lastName} créé avec succès`);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de la création de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (id: number, updates: Partial<User>) => {
    try {
      setLoading(true);
      const updatedUser = await dataService.updateUser(id, updates);
      await loadUsers(); // Recharger la liste
      setEditingUser(null);
      showAlert('success', `Utilisateur ${updatedUser.firstName} ${updatedUser.lastName} modifié avec succès`);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de la modification de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    const user = users.find(u => u.id === id);
    if (user) {
      setConfirmModal({
        isOpen: true,
        title: 'Supprimer l\'utilisateur',
        message: `Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.firstName} ${user.lastName} ?\n\nCette action est irréversible.`,
        type: 'danger',
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          try {
            setLoading(true);
            await dataService.deleteUser(id);
            await loadUsers(); // Recharger la liste
            showAlert('warning', `Utilisateur ${user.firstName} ${user.lastName} supprimé`);
          } catch (error: any) {
            showAlert('error', error.message || 'Erreur lors de la suppression de l\'utilisateur');
          } finally {
            setLoading(false);
          }
        }
      });
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'role-admin';
      case 'manager': return 'role-manager';
      case 'user': return 'role-user';
      case 'staff': return 'role-staff';
      default: return 'role-user';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'pending': return 'status-pending';
      default: return 'status-default';
    }
  };

  const handleResetPassword = async (user: User) => {
    setResetPasswordUser(user);
  };

  const executeResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) {
      showAlert('error', 'Veuillez entrer un nouveau mot de passe');
      return;
    }

    try {
      setLoading(true);
      await dataService.resetUserPassword(resetPasswordUser.id, newPassword);
      showAlert('success', `Mot de passe de ${resetPasswordUser.firstName} ${resetPasswordUser.lastName} réinitialisé avec succès`);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de la réinitialisation du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <>
      {/* Alert System */}
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          <div className="alert-content">
            <i className={`fas ${alert.type === 'success' ? 'fa-check-circle' : alert.type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}`}></i>
            <span>{alert.message}</span>
          </div>
          <button className="alert-close" onClick={() => setAlert(null)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      <PageHeader title="Gestion des Utilisateurs">
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="fas fa-user-plus"></i>
          <span>Ajouter Utilisateur</span>
        </button>
      </PageHeader>

      <div className="users-content">
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-6)',
            color: 'var(--gray-500)'
          }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
            <p style={{ marginTop: 'var(--space-3)' }}>Chargement des utilisateurs...</p>
          </div>
        )}
        
        {!loading && (
          <>
            <div className="filter-bar">
          <div className="search-input">
            <input 
              type="text" 
              placeholder="Rechercher un utilisateur..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fas fa-search"></i>
          </div>
          <div className="filter-controls">
            <select 
              className="filter-select" 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">Utilisateur</option>
            </select>
            <select 
              className="filter-select" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="pending">En attente</option>
            </select>
          </div>
        </div>
        
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Dernière Connexion</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        <i className="fas fa-user"></i>
                      </div>
                      <div>
                        <div className="user-name">{user.firstName} {user.lastName}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString('fr-FR') : 'Jamais'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title="Modifier"
                        onClick={() => setEditingUser(user)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      {isAdmin && (
                        <button
                          className="btn-icon"
                          title="Réinitialiser mot de passe"
                          onClick={() => handleResetPassword(user)}
                        >
                          <i className="fas fa-key"></i>
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        title="Supprimer"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateUser}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(updates) => handleEditUser(editingUser.id, updates)}
        />
      )}

      {resetPasswordUser && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="modal-content" style={{ padding: '0' }}>
              <div className="modal-header" style={{
                padding: '1.5rem',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F9FAFB'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#EEF2FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-key" style={{ color: '#6366F1', fontSize: '1.25rem' }}></i>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>Réinitialiser le mot de passe</h3>
                </div>
                <button
                  onClick={() => { setResetPasswordUser(null); setNewPassword(''); }}
                  className="modal-close"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: '0',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); executeResetPassword(); }} style={{ padding: '1.5rem' }}>
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '0.75rem'
                }}>
                  <i className="fas fa-info-circle" style={{ color: '#F59E0B', marginTop: '2px' }}></i>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, color: '#92400E', fontSize: '0.875rem', lineHeight: '1.5' }}>
                      Définir un nouveau mot de passe pour{' '}
                      <strong style={{ color: '#78350F' }}>
                        {resetPasswordUser.firstName} {resetPasswordUser.lastName}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Nouveau mot de passe <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    minLength={6}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      transition: 'border-color 0.2s',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                    onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  />
                  <p style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#6B7280'
                  }}>
                    <i className="fas fa-shield-alt" style={{ marginRight: '0.25rem' }}></i>
                    Le mot de passe doit contenir au moins 6 caractères
                  </p>
                </div>

                <div className="modal-actions" style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  paddingTop: '1rem',
                  borderTop: '1px solid #E5E7EB'
                }}>
                  <button
                    type="button"
                    onClick={() => { setResetPasswordUser(null); setNewPassword(''); }}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.625rem 1.25rem',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{
                      padding: '0.625rem 1.25rem',
                      backgroundColor: loading ? '#9CA3AF' : '#EF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Réinitialisation...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sync-alt"></i>
                        Réinitialiser
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmModal.type}
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </>
  );
};

// Composants modaux simplifiés
const CreateUserModal: React.FC<{
  onClose: () => void;
  onSave: (userData: Omit<User, 'id' | 'createdAt' | 'createdBy'>) => void;
}> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    role: 'staff' as 'admin' | 'manager' | 'staff',
    department: '',
    permissions: [] as string[],
    status: 'pending' as 'active' | 'inactive' | 'pending',
    password: '', // Ajout du champ password obligatoire
    lastLogin: null as string | null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Nouvel Utilisateur</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Prénom</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Nom</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Rôle</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as any})}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Minimum 8 caractères"
              required
              minLength={8}
            />
          </div>
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Créer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const EditUserModal: React.FC<{
  user: User;
  onClose: () => void;
  onSave: (updates: Partial<User>) => void;
}> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    username: user.username,
    phone: user.phone || '',
    role: user.role,
    department: user.department || '',
    status: user.status,
    lastLogin: user.lastLogin
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Modifier Utilisateur</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Prénom</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Nom</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Statut</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value as any})}
            >
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="pending">En attente</option>
            </select>
          </div>
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Users;
