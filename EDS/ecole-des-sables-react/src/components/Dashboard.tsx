import React from 'react';
import PageHeader from './PageHeader';

const Dashboard: React.FC = () => {
  return (
    <>
      <PageHeader title="Tableau de Bord" />
      
      <div className="dashboard-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-calendar-check"></i>
            </div>
            <div className="stat-content">
              <h3>3</h3>
              <p>Stages Actifs</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>45</h3>
              <p>Participants</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-home"></i>
            </div>
            <div className="stat-content">
              <h3>18/24</h3>
              <p>Bungalows Occupés</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="stat-content">
              <h3>2</h3>
              <p>Conflits</p>
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Actions Rapides</h2>
          <div className="actions-grid">
            <button className="action-card">
              <i className="fas fa-calendar-plus"></i>
              <span>Créer un Stage</span>
            </button>
            <button className="action-card">
              <i className="fas fa-user-plus"></i>
              <span>Ajouter Participants</span>
            </button>
            <button className="action-card">
              <i className="fas fa-bed"></i>
              <span>Assigner Logements</span>
            </button>
            <button className="action-card">
              <i className="fas fa-chart-bar"></i>
              <span>Générer Rapport</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
