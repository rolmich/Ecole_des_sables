import React, { useState, useEffect } from 'react';
import { Participant } from '../types/Participant';
import { Bungalow } from '../types/Bungalow';
import { Stage } from '../types/Stage';
import dataService from '../services/dataService';

const Assignments: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bungalows, setBungalows] = useState<Bungalow[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Participant[]>([]);
  const [showManualAssignModal, setShowManualAssignModal] = useState(false);
  const [draggedParticipant, setDraggedParticipant] = useState<Participant | null>(null);
  const [dragOverBungalow, setDragOverBungalow] = useState<number | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<number | null>(null);
  const [selectedBungalow, setSelectedBungalow] = useState<number | null>(null);
  const [selectedBed, setSelectedBed] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [participantsData, stagesData, bungalowsData] = await Promise.all([
          dataService.getParticipants(),
          dataService.getStages(),
          dataService.getBungalows()
        ]);
        setParticipants(participantsData);
        setBungalows(bungalowsData);
        setStages(stagesData);
        
        // Initialiser avec la date du premier stage si disponible
        if (stagesData.length > 0) {
          const firstStage = stagesData.find(s => s.startDate && s.endDate);
          if (firstStage) {
            setStartDate(firstStage.startDate);
            setEndDate(firstStage.endDate);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    };
    loadData();
  }, []);

  // Filtrer les participants et assignations selon les dates
  useEffect(() => {
    if (!startDate || !endDate) {
      setFilteredParticipants(participants);
      setFilteredAssignments(participants.filter(p => p.assignedBungalowId));
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Filtrer les participants qui ont des stages dans cette période
    const participantsInPeriod = participants.filter(p => {
      return p.stageIds?.some(stageId => {
        const stage = stages.find(s => s.id === stageId);
        if (!stage || !stage.startDate || !stage.endDate) return false;
        
        const stageStart = new Date(stage.startDate);
        const stageEnd = new Date(stage.endDate);
        
        // Vérifier si les périodes se chevauchent
        return stageStart <= end && stageEnd >= start;
      });
    });

    setFilteredParticipants(participantsInPeriod);

    // Filtrer les assignations dans cette période
    const assignmentsInPeriod = participantsInPeriod.filter(p => p.assignedBungalowId);
    setFilteredAssignments(assignmentsInPeriod);

  }, [startDate, endDate, participants, stages]);

  const getBungalowParticipants = (bungalowId: number) => {
    // Utiliser les assignations filtrées par période
    return filteredAssignments.filter(p => p.assignedBungalowId === bungalowId);
  };
  
  const getUnassignedParticipants = () => {
    // Utiliser les participants filtrés par période
    return filteredParticipants.filter(p => !p.assignedBungalowId);
  };

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedParticipant || !selectedBungalow || !selectedBed) {
      showAlert('error', 'Veuillez remplir tous les champs');
      return;
    }

    // Récupérer le premier stage du participant sélectionné
    const participant = participants.find(p => p.id === selectedParticipant);
    if (!participant || !participant.stageIds || participant.stageIds.length === 0) {
      showAlert('error', 'Ce participant n\'est inscrit à aucun stage');
      return;
    }

    // Utiliser le premier stage du participant
    const participantStage = participant.stageIds[0];

    try {
      await dataService.assignParticipant(selectedParticipant, selectedBungalow, selectedBed, participantStage);
      
      // Recharger les données
      const [participantsData, bungalowsData] = await Promise.all([
        dataService.getParticipants(),
        dataService.getBungalows()
      ]);
      setParticipants(participantsData);
      setBungalows(bungalowsData);
      
      // Fermer le modal et réinitialiser
      setShowManualAssignModal(false);
      setSelectedParticipant(null);
      setSelectedBungalow(null);
      setSelectedBed('');
      
      showAlert('success', 'Participant assigné avec succès !');
    } catch (error: any) {
      showAlert('error', 'Erreur lors de l\'assignation: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const unassignedParticipants = getUnassignedParticipants();
  const assignedParticipants = filteredAssignments;
  const occupiedBungalows = bungalows.filter(b => getBungalowParticipants(b.id).length > 0);
  const availableBungalows = bungalows.filter(b => getBungalowParticipants(b.id).length === 0);

  const getStageName = (stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    return stage ? stage.name : 'Stage inconnu';
  };

  const getParticipantType = (participant: Participant) => {
    if (participant.age < 25) return 'student';
    if (participant.age > 40) return 'instructor';
    return 'professional';
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'student': return 'Élève';
      case 'instructor': return 'Enseignant-e';
      case 'professional': return 'Professionnel-le';
      default: return 'Inconnu';
    }
  };

  const getBungalowOccupancy = (bungalow: Bungalow) => {
    const bungalowParticipants = getBungalowParticipants(bungalow.id);
    const occupiedBeds = bungalowParticipants.length;
    return `${occupiedBeds}/${bungalow.capacity}`;
  };

  const getBungalowStatus = (bungalow: Bungalow) => {
    const bungalowParticipants = getBungalowParticipants(bungalow.id);
    const occupiedBeds = bungalowParticipants.length;
    if (occupiedBeds === 0) return 'empty';
    if (occupiedBeds === bungalow.capacity) return 'full';
    return 'partial';
  };

  const handleDragStart = (participant: Participant) => {
    setDraggedParticipant(participant);
  };

  const handleDragEnd = () => {
    setDraggedParticipant(null);
    setDragOverBungalow(null);
  };

  const handleDragOver = (e: React.DragEvent, bungalowId: number) => {
    e.preventDefault();
    const bungalow = bungalows.find(b => b.id === bungalowId);
    const currentOccupancy = getBungalowParticipants(bungalowId).length;
    
    // Ne pas permettre le drop si le bungalow est complet
    if (bungalow && currentOccupancy >= bungalow.capacity) {
      return;
    }
    
    setDragOverBungalow(bungalowId);
  };

  const handleDragLeave = () => {
    setDragOverBungalow(null);
  };

  const handleDrop = async (e: React.DragEvent, bungalowId: number) => {
    e.preventDefault();
    if (!draggedParticipant) {
      setDragOverBungalow(null);
      return;
    }

    const bungalow = bungalows.find(b => b.id === bungalowId);
    const currentOccupancy = getBungalowParticipants(bungalowId).length;
    
    if (bungalow && currentOccupancy >= bungalow.capacity) {
      showAlert('error', `Le bungalow ${bungalow.name} est complet (${bungalow.capacity}/${bungalow.capacity})`);
      setDragOverBungalow(null);
      return;
    }

    // Déterminer le stage pour l'assignation
    const participantStages = draggedParticipant.stageIds || [];
    if (participantStages.length === 0) {
      showAlert('error', `${draggedParticipant.firstName} n'est inscrit à aucun stage. Inscrivez-le d'abord à un stage.`);
      setDragOverBungalow(null);
      return;
    }

    const stageId = participantStages[0]; // Prendre le premier stage
    const bedId = `bed${currentOccupancy + 1}`; // Prochain lit disponible

    try {
      console.log('[ASSIGNMENT] Assigning participant:', {
        participantId: draggedParticipant.id,
        bungalowId,
        bedId,
        stageId
      });

      // SAUVEGARDER EN BASE DE DONNÉES via l'API
      await dataService.assignParticipant(draggedParticipant.id, bungalowId, bedId, stageId);
      
      // Recharger les données pour avoir l'état à jour
      const [participantsData, bungalowsData] = await Promise.all([
        dataService.getParticipants(),
        dataService.getBungalows()
      ]);
      setParticipants(participantsData);
      setBungalows(bungalowsData);
      
      showAlert('success', `✅ ${draggedParticipant.firstName} ${draggedParticipant.lastName} assigné au bungalow ${bungalow?.name} (lit: ${bedId})`);
    } catch (error: any) {
      console.error('[ASSIGNMENT] Error:', error);
      const errorMsg = error.message || error.data?.error || 'Erreur lors de l\'assignation';
      showAlert('error', `❌ ${errorMsg}`);
    }

    setDragOverBungalow(null);
  };

  const handleRemoveParticipant = async (participantId: number) => {
    const participant = participants.find(p => p.id === participantId);
    
    if (!participant) {
      showAlert('error', 'Participant non trouvé');
      return;
    }

    try {
      console.log('[ASSIGNMENT] Unassigning participant:', participantId);

      // SUPPRIMER L'ASSIGNATION EN BASE DE DONNÉES via l'API
      await dataService.unassignParticipant(participantId);
      
      // Recharger les données
      const [participantsData, bungalowsData] = await Promise.all([
        dataService.getParticipants(),
        dataService.getBungalows()
      ]);
      setParticipants(participantsData);
      setBungalows(bungalowsData);
      
      showAlert('warning', `✅ ${participant.firstName} ${participant.lastName} retiré de sa chambre`);
    } catch (error: any) {
      console.error('[ASSIGNMENT] Error:', error);
      const errorMsg = error.message || error.data?.error || 'Erreur lors de la désassignation';
      showAlert('error', `❌ ${errorMsg}`);
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

      <header className="main-header">
        <h1>Assignations des Chambres</h1>
        
        {/* Filtrage par Période */}
        <div className="period-filter" style={{marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <div className="form-group" style={{marginBottom: 0}}>
            <label htmlFor="startDate" style={{marginRight: '0.5rem'}}>Date Début:</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd'}}
            />
          </div>
          <div className="form-group" style={{marginBottom: 0}}>
            <label htmlFor="endDate" style={{marginRight: '0.5rem'}}>Date Fin:</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd'}}
            />
          </div>
        </div>
        
        <div className="header-actions">
          <div className="assignment-controls">
            <select 
              className="filter-select" 
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
            >
              <option value="all">Tous les stages</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id.toString()}>
                  {stage.name}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary">
              <i className="fas fa-magic"></i>
              Assignation Automatique
            </button>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowManualAssignModal(true)}
          >
            <i className="fas fa-user-plus"></i>
            Assignation Manuelle
          </button>
        </div>
      </header>
      
      <div className="assignments-content">
        {/* Assignment Overview */}
        <div className="assignment-overview">
          <div className="overview-cards">
            <div className="overview-card">
              <div className="card-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="card-content">
                <h3>{participants.length}</h3>
                <p>Participants Total</p>
              </div>
            </div>
              <div className="overview-card">
                <div className="card-icon">
                  <i className="fas fa-bed"></i>
                </div>
                <div className="card-content">
                  <h3>{assignedParticipants.length}</h3>
                  <p>Participants Assignés</p>
                </div>
              </div>
              <div className="overview-card">
                <div className="card-icon">
                  <i className="fas fa-home"></i>
                </div>
                <div className="card-content">
                  <h3>{availableBungalows.length}</h3>
                  <p>Chambres Disponibles</p>
                </div>
              </div>
            <div className="overview-card">
              <div className="card-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="card-content">
                <h3>0</h3>
                <p>Conflits</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Assignment Interface */}
        <div className="assignment-interface">
          <div className="participants-panel">
            <h3>Participants Non Assignés</h3>
            <div className="participants-list">
              {unassignedParticipants.map((participant) => {
                const type = getParticipantType(participant);
                return (
                  <div 
                    key={participant.id} 
                    className={`participant-card ${draggedParticipant?.id === participant.id ? 'dragging' : ''}`}
                    draggable="true"
                    onDragStart={() => handleDragStart(participant)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="participant-avatar">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="participant-details">
                      <div className="participant-name">
                        {participant.firstName} {participant.lastName}
                      </div>
                      <div className="participant-info">
                        {/* Affichage du sexe avec icône */}
                        <span className="info-item">
                          <i className={`fas ${participant.gender === 'M' ? 'fa-mars' : 'fa-venus'}`}></i>
                          {participant.gender === 'M' ? 'Homme' : 'Femme'}
                        </span>
                        •
                        {/* Affichage de l'âge */}
                        <span className="info-item">
                          {participant.age} ans
                        </span>
                        •
                        {/* Affichage du statut */}
                        <span className="info-item">
                          {getTypeText(type)}
                        </span>
                      </div>
                      {/* Affichage du stage */}
                      <div className="participant-stage">
                        <i className="fas fa-graduation-cap"></i>
                        <span>
                          {participant.stageIds && participant.stageIds.length > 0
                            ? participant.stageIds.map(id => getStageName(id)).join(', ')
                            : 'Aucun stage'}
                        </span>
                      </div>
                    </div>
                    <div className="participant-type">
                      <span className={`type-badge ${type}`}>
                        {getTypeText(type)}
                      </span>
                    </div>
                    <div className="drag-indicator">
                      <i className="fas fa-grip-vertical"></i>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bungalows-panel">
            <h3>Bungalows</h3>
            <div className="villages-container">
              {(['A', 'B', 'C'] as const).map((village) => {
                const villageBungalows = bungalows.filter(b => b.village === village);
                return (
                  <div key={village} className="village-assignment">
                    <h4>Village {village}</h4>
                    <div className="bungalows-assignment-grid">
                        {villageBungalows.map((bungalow) => {
                          const status = getBungalowStatus(bungalow);
                          const occupancy = getBungalowOccupancy(bungalow);
                          const bungalowParticipants = getBungalowParticipants(bungalow.id);
                          const isFull = bungalowParticipants.length >= bungalow.capacity;
                          
                          return (
                            <div 
                              key={bungalow.id} 
                              className={`bungalow-assignment-card ${status} ${isFull ? 'full-no-drop' : ''} ${dragOverBungalow === bungalow.id ? 'drag-over' : ''}`}
                              onDragOver={(e) => handleDragOver(e, bungalow.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, bungalow.id)}
                            >
                            <div className="bungalow-assignment-header">
                              <h5>{bungalow.name}</h5>
                              <span className={`bungalow-status ${status}`}>
                                {status === 'empty' ? 'Libre' : status === 'full' ? 'Complet' : 'Partiel'}
                              </span>
                            </div>
                            <div className="bungalow-assignment-details">
                              <div className="occupancy-info">
                                <i className="fas fa-bed"></i>
                                <span>{occupancy}</span>
                              </div>
                              <div className="assigned-participants">
                                {bungalowParticipants.map((participant) => (
                                  <div 
                                    key={participant.id} 
                                    className="assigned-participant"
                                    draggable="true"
                                    onDragStart={() => handleDragStart(participant)}
                                    onDragEnd={handleDragEnd}
                                  >
                                    <i className="fas fa-user"></i>
                                    <span>{participant.firstName} {participant.lastName}</span>
                                    <button 
                                      className="remove-participant-btn"
                                      onClick={() => handleRemoveParticipant(participant.id)}
                                      title="Retirer de la chambre"
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                  </div>
                                ))}
                                {bungalowParticipants.length === 0 && (
                                  <div className="empty-bungalow">
                                    <i className="fas fa-plus"></i>
                                    <span>Glissez un participant ici</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Assignment Modal */}
      {showManualAssignModal && (
        <div className="modal-overlay" onClick={() => setShowManualAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assignation Manuelle</h2>
              <button className="close-btn" onClick={() => setShowManualAssignModal(false)}>&times;</button>
            </div>
            <form className="modal-form" onSubmit={handleManualAssign}>
              <div className="form-group">
                <label htmlFor="participantSelect">Sélectionner Participant (non assignés uniquement)</label>
                <select 
                  id="participantSelect" 
                  name="participantSelect" 
                  required
                  value={selectedParticipant || ''}
                  onChange={(e) => setSelectedParticipant(parseInt(e.target.value))}
                >
                  <option value="">Choisir un participant...</option>
                  {unassignedParticipants.map(participant => (
                    <option key={participant.id} value={participant.id}>
                      {participant.firstName} {participant.lastName} - Stages: {participant.stageIds?.map(id => getStageName(id)).join(', ') || 'Aucun'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="stageInfo">Stage du Participant</label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  {selectedParticipant && (() => {
                    const participant = participants.find(p => p.id === selectedParticipant);
                    if (participant && participant.stageIds && participant.stageIds.length > 0) {
                      const participantStages = participant.stageIds.map(stageId => {
                        const stage = stages.find(s => s.id === stageId);
                        return stage ? stage.name : `Stage ${stageId}`;
                      });
                      return (
                        <div>
                          <i className="fas fa-graduation-cap" style={{marginRight: '0.5rem', color: '#007bff'}}></i>
                          <strong>Stages inscrits:</strong> {participantStages.join(', ')}
                        </div>
                      );
                    }
                    return (
                      <div style={{color: '#6c757d', fontStyle: 'italic'}}>
                        <i className="fas fa-info-circle" style={{marginRight: '0.5rem'}}></i>
                        Sélectionnez un participant pour voir ses stages
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="bungalowSelect">Sélectionner Bungalow</label>
                <select 
                  id="bungalowSelect" 
                  name="bungalowSelect" 
                  required
                  value={selectedBungalow || ''}
                  onChange={(e) => setSelectedBungalow(parseInt(e.target.value))}
                >
                  <option value="">Choisir un bungalow...</option>
                  {bungalows.map(bungalow => (
                    <option key={bungalow.id} value={bungalow.id}>
                      Village {bungalow.village} - {bungalow.name} ({getBungalowParticipants(bungalow.id).length}/{bungalow.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="bedSelect">Sélectionner Lit</label>
                <select 
                  id="bedSelect" 
                  name="bedSelect" 
                  required
                  value={selectedBed}
                  onChange={(e) => setSelectedBed(e.target.value)}
                >
                  <option value="">Choisir un lit...</option>
                  {selectedBungalow && (() => {
                    const bungalow = bungalows.find(b => b.id === selectedBungalow);
                    if (bungalow && bungalow.beds && Array.isArray(bungalow.beds)) {
                      return bungalow.beds.map((bed, index) => (
                        <option key={bed.id} value={bed.id} disabled={bed.occupiedBy !== null}>
                          Lit {index + 1} ({bed.type === 'double' ? 'Double' : 'Simple'}) {bed.occupiedBy !== null ? '- Occupé' : ''}
                        </option>
                      ));
                    }
                    return (
                      <>
                        <option value="bed1">Lit 1</option>
                        <option value="bed2">Lit 2</option>
                        <option value="bed3">Lit 3</option>
                      </>
                    );
                  })()}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowManualAssignModal(false);
                  setSelectedParticipant(null);
                  setSelectedBungalow(null);
                  setSelectedBed('');
                }}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Assigner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Assignments;
