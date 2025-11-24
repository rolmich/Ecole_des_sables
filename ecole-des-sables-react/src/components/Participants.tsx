import React, { useState, useEffect, useCallback } from 'react';
import { Participant, ParticipantCreate } from '../types/Participant';
import { Language } from '../types/Language';
import dataService from '../services/dataService';
import apiService from '../services/api';
import PageHeader from './PageHeader';
import ConfirmationModal from './ConfirmationModal';
import { NATIONALITIES } from '../constants/nationalities';

const Participants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
      const [participantsData, languagesResponse] = await Promise.all([
        dataService.getParticipantsDirectory(),
        apiService.getLanguages({ is_active: true })
      ]);
      setParticipants(participantsData);
      const languagesData = Array.isArray(languagesResponse) ? languagesResponse : (languagesResponse.results || languagesResponse.languages || []);
      setLanguages(languagesData);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         participant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (participant.nationality && participant.nationality.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case 'student': return 'Élève';
      case 'instructor': return 'Enseignant-e';
      case 'professional': return 'Professionnel-le';
      case 'staff': return 'Salarié-e';
      default: return 'Inconnu';
    }
  };

  const getLanguageCodes = (participant: Participant): string[] => {
    if (participant.languageIds && participant.languageIds.length > 0) {
      return participant.languageIds
        .map(id => languages.find(l => l.id === id)?.code.toUpperCase())
        .filter((code): code is string => code !== undefined);
    }
    return [];
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

  const handleCreateParticipant = async (participantData: ParticipantCreate) => {
    try {
      setLoading(true);
      const newParticipant = await dataService.createParticipantSimple(participantData);
      await loadData();
      setShowCreateModal(false);
      showAlert('success', `Participant "${newParticipant.firstName} ${newParticipant.lastName}" créé avec succès !`);
    } catch (error: any) {
      console.error('Erreur création participant:', error);

      let errorMessage = 'Erreur lors de la création du participant';

      if (error.response && error.response.data) {
        const errorData = error.response.data;

        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'object') {
          const errors = [];
          for (const [field, messages] of Object.entries(errorData)) {
            const msgText = Array.isArray(messages) ? messages[0] : messages;

            if (field === 'email') {
              errors.push(`Email: ${msgText}`);
            } else if (field === 'age') {
              errors.push(`Âge: ${msgText}`);
            } else if (field === 'firstName') {
              errors.push(`Prénom: ${msgText}`);
            } else if (field === 'lastName') {
              errors.push(`Nom: ${msgText}`);
            } else {
              errors.push(`${field}: ${msgText}`);
            }
          }
          errorMessage = errors.join(' | ');
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
      showAlert('success', `Participant "${updatedParticipant.firstName} ${updatedParticipant.lastName}" modifié avec succès !`);
    } catch (error: any) {
      console.error('Erreur modification participant:', error);

      let errorMessage = 'Erreur lors de la modification du participant';

      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'object') {
          for (const [field, messages] of Object.entries(errorData)) {
            const msgText = Array.isArray(messages) ? messages[0] : messages;
            errorMessage = `${field}: ${msgText}`;
            break;
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
      showAlert('success', `Participant "${participant.firstName} ${participant.lastName}" supprimé.`);
    } catch (error: any) {
      console.error('Erreur suppression participant:', error);

      let errorMessage = `Impossible de supprimer ${participant.firstName} ${participant.lastName}`;

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 403) {
          errorMessage = `Permission refusée: Vous n'avez pas les droits pour supprimer ce participant.`;
        } else if (status === 404) {
          errorMessage = `Ce participant n'existe plus dans le système.`;
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

      <PageHeader title="Annuaire des Participants">
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
            Nouveau Participant
          </button>
        </div>
      </PageHeader>

      <div className="participants-content">
        {/* Info banner */}
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className="fas fa-info-circle" style={{ color: '#3B82F6' }}></i>
          <span style={{ color: '#1E40AF', fontSize: '14px' }}>
            Cet annuaire contient tous les participants. Pour ajouter un participant à un événement,
            allez dans <strong>Événements</strong> puis cliquez sur <strong>Participants</strong> sur l'événement souhaité.
          </span>
        </div>

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
                <th>Nationalité</th>
                <th>Âge</th>
                <th>Langues</th>
                <th>Événements</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && participants.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                    Chargement...
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }}></i>
                    Aucun participant trouvé
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => (
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
                    <td>{participant.nationality || '-'}</td>
                    <td>{participant.age} ans</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {getLanguageCodes(participant).length > 0 ? (
                          getLanguageCodes(participant).map((code, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                border: '1px solid #FCA5A5'
                              }}
                            >
                              {code}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '13px', fontStyle: 'italic' }}>
                            Aucune
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        backgroundColor: participant.stageCount && participant.stageCount > 0 ? '#DCFCE7' : '#F3F4F6',
                        color: participant.stageCount && participant.stageCount > 0 ? '#166534' : '#6B7280',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        <i className="fas fa-calendar-alt" style={{ fontSize: '11px' }}></i>
                        {participant.stageCount || 0}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateParticipantModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateParticipant}
          languages={languages}
        />
      )}

      {editingParticipant && (
        <EditParticipantModal
          participant={editingParticipant}
          onClose={() => setEditingParticipant(null)}
          onSave={(updates) => handleEditParticipant(editingParticipant.id, updates)}
          languages={languages}
        />
      )}

      {deletingParticipant && (
        <ConfirmationModal
          isOpen={!!deletingParticipant}
          onClose={() => setDeletingParticipant(null)}
          onConfirm={() => handleDeleteParticipant(deletingParticipant)}
          title="Supprimer le participant"
          message={`Êtes-vous sûr de vouloir supprimer "${deletingParticipant.firstName} ${deletingParticipant.lastName}" ? Cette action est irréversible et supprimera également ses inscriptions aux événements.`}
          confirmText="Supprimer"
          type="danger"
          isLoading={loading}
        />
      )}
    </>
  );
};

// Modal de création de participant (sans événement)
const CreateParticipantModal: React.FC<{
  onClose: () => void;
  onSave: (participantData: ParticipantCreate) => void;
  languages: Language[];
}> = ({ onClose, onSave, languages }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: 'F' as 'M' | 'F',
    age: 18,
    nationality: '',
    language: languages.length > 0 ? languages[0].name : 'Français',
    status: 'student' as 'student' | 'instructor' | 'professional' | 'staff'
  });
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const languageIds = selectedLanguages
      .map(langName => languages.find(l => l.name === langName)?.id)
      .filter((id): id is number => id !== undefined);

    onSave({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      gender: formData.gender,
      age: formData.age,
      nationality: formData.nationality || undefined,
      language: formData.language,
      languageIds,
      status: formData.status
    });
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
                <label htmlFor="firstName">Prénom *</label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Nom *</label>
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
              <label htmlFor="email">Email *</label>
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
                <label htmlFor="age">Âge *</label>
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
                <label htmlFor="gender">Sexe *</label>
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
                <label htmlFor="nationality">Nationalité *</label>
                <select
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                  required
                >
                  <option value="">-- Sélectionner --</option>
                  {NATIONALITIES.map((nat) => (
                    <option key={nat} value={nat}>{nat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Statut *</label>
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

            {/* Languages selection */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ marginBottom: '8px', display: 'block', fontSize: '14px', fontWeight: '600', color: '#2D3748' }}>
                <i className="fas fa-language" style={{ marginRight: '6px', color: '#DC2626' }}></i>
                Langues parlées
              </label>

              {selectedLanguages.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '12px',
                  padding: '10px',
                  backgroundColor: '#FEF2F2',
                  borderRadius: '8px',
                  border: '1px solid #FEE2E2'
                }}>
                  {selectedLanguages.map((langName) => {
                    const lang = languages.find(l => l.name === langName);
                    return (
                      <span
                        key={langName}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          backgroundColor: '#DC2626',
                          color: '#ffffff',
                          borderRadius: '16px',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                      >
                        <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.9 }}>
                          {lang?.code || ''}
                        </span>
                        {langName}
                        <button
                          type="button"
                          onClick={() => setSelectedLanguages(selectedLanguages.filter(l => l !== langName))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ffffff',
                            cursor: 'pointer',
                            padding: '0 2px',
                            marginLeft: '4px'
                          }}
                        >
                          <i className="fas fa-times" style={{ fontSize: '10px' }}></i>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div style={{
                border: '2px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px',
                backgroundColor: '#ffffff',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {languages.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {languages.map((language) => {
                      const isSelected = selectedLanguages.includes(language.name);
                      return (
                        <label
                          key={language.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#FEE2E2' : '#F8FAFC',
                            border: isSelected ? '2px solid #DC2626' : '2px solid transparent',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLanguages([...selectedLanguages, language.name]);
                              } else {
                                setSelectedLanguages(selectedLanguages.filter(l => l !== language.name));
                              }
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#DC2626' }}
                          />
                          <span style={{
                            padding: '3px 8px',
                            backgroundColor: isSelected ? '#DC2626' : '#E2E8F0',
                            color: isSelected ? '#ffffff' : '#64748B',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}>
                            {language.code}
                          </span>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: isSelected ? '600' : '500',
                            color: isSelected ? '#991B1B' : '#2D3748'
                          }}>
                            {language.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>
                    Aucune langue disponible
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Créer le Participant
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
  languages: Language[];
}> = ({ participant, onClose, onSave, languages }) => {
  const [formData, setFormData] = useState({
    firstName: participant.firstName,
    lastName: participant.lastName,
    email: participant.email,
    gender: participant.gender,
    age: participant.age,
    nationality: participant.nationality || '',
    language: participant.language,
    status: participant.status
  });

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
    if (participant.languageIds && participant.languageIds.length > 0) {
      return participant.languageIds
        .map(id => languages.find(l => l.id === id)?.name)
        .filter((name): name is string => name !== undefined);
    }
    return participant.language ? [participant.language] : [];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const languageIds = selectedLanguages
      .map(langName => languages.find(l => l.name === langName)?.id)
      .filter((id): id is number => id !== undefined);

    onSave({
      ...formData,
      nationality: formData.nationality || undefined,
      languageIds
    });
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
                <label htmlFor="firstName">Prénom *</label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Nom *</label>
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
              <label htmlFor="email">Email *</label>
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
                <label htmlFor="age">Âge *</label>
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
                <label htmlFor="gender">Sexe *</label>
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
                <label htmlFor="nationality">Nationalité *</label>
                <select
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                  required
                >
                  <option value="">-- Sélectionner --</option>
                  {NATIONALITIES.map((nat) => (
                    <option key={nat} value={nat}>{nat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Statut *</label>
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

            {/* Languages selection */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ marginBottom: '8px', display: 'block', fontSize: '14px', fontWeight: '600', color: '#2D3748' }}>
                <i className="fas fa-language" style={{ marginRight: '6px', color: '#DC2626' }}></i>
                Langues parlées
              </label>

              {selectedLanguages.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '12px',
                  padding: '10px',
                  backgroundColor: '#FEF2F2',
                  borderRadius: '8px',
                  border: '1px solid #FEE2E2'
                }}>
                  {selectedLanguages.map((langName) => {
                    const lang = languages.find(l => l.name === langName);
                    return (
                      <span
                        key={langName}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          backgroundColor: '#DC2626',
                          color: '#ffffff',
                          borderRadius: '16px',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                      >
                        <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.9 }}>
                          {lang?.code || ''}
                        </span>
                        {langName}
                        <button
                          type="button"
                          onClick={() => setSelectedLanguages(selectedLanguages.filter(l => l !== langName))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ffffff',
                            cursor: 'pointer',
                            padding: '0 2px',
                            marginLeft: '4px'
                          }}
                        >
                          <i className="fas fa-times" style={{ fontSize: '10px' }}></i>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div style={{
                border: '2px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px',
                backgroundColor: '#ffffff',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {languages.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {languages.map((language) => {
                      const isSelected = selectedLanguages.includes(language.name);
                      return (
                        <label
                          key={language.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#FEE2E2' : '#F8FAFC',
                            border: isSelected ? '2px solid #DC2626' : '2px solid transparent',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLanguages([...selectedLanguages, language.name]);
                              } else {
                                setSelectedLanguages(selectedLanguages.filter(l => l !== language.name));
                              }
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#DC2626' }}
                          />
                          <span style={{
                            padding: '3px 8px',
                            backgroundColor: isSelected ? '#DC2626' : '#E2E8F0',
                            color: isSelected ? '#ffffff' : '#64748B',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}>
                            {language.code}
                          </span>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: isSelected ? '600' : '500',
                            color: isSelected ? '#991B1B' : '#2D3748'
                          }}>
                            {language.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>
                    Aucune langue disponible
                  </div>
                )}
              </div>
            </div>

            {/* Stage count info */}
            {participant.stageCount !== undefined && participant.stageCount > 0 && (
              <div style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '8px'
              }}>
                <i className="fas fa-calendar-check" style={{ color: '#16A34A', marginRight: '8px' }}></i>
                <span style={{ color: '#166534', fontSize: '14px' }}>
                  Ce participant est inscrit à {participant.stageCount} événement{participant.stageCount > 1 ? 's' : ''}.
                </span>
              </div>
            )}

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

export default Participants;
