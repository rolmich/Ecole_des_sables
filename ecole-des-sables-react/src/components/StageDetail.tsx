import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stage } from '../types/Stage';
import { ParticipantStage, ParticipantStageCreate, StageParticipantsStats } from '../types/ParticipantStage';
import { Participant } from '../types/Participant';
import dataService from '../services/dataService';
import PageHeader from './PageHeader';
import ConfirmationModal from './ConfirmationModal';

const StageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stageId = parseInt(id || '0');

  const [stage, setStage] = useState<Stage | null>(null);
  const [participants, setParticipants] = useState<ParticipantStage[]>([]);
  const [stats, setStats] = useState<StageParticipantsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<ParticipantStage | null>(null);
  const [removingParticipant, setRemovingParticipant] = useState<ParticipantStage | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadData = useCallback(async () => {
    if (!stageId) return;

    try {
      setLoading(true);
      const [stageData, participantsData, statsData] = await Promise.all([
        dataService.getStageById(stageId),
        dataService.getStageParticipants(stageId),
        dataService.getStageParticipantsStats(stageId)
      ]);
      setStage(stageData);
      setParticipants(participantsData);
      setStats(statsData);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search participants
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const results = await dataService.searchParticipants(query, stageId);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add participant to stage
  const handleAddParticipant = async (participantId: number, formData: Partial<ParticipantStageCreate>) => {
    try {
      await dataService.addParticipantToStage({
        participantId,
        stageId,
        ...formData
      });
      showAlert('success', 'Participant ajouté avec succès');
      setShowAddModal(false);
      setSearchQuery('');
      setSearchResults([]);
      loadData();
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de l\'ajout');
    }
  };

  // Update participant registration
  const handleUpdateParticipant = async (id: number, data: any) => {
    try {
      await dataService.updateParticipantStage(id, data);
      showAlert('success', 'Participant mis à jour');
      setEditingParticipant(null);
      loadData();
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de la mise à jour');
    }
  };

  // Remove participant from stage
  const handleRemoveParticipant = async (participant: ParticipantStage) => {
    try {
      await dataService.removeParticipantFromStage(participant.id);
      showAlert('success', `${participant.participantName} a été retiré de l'événement`);
      setRemovingParticipant(null);
      loadData();
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de la suppression');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'musician': return '#9333ea';
      case 'instructor': return '#0891b2';
      case 'staff': return '#059669';
      default: return '#3b82f6';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="error-container">
        <p>Événement non trouvé</p>
        <button onClick={() => navigate('/stages')} className="btn btn-primary">
          Retour aux événements
        </button>
      </div>
    );
  }

  return (
    <>
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          <div className="alert-content">
            <i className={`fas ${alert.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            <span>{alert.message}</span>
          </div>
          <button className="alert-close" onClick={() => setAlert(null)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      <PageHeader title={stage.name}>
        <button onClick={() => navigate('/stages')} className="btn btn-secondary">
          <i className="fas fa-arrow-left"></i> Retour
        </button>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <i className="fas fa-user-plus"></i> Ajouter un participant
        </button>
      </PageHeader>

      {/* Stage Info Card */}
      <div className="stage-detail-info">
        <div className="info-grid">
          <div className="info-item">
            <i className="fas fa-calendar"></i>
            <span>
              {new Date(stage.startDate).toLocaleDateString('fr-FR')} - {new Date(stage.endDate).toLocaleDateString('fr-FR')}
            </span>
          </div>
          <div className="info-item">
            <i className="fas fa-user-tie"></i>
            <span>{stage.instructor || 'Non défini'}</span>
          </div>
          <div className="info-item">
            <i className="fas fa-tag"></i>
            <span>{stage.eventType === 'stage' ? 'Stage' : stage.eventType === 'resident' ? 'Résident' : 'Autres'}</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid stage-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalParticipants}/{stats.capacity}</h3>
              <p>Participants inscrits</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon available">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.availableSpots}</h3>
              <p>Places disponibles</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon assigned">
              <i className="fas fa-bed"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.assignedToBungalow}</h3>
              <p>Assignés à un bungalow</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.notAssigned}</h3>
              <p>Non assignés</p>
            </div>
          </div>
        </div>
      )}

      {/* Role breakdown */}
      {stats && (
        <div className="role-breakdown">
          <h3>Par rôle</h3>
          <div className="role-chips">
            <span className="role-chip participant">
              <i className="fas fa-user"></i> {stats.byRole.participant} Participants
            </span>
            <span className="role-chip musician">
              <i className="fas fa-music"></i> {stats.byRole.musician} Musiciens
            </span>
            <span className="role-chip instructor">
              <i className="fas fa-chalkboard-teacher"></i> {stats.byRole.instructor} Encadrants
            </span>
            <span className="role-chip staff">
              <i className="fas fa-user-cog"></i> {stats.byRole.staff} Staff
            </span>
          </div>
        </div>
      )}

      {/* Participants Table */}
      <div className="participants-section">
        <h2>Liste des participants ({participants.length})</h2>

        {participants.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-users"></i>
            <p>Aucun participant inscrit à cet événement</p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              Ajouter un participant
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="participants-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Email</th>
                  <th>Nationalité</th>
                  <th>Rôle</th>
                  <th>Arrivée</th>
                  <th>Départ</th>
                  <th>Bungalow</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="participant-info">
                        <strong>{p.participantName}</strong>
                        <small>{p.participantStatus}</small>
                      </div>
                    </td>
                    <td>{p.participantEmail}</td>
                    <td>{p.participantNationality || '-'}</td>
                    <td>
                      <span
                        className="role-badge"
                        style={{ backgroundColor: getRoleColor(p.role) }}
                      >
                        {p.roleDisplay}
                      </span>
                    </td>
                    <td>
                      {p.arrivalDate ? (
                        <>
                          {new Date(p.arrivalDate).toLocaleDateString('fr-FR')}
                          {p.arrivalTime && <small> {p.arrivalTime}</small>}
                        </>
                      ) : '-'}
                    </td>
                    <td>
                      {p.departureDate ? (
                        <>
                          {new Date(p.departureDate).toLocaleDateString('fr-FR')}
                          {p.departureTime && <small> {p.departureTime}</small>}
                        </>
                      ) : '-'}
                    </td>
                    <td>
                      {p.isAssigned ? (
                        <span className="bungalow-badge">
                          {p.assignedBungalowName} - Lit {p.assignedBed}
                        </span>
                      ) : (
                        <span className="not-assigned">Non assigné</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setEditingParticipant(p)}
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setRemovingParticipant(p)}
                          title="Retirer"
                        >
                          <i className="fas fa-user-minus"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Participant Modal */}
      {showAddModal && (
        <AddParticipantModal
          searchQuery={searchQuery}
          searchResults={searchResults}
          searchLoading={searchLoading}
          onSearch={handleSearch}
          onAdd={handleAddParticipant}
          onClose={() => {
            setShowAddModal(false);
            setSearchQuery('');
            setSearchResults([]);
          }}
          stageStartDate={stage.startDate}
          stageEndDate={stage.endDate}
        />
      )}

      {/* Edit Participant Modal */}
      {editingParticipant && (
        <EditParticipantStageModal
          participant={editingParticipant}
          onSave={(data) => handleUpdateParticipant(editingParticipant.id, data)}
          onClose={() => setEditingParticipant(null)}
        />
      )}

      {/* Remove Confirmation Modal */}
      {removingParticipant && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setRemovingParticipant(null)}
          onConfirm={() => handleRemoveParticipant(removingParticipant)}
          title="Retirer le participant"
          message={`Êtes-vous sûr de vouloir retirer "${removingParticipant.participantName}" de cet événement ?`}
          confirmText="Retirer"
          type="danger"
        />
      )}
    </>
  );
};

// Modal pour ajouter un participant
interface AddParticipantModalProps {
  searchQuery: string;
  searchResults: Participant[];
  searchLoading: boolean;
  onSearch: (query: string) => void;
  onAdd: (participantId: number, formData: Partial<ParticipantStageCreate>) => void;
  onClose: () => void;
  stageStartDate: string;
  stageEndDate: string;
}

const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  searchQuery,
  searchResults,
  searchLoading,
  onSearch,
  onAdd,
  onClose,
  stageStartDate,
  stageEndDate
}) => {
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [formData, setFormData] = useState({
    arrivalDate: stageStartDate,
    arrivalTime: '',
    departureDate: stageEndDate,
    departureTime: '',
    role: 'participant' as const,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParticipant) {
      onAdd(selectedParticipant.id, formData);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ajouter un participant</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body">
          {!selectedParticipant ? (
            <>
              <div className="search-section">
                <label>Rechercher un participant existant</label>
                <div className="search-input-container">
                  <input
                    type="text"
                    placeholder="Nom, prénom ou email..."
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                    autoFocus
                  />
                  {searchLoading && <span className="search-spinner"></span>}
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      className="search-result-item"
                      onClick={() => setSelectedParticipant(p)}
                    >
                      <div className="result-info">
                        <strong>{p.firstName} {p.lastName}</strong>
                        <small>{p.email}</small>
                      </div>
                      <div className="result-meta">
                        <span>{p.nationality || 'N/A'}</span>
                        <span>{p.stageCount || 0} événement(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
                <div className="no-results">
                  <p>Aucun participant trouvé</p>
                  <small>Créez d'abord le participant dans la section "Participants"</small>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="selected-participant">
                <span>Participant sélectionné:</span>
                <strong>{selectedParticipant.firstName} {selectedParticipant.lastName}</strong>
                <button type="button" onClick={() => setSelectedParticipant(null)}>
                  Changer
                </button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date d'arrivée</label>
                  <input
                    type="date"
                    value={formData.arrivalDate}
                    onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Heure d'arrivée</label>
                  <input
                    type="time"
                    value={formData.arrivalTime}
                    onChange={(e) => setFormData({...formData, arrivalTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date de départ</label>
                  <input
                    type="date"
                    value={formData.departureDate}
                    onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Heure de départ</label>
                  <input
                    type="time"
                    value={formData.departureTime}
                    onChange={(e) => setFormData({...formData, departureTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                >
                  <option value="participant">Participant</option>
                  <option value="musician">Musicien</option>
                  <option value="instructor">Encadrant</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notes spécifiques à cette participation..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Ajouter
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal pour modifier une inscription
interface EditParticipantStageModalProps {
  participant: ParticipantStage;
  onSave: (data: any) => void;
  onClose: () => void;
}

const EditParticipantStageModal: React.FC<EditParticipantStageModalProps> = ({
  participant,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState({
    arrivalDate: participant.arrivalDate || '',
    arrivalTime: participant.arrivalTime || '',
    departureDate: participant.departureDate || '',
    departureTime: participant.departureTime || '',
    role: participant.role,
    notes: participant.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Modifier l'inscription</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="participant-header">
              <strong>{participant.participantName}</strong>
              <small>{participant.participantEmail}</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date d'arrivée</label>
                <input
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Heure d'arrivée</label>
                <input
                  type="time"
                  value={formData.arrivalTime}
                  onChange={(e) => setFormData({...formData, arrivalTime: e.target.value})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date de départ</label>
                <input
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Heure de départ</label>
                <input
                  type="time"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({...formData, departureTime: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Rôle</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as any})}
              >
                <option value="participant">Participant</option>
                <option value="musician">Musicien</option>
                <option value="instructor">Encadrant</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notes spécifiques..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StageDetail;
