import React, { useState, useEffect, useCallback } from 'react';
import { Stage } from '../types/Stage';
import dataService from '../services/dataService';
import PageHeader from './PageHeader';
import ConfirmationModal from './ConfirmationModal';

const Stages: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [statusFilter, setStatusFilter] = useState('upcoming_active'); // Par défaut: stages à venir et en cours
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [deletingStage, setDeletingStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  const loadStages = useCallback(async () => {
    setLoading(true);
    try {
      const stagesData = await dataService.getStages({ 
        status: statusFilter === 'all' ? undefined : statusFilter 
      });
      setStages(stagesData);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors du chargement des stages');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const getStatusClass = (stage: Stage) => {
    const now = new Date();
    const startDate = new Date(stage.startDate);
    const endDate = new Date(stage.endDate);
    
    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'completed';
    return 'active';
  };

  const getStatusText = (stage: Stage) => {
    const status = getStatusClass(stage);
    switch (status) {
      case 'upcoming': return 'À venir';
      case 'active': return 'Actif';
      case 'completed': return 'Terminé';
      default: return 'Inconnu';
    }
  };

  const getProgressPercentage = (stage: Stage) => {
    const status = getStatusClass(stage);
    if (status === 'upcoming') return 0;
    if (status === 'completed') return 100;
    return Math.round((stage.currentParticipants / stage.capacity) * 100);
  };

  const handleCreateStage = async (stageData: Omit<Stage, 'id' | 'currentParticipants'>) => {
    try {
      setLoading(true);
      const newStage = await dataService.addStage(stageData);
      await loadStages();
      setShowCreateModal(false);
      showAlert('success', `Stage "${newStage.name}" créé avec succès`);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de la création du stage');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStage = async (id: number, updates: Partial<Stage>) => {
    try {
      setLoading(true);
      const updatedStage = await dataService.updateStage(id, updates);
      await loadStages();
      setEditingStage(null);
      showAlert('success', `Stage "${updatedStage.name}" modifié avec succès`);
    } catch (error: any) {
      let errorMessage = error.message || 'Erreur lors de la modification du stage';
      
      // Extraire le message d'erreur détaillé si disponible
      if (error.response?.data) {
        const data = error.response.data;
        if (data.dates) {
          errorMessage = data.dates;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      }
      
      showAlert('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStage = async (stage: Stage) => {
    try {
      setLoading(true);
      
      // Vérifier s'il y a des participants dans ce stage
      const participants = await dataService.getParticipantsByStage(stage.id);
      if (participants.length > 0) {
        showAlert('warning', `Impossible de supprimer le stage "${stage.name}" car il contient ${participants.length} participant(s). Veuillez d'abord supprimer ou réassigner les participants.`);
        return;
      }

      await dataService.deleteStage(stage.id);
      await loadStages();
      setDeletingStage(null);
      showAlert('success', `Stage "${stage.name}" supprimé avec succès`);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de la suppression du stage');
    } finally {
      setLoading(false);
    }
  };

  const filteredStages = stages.filter(stage => {
    const status = getStatusClass(stage);
    
    switch (statusFilter) {
      case 'upcoming_active':
        return status === 'upcoming' || status === 'active';
      case 'upcoming':
        return status === 'upcoming';
      case 'active':
        return status === 'active';
      case 'completed':
        return status === 'completed';
      case 'all':
      default:
        return true;
    }
  });

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

      <PageHeader title="Stages">
        <div className="filter-controls">
          <select 
            className="filter-select" 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="upcoming_active">À venir & En cours</option>
            <option value="upcoming">À venir uniquement</option>
            <option value="active">En cours uniquement</option>
            <option value="completed">Terminés</option>
            <option value="all">Tous les stages</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <i className="fas fa-plus"></i>
          Nouveau Stage
        </button>
      </PageHeader>
      
      <div className="stages-content">
        <div className="stages-grid">
          {filteredStages.map((stage) => {
            const statusClass = getStatusClass(stage);
            const progress = getProgressPercentage(stage);
            
            return (
              <div key={stage.id} className={`stage-card ${statusClass}`}>
                <div className="stage-header">
                  <h3>{stage.name}</h3>
                  <span className={`stage-status ${statusClass}`}>
                    {getStatusText(stage)}
                  </span>
                </div>
                <div className="stage-details">
                  <div className="stage-info">
                    <div className="info-item">
                      <i className="fas fa-calendar"></i>
                      <span>{new Date(stage.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - {new Date(stage.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="info-item">
                      <i className="fas fa-user"></i>
                      <span>{stage.instructor}</span>
                    </div>
                    <div className="info-item">
                      <i className="fas fa-users"></i>
                      <span>{stage.currentParticipants} participants ({stage.assignedParticipantsCount || 0} assignés)</span>
                    </div>
                    <div className="info-item">
                      <i className="fas fa-home"></i>
                      <span>{stage.assignedBungalowsCount || 0} bungalows assignés</span>
                    </div>
                  </div>
                  <div className="stage-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="progress-text">
                      {progress === 0 ? 'Préparation' : `${progress}% complet`}
                    </span>
                  </div>
                </div>
                  <div className="stage-actions">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => setEditingStage(stage)}
                    >
                      <i className="fas fa-edit"></i>
                      Modifier
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeletingStage(stage)}
                    >
                      <i className="fas fa-trash"></i>
                      Supprimer
                    </button>
                  </div>
              </div>
            );
          })}
        </div>
      </div>

        {showCreateModal && (
          <CreateStageModal
            onClose={() => setShowCreateModal(false)}
            onSave={handleCreateStage}
          />
        )}

        {editingStage && (
          <EditStageModal
            stage={editingStage}
            onClose={() => setEditingStage(null)}
            onSave={(updates) => handleEditStage(editingStage.id, updates)}
          />
        )}

        {deletingStage && (
          <ConfirmationModal
            isOpen={!!deletingStage}
            onClose={() => setDeletingStage(null)}
            onConfirm={() => handleDeleteStage(deletingStage)}
            title="Supprimer le stage"
            message={`Êtes-vous sûr de vouloir supprimer le stage "${deletingStage.name}" ? Cette action est irréversible.`}
            confirmText="Supprimer"
            type="danger"
            isLoading={loading}
          />
        )}
      </>
    );
  };

// Modal de création de stage
const CreateStageModal: React.FC<{
  onClose: () => void;
  onSave: (stageData: Omit<Stage, 'id' | 'currentParticipants'>) => void;
}> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    instructor: '',
    capacity: 10,
    constraints: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nouveau Stage</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="stageName">Nom du Stage</label>
              <input
                type="text"
                id="stageName"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Date de Début</label>
                <input
                  type="date"
                  id="startDate"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate">Date de Fin</label>
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="instructor">Encadrant Principal</label>
              <input
                type="text"
                id="instructor"
                value={formData.instructor}
                onChange={(e) => setFormData({...formData, instructor: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="capacity">Nombre Maximum de Participants</label>
              <input
                type="number"
                id="capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="constraints">Contraintes Spéciales</label>
              <textarea
                id="constraints"
                rows={3}
                placeholder="Ex: Maximum 2 élèves par chambre, regroupement par âge..."
                onChange={(e) => setFormData({...formData, constraints: e.target.value.split(',').map(c => c.trim()).filter(c => c)})}
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Créer le Stage
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Modal d'édition de stage
const EditStageModal: React.FC<{
  stage: Stage;
  onClose: () => void;
  onSave: (updates: Partial<Stage>) => void;
}> = ({ stage, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: stage.name,
    startDate: stage.startDate,
    endDate: stage.endDate,
    instructor: stage.instructor,
    capacity: stage.capacity,
    constraints: stage.constraints
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Modifier le Stage</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="stageName">Nom du Stage</label>
              <input
                type="text"
                id="stageName"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Date de Début</label>
                <input
                  type="date"
                  id="startDate"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate">Date de Fin</label>
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="instructor">Encadrant Principal</label>
              <input
                type="text"
                id="instructor"
                value={formData.instructor}
                onChange={(e) => setFormData({...formData, instructor: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="capacity">Nombre Maximum de Participants</label>
              <input
                type="number"
                id="capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="constraints">Contraintes Spéciales</label>
              <textarea
                id="constraints"
                rows={3}
                placeholder="Ex: Maximum 2 élèves par chambre, regroupement par âge..."
                value={formData.constraints.join(', ')}
                onChange={(e) => setFormData({...formData, constraints: e.target.value.split(',').map(c => c.trim()).filter(c => c)})}
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Modifier le Stage
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Stages;
