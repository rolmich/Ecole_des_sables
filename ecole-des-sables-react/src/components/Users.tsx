import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types/User';
import dataService from '../services/dataService';
import PageHeader from './PageHeader';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (user && window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.firstName} ${user.lastName} ?`)) {
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
