import React, { useState, useEffect, useCallback } from 'react';
import { Participant } from '../types/Participant';
import { Stage } from '../types/Stage';
import { Bungalow } from '../types/Bungalow';
import dataService from '../services/dataService';
import PageHeader from './PageHeader';
import ConfirmationModal from './ConfirmationModal';

const Participants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [bungalows, setBungalows] = useState<Bungalow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageStatusFilter, setStageStatusFilter] = useState('upcoming_active'); // Nouveau filtre pour le statut des stages
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [participantsData, stagesData, bungalowsData] = await Promise.all([
        dataService.getParticipants({
          stageIds: stageFilter === 'all' ? undefined : [parseInt(stageFilter)],
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchTerm || undefined
        }),
        dataService.getStages(),
        dataService.getBungalows()
      ]);
      setParticipants(participantsData);
      setStages(stagesData);
      setBungalows(bungalowsData);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [stageFilter, statusFilter, searchTerm, stageStatusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fonction pour déterminer le statut d'un stage
  const getStageStatus = (stage: Stage) => {
    const now = new Date();
    const startDate = new Date(stage.startDate);
    const endDate = new Date(stage.endDate);
    
    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'completed';
    return 'active';
  };

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         participant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         participant.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || participant.stageIds?.some(id => id.toString() === stageFilter);
    
    // Filtrer par statut des stages
    let matchesStageStatus = true;
    if (stageStatusFilter !== 'all') {
      matchesStageStatus = participant.stageIds?.some(stageId => {
        const stage = stages.find(s => s.id === stageId);
        if (!stage) return false;
        const status = getStageStatus(stage);
        
        switch (stageStatusFilter) {
          case 'upcoming_active':
            return status === 'upcoming' || status === 'active';
          case 'upcoming':
            return status === 'upcoming';
          case 'active':
            return status === 'active';
          case 'completed':
            return status === 'completed';
          default:
            return true;
        }
      }) || false;
    }
    
    return matchesSearch && matchesStage && matchesStageStatus;
  });

  const getStageName = (stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    return stage ? stage.name : 'Stage inconnu';
  };

  const getBungalowName = (bungalowId: number) => {
    const bungalow = bungalows.find(b => b.id === bungalowId);
    return bungalow ? bungalow.name : `B-${bungalowId}`;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'student': return 'Élève';
      case 'instructor': return 'Enseignant-e';
      case 'professional': return 'Professionnel-le';
      case 'staff': return 'Salarié-e';
      default: return 'Inconnu';
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedParticipants(filteredParticipants.map(p => p.id));
    } else {
      setSelectedParticipants([]);
    }
  };

  const handleSelectParticipant = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedParticipants([...selectedParticipants, id]);
    } else {
      setSelectedParticipants(selectedParticipants.filter(pid => pid !== id));
    }
  };

  const handleCreateParticipant = async (participantData: Omit<Participant, 'id' | 'assignedBungalowId' | 'assignedBed'>) => {
    try {
      setLoading(true);
      const newParticipant = await dataService.addParticipant(participantData);
      await loadData();
      setShowCreateModal(false);
      showAlert('success', `✅ SUCCÈS: Participant "${newParticipant.firstName} ${newParticipant.lastName}" créé avec succès !`);
    } catch (error: any) {
      console.error('Erreur création participant:', error);
      
      // Extraire un message d'erreur détaillé
      let errorMessage = 'Erreur lors de la création du participant';
      
      // Si c'est une erreur HTTP avec des détails
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        
        // Erreur avec un champ error
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        // Erreurs de validation par champ
        else if (typeof errorData === 'object') {
          const errors = [];
          for (const [field, messages] of Object.entries(errorData)) {
            // Traduction en langage simple
            let displayMessage = '';
            const msgText = Array.isArray(messages) ? messages[0] : messages;
            
            // Messages personnalisés par type d'erreur
            if (field === 'email') {
              displayMessage = `📧 EMAIL: ${msgText}`;
            } else if (field === 'age') {
              displayMessage = `👤 ÂGE: ${msgText}`;
            } else if (field === 'stageIds') {
              // Si c'est une erreur de stage inexistant
              if (msgText.includes('n\'existe pas') || msgText.includes('non valide')) {
                displayMessage = `🎓 STAGE: Le stage sélectionné n'existe plus. Veuillez rafraîchir la page et sélectionner un stage valide dans la liste.`;
              } else {
                displayMessage = `🎓 STAGE: ${msgText}`;
              }
            } else if (field === 'firstName') {
              displayMessage = `✏️ PRÉNOM: ${msgText}`;
            } else if (field === 'lastName') {
              displayMessage = `✏️ NOM: ${msgText}`;
            } else {
              displayMessage = `${field}: ${msgText}`;
            }
            
            errors.push(displayMessage);
          }
          errorMessage = errors.join('\n\n');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAlert('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditParticipant = async (id: number, updates: Partial<Participant>) => {
    try {
      setLoading(true);
      const updatedParticipant = await dataService.updateParticipant(id, updates);
      await loadData();
      setEditingParticipant(null);
      showAlert('success', `✅ SUCCÈS: Participant "${updatedParticipant.firstName} ${updatedParticipant.lastName}" modifié avec succès !`);
    } catch (error: any) {
      console.error('Erreur modification participant:', error);
      
      let errorMessage = 'Erreur lors de la modification du participant';
      
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'object') {
          const errors = [];
          for (const [field, messages] of Object.entries(errorData)) {
            const msgText = Array.isArray(messages) ? messages[0] : messages;
            
            // Messages en langage clair
            if (field === 'email') {
              errorMessage = `📧 ${msgText}`;
            } else if (field === 'age') {
              errorMessage = `👤 ${msgText}`;
            } else if (field === 'stageIds') {
              errorMessage = `🎓 ${msgText}`;
            } else {
              errorMessage = msgText;
            }
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAlert('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParticipant = async (participant: Participant) => {
    try {
      setLoading(true);
      await dataService.deleteParticipant(participant.id);
      await loadData();
      setDeletingParticipant(null);
      showAlert('success', `✅ SUCCÈS: Participant "${participant.firstName} ${participant.lastName}" (ID: ${participant.id}) supprimé définitivement.`);
    } catch (error: any) {
      console.error('Erreur suppression participant:', error);
      
      let errorMessage = `Impossible de supprimer ${participant.firstName} ${participant.lastName}`;
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 403) {
          errorMessage = `🔒 PERMISSION REFUSÉE: Vous n'avez pas les droits pour supprimer ce participant. Seul un administrateur peut effectuer cette action. Contactez votre administrateur système.`;
        } else if (status === 404) {
          errorMessage = `❓ INTROUVABLE: Ce participant n'existe plus dans le système (peut-être déjà supprimé par quelqu'un d'autre). Rafraîchissez la page pour voir la liste à jour.`;
        } else if (errorData && errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData && errorData.detail) {
          errorMessage = errorData.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAlert('error', errorMessage);
    } finally {
      setLoading(false);
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

      <PageHeader title="Participants">
        <div className="header-actions">
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Rechercher un participant..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fas fa-search"></i>
          </div>
          <div className="filter-controls">
            <select 
              className="filter-select" 
              value={stageStatusFilter}
              onChange={(e) => setStageStatusFilter(e.target.value)}
            >
              <option value="upcoming_active">Stages à venir & En cours</option>
              <option value="upcoming">Stages à venir uniquement</option>
              <option value="active">Stages en cours uniquement</option>
              <option value="completed">Stages terminés</option>
              <option value="all">Tous les stages</option>
            </select>
            <select 
              className="filter-select" 
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="all">Tous les stages</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id.toString()}>
                  {stage.name}
                </option>
              ))}
            </select>
            <select 
              className="filter-select" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="student">Élèves</option>
              <option value="instructor">Enseignant-es</option>
              <option value="professional">Professionnel-les</option>
              <option value="staff">Salarié-es</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <i className="fas fa-plus"></i>
            Ajouter Participant
          </button>
        </div>
      </PageHeader>
      
      <div className="participants-content">
        <div className="table-container">
          <table className="participants-table">
            <thead>
              <tr>
                <th>
                  <input 
                    type="checkbox" 
                    checked={selectedParticipants.length === filteredParticipants.length && filteredParticipants.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Nom</th>
                <th>Statut</th>
                <th>Stage</th>
                <th>Âge</th>
                <th>Langue</th>
                <th>Bungalow</th>
                <th>Assignation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map((participant) => {
                return (
                  <tr key={participant.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        className="participant-checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={(e) => handleSelectParticipant(participant.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <div className="participant-info">
                        <div className="participant-avatar">
                          <i className="fas fa-user"></i>
                        </div>
                        <div>
                          <div className="participant-name">
                            {participant.firstName} {participant.lastName}
                          </div>
                          <div className="participant-email">{participant.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`type-badge ${participant.status}`}>
                        {getStatusText(participant.status)}
                      </span>
                    </td>
                    <td>{participant.stageIds?.map(id => getStageName(id)).join(', ') || 'Aucun'}</td>
                    <td>{participant.age} ans</td>
                    <td>{participant.language}</td>
                    <td>{participant.assignedBungalowId ? getBungalowName(participant.assignedBungalowId) : '-'}</td>
                    <td>
                      <span className={`status-badge ${participant.assignedBungalowId ? 'assigned' : 'pending'}`}>
                        {participant.assignedBungalowId ? 'Assigné' : 'En attente'}
                      </span>
                    </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-icon" 
                            title="Modifier"
                            onClick={() => setEditingParticipant(participant)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="btn-icon btn-danger" 
                            title="Supprimer"
                            onClick={() => setDeletingParticipant(participant)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

        {showCreateModal && (
          <CreateParticipantModal
            onClose={() => setShowCreateModal(false)}
            onSave={handleCreateParticipant}
            stages={stages}
          />
        )}

        {editingParticipant && (
          <EditParticipantModal
            participant={editingParticipant}
            onClose={() => setEditingParticipant(null)}
            onSave={(updates) => handleEditParticipant(editingParticipant.id, updates)}
            stages={stages}
          />
        )}

        {deletingParticipant && (
          <ConfirmationModal
            isOpen={!!deletingParticipant}
            onClose={() => setDeletingParticipant(null)}
            onConfirm={() => handleDeleteParticipant(deletingParticipant)}
            title="Supprimer le participant"
            message={`Êtes-vous sûr de vouloir supprimer le participant "${deletingParticipant.firstName} ${deletingParticipant.lastName}" ? Cette action est irréversible.`}
            confirmText="Supprimer"
            type="danger"
            isLoading={loading}
          />
        )}
      </>
    );
  };

// Modal de création de participant
const CreateParticipantModal: React.FC<{
  onClose: () => void;
  onSave: (participantData: Omit<Participant, 'id' | 'assignedBungalowId' | 'assignedBed'>) => void;
  stages: Stage[];
}> = ({ onClose, onSave, stages }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: 'F' as 'M' | 'F',
    age: 18,
    language: 'Français',
    status: 'student' as 'student' | 'instructor' | 'professional' | 'staff',
    stageIds: stages.length > 0 ? [stages[0].id] : []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nouveau Participant</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">Prénom</label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Nom</label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="age">Âge</label>
                <input
                  type="number"
                  id="age"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                  min="16"
                  max="80"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Sexe</label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value as 'M' | 'F'})}
                  required
                >
                  <option value="F">Femme</option>
                  <option value="M">Homme</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="language">Langue</label>
                <select
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData({...formData, language: e.target.value})}
                  required
                >
                  <option value="Français">Français</option>
                  <option value="Wolof">Wolof</option>
                  <option value="Anglais">Anglais</option>
                  <option value="Espagnol">Espagnol</option>
                  <option value="Pulaar">Pulaar</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Statut</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  required
                >
                  <option value="student">Élève</option>
                  <option value="instructor">Enseignant-e</option>
                  <option value="professional">Professionnel-le</option>
                  <option value="staff">Salarié-e</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="stageSelect">Stage</label>
              <select
                id="stageSelect"
                value={formData.stageIds[0]}
                onChange={(e) => setFormData({...formData, stageIds: [parseInt(e.target.value)]})}
                required
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Ajouter Participant
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Modal d'édition de participant
const EditParticipantModal: React.FC<{
  participant: Participant;
  onClose: () => void;
  onSave: (updates: Partial<Participant>) => void;
  stages: Stage[];
}> = ({ participant, onClose, onSave, stages }) => {
  const [formData, setFormData] = useState({
    firstName: participant.firstName,
    lastName: participant.lastName,
    email: participant.email,
    gender: participant.gender,
    age: participant.age,
    language: participant.language,
    status: participant.status,
    stageIds: participant.stageIds || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Modifier le Participant</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">Prénom</label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Nom</label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="age">Âge</label>
                <input
                  type="number"
                  id="age"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                  min="16"
                  max="80"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Sexe</label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value as 'M' | 'F'})}
                  required
                >
                  <option value="F">Femme</option>
                  <option value="M">Homme</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="language">Langue</label>
                <select
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData({...formData, language: e.target.value})}
                  required
                >
                  <option value="Français">Français</option>
                  <option value="Wolof">Wolof</option>
                  <option value="Anglais">Anglais</option>
                  <option value="Espagnol">Espagnol</option>
                  <option value="Pulaar">Pulaar</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Statut</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  required
                >
                  <option value="student">Élève</option>
                  <option value="instructor">Enseignant-e</option>
                  <option value="professional">Professionnel-le</option>
                  <option value="staff">Salarié-e</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="stageSelect">Stage</label>
              <select
                id="stageSelect"
                value={formData.stageIds[0]}
                onChange={(e) => setFormData({...formData, stageIds: [parseInt(e.target.value)]})}
                required
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Modifier Participant
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Participants;
