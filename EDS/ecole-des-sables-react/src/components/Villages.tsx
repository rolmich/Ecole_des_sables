import React, { useState, useEffect } from 'react';
import { Bungalow } from '../types/Bungalow';
import { Participant } from '../types/Participant';
import { Stage } from '../types/Stage';
import dataService from '../services/dataService';

const Villages: React.FC = () => {
  const [bungalows, setBungalows] = useState<Bungalow[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<number | null>(null);
  const [selectedBungalow, setSelectedBungalow] = useState<number | null>(null);
  const [selectedBed, setSelectedBed] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [participantsData, bungalowsData, stagesData] = await Promise.all([
          dataService.getParticipants(),
          dataService.getBungalows(),
          dataService.getStages()
        ]);
        setBungalows(bungalowsData);
        setParticipants(participantsData);
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

  // Filtrer les participants selon la période
  useEffect(() => {
    if (!startDate || !endDate) {
      setFilteredParticipants(participants);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Filtrer les participants assignés durant la période
    const participantsInPeriod = participants.filter(p => {
      if (!p.assignedBungalowId) return false;
      
      // Vérifier si le participant a un stage durant cette période
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
  }, [startDate, endDate, participants, stages]);

  const getBungalowsByVillage = (village: 'A' | 'B' | 'C') => {
    return bungalows.filter(b => b.village === village);
  };

  const getVillageInfo = (village: 'A' | 'B' | 'C') => {
    const villageBungalows = getBungalowsByVillage(village);
    
    // Compter les bungalows occupés durant la période
    const occupied = villageBungalows.filter(b => {
      const participantsInBungalow = filteredParticipants.filter(p => p.assignedBungalowId === b.id);
      return participantsInBungalow.length > 0;
    }).length;
    
    const total = villageBungalows.length;
    
    let type = '';
    switch (village) {
      case 'A':
      case 'B':
        type = 'Douches/Toilettes Communes';
        break;
      case 'C':
        type = 'Salle de douche + WC privés';
        break;
    }
    
    return { type, occupancy: `${occupied}/${total} bungalows occupés` };
  };

  const getBungalowOccupancy = (bungalow: Bungalow) => {
    // Compter les participants assignés à ce bungalow durant la période filtrée
    const participantsInBungalow = filteredParticipants.filter(p => p.assignedBungalowId === bungalow.id);
    return `${participantsInBungalow.length}/${bungalow.capacity}`;
  };

  const getBungalowStatus = (bungalow: Bungalow) => {
    // Déterminer le statut basé sur les participants durant la période filtrée
    const participantsInBungalow = filteredParticipants.filter(p => p.assignedBungalowId === bungalow.id);
    const occupiedBeds = participantsInBungalow.length;
    
    if (occupiedBeds === 0) return 'empty';
    if (occupiedBeds === bungalow.capacity) return 'full';
    return 'partial';
  };

  const getParticipantName = (participantId: number) => {
    const participant = participants.find(p => p.id === participantId);
    return participant ? `${participant.firstName} ${participant.lastName}` : `Participant ${participantId}`;
  };

  // Récupérer les participants non assignés
  const getUnassignedParticipants = () => {
    return participants.filter(p => !p.assignedBungalowId);
  };

  const handleAssignParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedParticipant || !selectedBungalow || !selectedBed) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    // Récupérer le premier stage du participant sélectionné
    const participant = participants.find(p => p.id === selectedParticipant);
    if (!participant || !participant.stageIds || participant.stageIds.length === 0) {
      alert('Ce participant n\'est inscrit à aucun stage');
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
      setShowAssignModal(false);
      setSelectedParticipant(null);
      setSelectedBungalow(null);
      setSelectedBed('');
      setSelectedStage(null);
      
      alert('Participant assigné avec succès !');
    } catch (error: any) {
      alert('Erreur lors de l\'assignation: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const renderBungalowCard = (bungalow: Bungalow) => {
    const status = getBungalowStatus(bungalow);
    const occupancy = getBungalowOccupancy(bungalow);
    
    // Récupérer les participants assignés à ce bungalow durant la période
    const participantsInBungalow = filteredParticipants.filter(p => p.assignedBungalowId === bungalow.id);
    
    return (
      <div key={bungalow.id} className={`bungalow-card ${status}`}>
        <div className="bungalow-header">
          <h3>{bungalow.name}</h3>
          <span className={`bungalow-status ${status}`}>
            {status === 'empty' ? 'Libre' : status === 'full' ? 'Complet' : 'Partiel'}
          </span>
        </div>
        <div className="bungalow-details">
          <div className="bungalow-info">
            <div className="info-item">
              <i className="fas fa-bed"></i>
              <span>{occupancy}</span>
            </div>
            <div className="info-item">
              <i className="fas fa-home"></i>
              <span>Type {bungalow.type}</span>
            </div>
          </div>
          
          {/* Afficher les participants dans ce bungalow */}
          {participantsInBungalow.length > 0 ? (
            <div className="participants-list" style={{
              marginTop: '1rem',
              padding: '0.5rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px'
            }}>
              <h4 style={{ 
                fontSize: '0.9rem', 
                marginBottom: '0.5rem',
                color: '#666',
                fontWeight: '600'
              }}>
                <i className="fas fa-users" style={{marginRight: '0.5rem'}}></i>
                Participants ({participantsInBungalow.length})
              </h4>
              {participantsInBungalow.map(participant => (
                <div key={participant.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem',
                  marginBottom: '0.3rem',
                  backgroundColor: 'white',
                  borderRadius: '3px',
                  fontSize: '0.85rem'
                }}>
                  <i className={`fas fa-${participant.gender === 'M' ? 'male' : 'female'}`} 
                     style={{color: participant.gender === 'M' ? '#2196F3' : '#E91E63'}}></i>
                  <span style={{fontWeight: '500'}}>
                    {participant.firstName} {participant.lastName}
                  </span>
                  {participant.assignedBed && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '0.8rem',
                      color: '#666',
                      fontStyle: 'italic'
                    }}>
                      {participant.assignedBed}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              marginTop: '1rem',
              padding: '0.8rem',
              backgroundColor: '#e8f5e9',
              borderRadius: '4px',
              textAlign: 'center',
              color: '#2e7d32',
              fontSize: '0.85rem'
            }}>
              <i className="fas fa-check-circle" style={{marginRight: '0.5rem'}}></i>
              Aucun participant assigné
            </div>
          )}
        </div>
        <div className="bungalow-actions">
          <button className="btn btn-sm btn-primary">
            <i className="fas fa-user-plus"></i>
            Assigner
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="main-header">
        <h1>Villages</h1>
        
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="startDate" style={{marginRight: '0.5rem', fontWeight: '500'}}>
              <i className="fas fa-calendar-alt" style={{marginRight: '0.3rem'}}></i>
              Date Début:
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd'}}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="endDate" style={{marginRight: '0.5rem', fontWeight: '500'}}>
              <i className="fas fa-calendar-alt" style={{marginRight: '0.3rem'}}></i>
              Date Fin:
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd'}}
            />
          </div>
          {startDate && endDate && (
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#e8f5e9',
              borderRadius: '4px',
              fontSize: '0.9rem',
              color: '#2e7d32'
            }}>
              <i className="fas fa-info-circle" style={{marginRight: '0.5rem'}}></i>
              Affichage pour la période du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
        
        <div className="header-actions">
          <div className="view-controls">
            <button 
              className={`btn btn-secondary ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <i className="fas fa-th"></i>
              Grille
            </button>
            <button 
              className={`btn btn-secondary ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <i className="fas fa-list"></i>
              Liste
            </button>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAssignModal(true)}
          >
            <i className="fas fa-user-plus"></i>
            Assigner Participant
          </button>
        </div>
      </header>
      
      <div className="villages-content">
        {(['A', 'B', 'C'] as const).map((village) => {
          const villageBungalows = getBungalowsByVillage(village);
          const villageInfo = getVillageInfo(village);
          
          return (
            <div key={village} className="village-section">
              <div className="village-header">
                <h2>Village {village}</h2>
                <div className="village-info">
                  <span className="village-type">{villageInfo.type}</span>
                  <span className="occupancy">{villageInfo.occupancy}</span>
                </div>
              </div>
              <div className={`bungalows-grid ${viewMode}`}>
                {villageBungalows.map(renderBungalowCard)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assigner Participant</h2>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>&times;</button>
            </div>
            <form className="modal-form" onSubmit={handleAssignParticipant}>
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
                  {getUnassignedParticipants().map(participant => (
                    <option key={participant.id} value={participant.id}>
                      {participant.firstName} {participant.lastName} - Stages {participant.stageIds?.join(', ') || 'Aucun'}
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
                      Village {bungalow.village} - {bungalow.name} ({getBungalowOccupancy(bungalow)})
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
                  setShowAssignModal(false);
                  setSelectedParticipant(null);
                  setSelectedBungalow(null);
                  setSelectedBed('');
                  setSelectedStage(null);
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

export default Villages;
