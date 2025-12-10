import React, { useState, useEffect } from 'react';
import { ActivityLog, ActivityLogStats } from '../types/ActivityLog';
import dataService from '../services/dataService';
import Pagination from './Pagination';
import './History.css';

const History: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [userFilter, setUserFilter] = useState<string>('all');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [modelNameFilter, setModelNameFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Utilisateurs uniques pour le filtre
  const [uniqueUsers, setUniqueUsers] = useState<{ id: number; name: string }[]>([]);

  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // 20 activités par page

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterActivities();
    setCurrentPage(1); // Réinitialiser la page quand les filtres changent
  }, [userFilter, actionTypeFilter, modelNameFilter, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les activités et les statistiques en parallèle
      const [activitiesData, statsData] = await Promise.all([
        dataService.getActivityLogs(),
        dataService.getActivityLogStats()
      ]);

      // S'assurer que activitiesData est un tableau
      const activitiesArray = Array.isArray(activitiesData) ? activitiesData : [];

      setActivities(activitiesArray);
      setStats(statsData);

      // Extraire les utilisateurs uniques
      const users = activitiesArray.reduce((acc: { id: number; name: string }[], activity: ActivityLog) => {
        if (activity.user && !acc.find(u => u.id === activity.user)) {
          acc.push({
            id: activity.user,
            name: activity.userName
          });
        }
        return acc;
      }, []);
      setUniqueUsers(users);

    } catch (err: any) {
      console.error('Error loading activity logs:', err);
      setError(err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (userFilter !== 'all') {
        params.user_id = parseInt(userFilter);
      }
      // Ne pas envoyer action_type si c'est "assignment" (on filtrera côté client)
      if (actionTypeFilter !== 'all' && actionTypeFilter !== 'assignment') {
        params.action_type = actionTypeFilter;
      }
      if (modelNameFilter !== 'all') {
        params.model_name = modelNameFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const activitiesData = await dataService.getActivityLogs(params);
      // S'assurer que activitiesData est un tableau
      let activitiesArray = Array.isArray(activitiesData) ? activitiesData : [];

      // Filtre côté client pour "assignment" (assign + unassign)
      if (actionTypeFilter === 'assignment') {
        activitiesArray = activitiesArray.filter((activity: ActivityLog) =>
          activity.actionType === 'assign' || activity.actionType === 'unassign'
        );
      }

      setActivities(activitiesArray);
    } catch (err: any) {
      console.error('Error filtering activities:', err);
      setError(err.message || 'Erreur lors du filtrage');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'fas fa-plus-circle';
      case 'update':
        return 'fas fa-edit';
      case 'delete':
        return 'fas fa-trash-alt';
      case 'assign':
        return 'fas fa-link';
      case 'unassign':
        return 'fas fa-unlink';
      default:
        return 'fas fa-circle';
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'action-create';
      case 'update':
        return 'action-update';
      case 'delete':
        return 'action-delete';
      case 'assign':
        return 'action-assign';
      case 'unassign':
        return 'action-unassign';
      default:
        return '';
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="history-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  if (error && activities.length === 0) {
    return (
      <div className="history-container">
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={loadData} className="btn btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="header-title">
          <h1>
            <i className="fas fa-history"></i>
            Historique des Activités
          </h1>
          <p>Suivez toutes les actions effectuées par les utilisateurs</p>
        </div>
        <button onClick={loadData} className="btn btn-refresh" disabled={loading}>
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          Actualiser
        </button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-list"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.total}</h3>
              <p>Total activités</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.recent24h}</h3>
              <p>Dernières 24h</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.topUsers.length}</h3>
              <p>Utilisateurs actifs</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.byType.length}</h3>
              <p>Types d'actions</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="filters-section">
        <div className="filter-group">
          <label>
            <i className="fas fa-search"></i>
            Rechercher
          </label>
          <input
            type="text"
            placeholder="Rechercher dans les descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>
            <i className="fas fa-user"></i>
            Utilisateur
          </label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tous les utilisateurs</option>
            {uniqueUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>
            <i className="fas fa-tag"></i>
            Type d'action
          </label>
          <select
            value={actionTypeFilter}
            onChange={(e) => setActionTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tous les types</option>
            <option value="create">Création</option>
            <option value="update">Modification</option>
            <option value="delete">Suppression</option>
            <option value="assignment">Assignations</option>
          </select>
        </div>

        <div className="filter-group">
          <label>
            <i className="fas fa-database"></i>
            Modèle
          </label>
          <select
            value={modelNameFilter}
            onChange={(e) => setModelNameFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tous les modèles</option>
            <option value="Stage">Événement</option>
            <option value="Participant">Participant</option>
            <option value="Language">Langue</option>
          </select>
        </div>
      </div>

      {/* Liste des activités */}
      <div className="activities-list">
        {activities.length === 0 ? (
          <div className="no-activities">
            <i className="fas fa-inbox"></i>
            <p>Aucune activité trouvée</p>
          </div>
        ) : (() => {
          // Calculs pour la pagination
          const totalPages = Math.ceil(activities.length / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedActivities = activities.slice(startIndex, endIndex);

          return (
            <>
              {paginatedActivities.map((activity) => (
            <div key={activity.id} className={`activity-item ${getActionColor(activity.actionType)}`}>
              <div className="activity-icon">
                <i className={getActionIcon(activity.actionType)}></i>
              </div>
              <div className="activity-content">
                <div className="activity-header">
                  <span className="activity-user">
                    <i className="fas fa-user-circle"></i>
                    {activity.userName}
                  </span>
                  <span className="activity-type-badge">{activity.actionTypeDisplay}</span>
                  <span className="activity-model-badge">{activity.modelNameDisplay}</span>
                </div>
                <div className="activity-description">
                  {activity.description}
                </div>
                <div className="activity-footer">
                  <span className="activity-time">
                    <i className="fas fa-clock"></i>
                    {formatDate(activity.timestamp)}
                  </span>
                  {activity.objectRepr && (
                    <span className="activity-object">
                      <i className="fas fa-cube"></i>
                      {activity.objectRepr}
                    </span>
                  )}
                </div>
              </div>
            </div>
              ))}

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={activities.length}
              />
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default History;
