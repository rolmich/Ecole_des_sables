import React, { useState, useEffect } from 'react';
import { Bungalow } from '../types/Bungalow';
import { Stage } from '../types/Stage';
import { ParticipantStage } from '../types/ParticipantStage';
import dataService from '../services/dataService';
import apiService from '../services/api';

const Villages: React.FC = () => {
  const [bungalows, setBungalows] = useState<Bungalow[]>([]);
  const [registrations, setRegistrations] = useState<ParticipantStage[]>([]);
  const [assignedRegistrations, setAssignedRegistrations] = useState<ParticipantStage[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedRegistration, setSelectedRegistration] = useState<number | null>(null);
  const [selectedBungalow, setSelectedBungalow] = useState<number | null>(null);
  const [selectedBed, setSelectedBed] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [unassignedData, bungalowsData, stagesData] = await Promise.all([
          apiService.getUnassignedRegistrations(),
          dataService.getBungalows(),
          dataService.getStages()
        ]);

        const regData = Array.isArray(unassignedData) ? unassignedData : (unassignedData.registrations || unassignedData.results || []);
        setRegistrations(regData);
        setBungalows(bungalowsData);
        setStages(stagesData);

        // Initialiser avec la date du prochain événement (à venir ou en cours)
        if (stagesData.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Filtrer les événements à venir et en cours
          const activeAndUpcomingStages = stagesData.filter((stage: Stage) => {
            const endDate = new Date(stage.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate >= today;
          });

          if (activeAndUpcomingStages.length > 0) {
            const nextEvent = activeAndUpcomingStages[0];
            setStartDate(nextEvent.startDate);
            setEndDate(nextEvent.endDate);
          } else if (stagesData.length > 0) {
            // Si aucun événement à venir, utiliser le premier événement disponible
            const firstStage = stagesData[0];
            setStartDate(firstStage.startDate);
            setEndDate(firstStage.endDate);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Recharger les inscriptions quand les dates changent
  useEffect(() => {
    if (startDate && endDate) {
      reloadData();
    }
  }, [startDate, endDate]);

  const reloadData = async () => {
    try {
      const params = startDate && endDate ? { startDate, endDate } : undefined;
      const [unassignedData, bungalowsData] = await Promise.all([
        apiService.getUnassignedRegistrations(params),
        dataService.getBungalows()
      ]);

      const regData = Array.isArray(unassignedData) ? unassignedData : (unassignedData.registrations || unassignedData.results || []);
      setRegistrations(regData);
      setBungalows(bungalowsData);
    } catch (error) {
      console.error('Erreur lors du rechargement des données:', error);
    }
  };

  const showAlertMessage = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const getBungalowsByVillage = (village: 'A' | 'B' | 'C') => {
    return bungalows.filter(b => b.village === village);
  };

  // Fonction pour obtenir les occupants d'un bungalow (avec filtrage par dates)
  const getBungalowOccupants = (bungalow: Bungalow) => {
    if (!bungalow.beds) return [];

    return bungalow.beds
      .filter(bed => {
        if (!bed.occupiedBy) return false;

        // Si des dates de filtre sont définies, vérifier le chevauchement
        if (startDate && endDate && typeof bed.occupiedBy === 'object') {
          const occ = bed.occupiedBy;
          if (occ.startDate && occ.endDate) {
            const filterStart = new Date(startDate);
            const filterEnd = new Date(endDate);
            const occupantStart = new Date(occ.startDate);
            const occupantEnd = new Date(occ.endDate);

            // Vérifier le chevauchement: l'occupant doit être présent pendant la période filtrée
            // Le participant est présent si sa date de départ >= date début filtre ET sa date d'arrivée <= date fin filtre
            return occupantEnd >= filterStart && occupantStart <= filterEnd;
          }
        }

        return true; // Si pas de filtre ou pas de dates, afficher tous les occupants
      })
      .map(bed => {
        const occ = bed.occupiedBy;
        if (typeof occ === 'object' && occ !== null) {
          return {
            bedId: bed.id,
            participantName: occ.name || 'Inconnu',
            registrationId: occ.registrationId || null,
            stageName: occ.stageName || null,
            gender: occ.gender || null,
            age: occ.age || null,
            nationality: occ.nationality || null,
            languages: occ.languages || [],
            role: occ.role || null
          };
        }
        // Fallback pour les anciennes données (string ou number)
        return {
          bedId: bed.id,
          participantName: typeof occ === 'string' ? occ : `Participant #${occ}`,
          registrationId: null,
          stageName: null,
          gender: null,
          age: null,
          nationality: null,
          languages: [],
          role: null
        };
      });
  };

  const getVillageInfo = (village: 'A' | 'B' | 'C') => {
    const villageBungalows = getBungalowsByVillage(village);

    // Compter les bungalows occupés (avec filtrage par dates)
    const occupied = villageBungalows.filter(b => {
      const occupants = getBungalowOccupants(b).length;
      return occupants > 0;
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
    const occupants = getBungalowOccupants(bungalow).length;
    return `${occupants}/${bungalow.capacity}`;
  };

  const getBungalowStatus = (bungalow: Bungalow) => {
    const occupants = getBungalowOccupants(bungalow).length;
    if (occupants === 0) return 'empty';
    if (occupants === bungalow.capacity) return 'full';
    return 'partial';
  };

  // Calculer les statistiques des lits (avec filtrage par dates)
  const totalBeds = bungalows.reduce((sum, b) => sum + b.capacity, 0);
  const occupiedBeds = bungalows.reduce((sum, b) => {
    const occupants = getBungalowOccupants(b).length;
    return sum + occupants;
  }, 0);
  const availableBeds = totalBeds - occupiedBeds;
  const occupiedBungalows = bungalows.filter(b => {
    const occupants = getBungalowOccupants(b).length;
    return occupants > 0;
  }).length;
  const totalBungalows = bungalows.length;

  const handleAssignRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRegistration || !selectedBungalow || !selectedBed) {
      showAlertMessage('error', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      await apiService.assignRegistration(selectedRegistration, {
        bungalowId: selectedBungalow,
        bed: selectedBed
      });

      // Recharger les données
      await reloadData();

      // Fermer le modal et réinitialiser
      setShowAssignModal(false);
      setSelectedRegistration(null);
      setSelectedBungalow(null);
      setSelectedBed('');

      showAlertMessage('success', 'Inscription assignée avec succès !');
    } catch (error: any) {
      showAlertMessage('error', 'Erreur lors de l\'assignation: ' + (error.message || 'Erreur inconnue'));
    }
  };

  // Format date pour affichage
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'participant': return 'Participant';
      case 'musician': return 'Musicien';
      case 'instructor': return 'Instructeur';
      case 'staff': return 'Staff';
      default: return role;
    }
  };

  const renderBungalowCard = (bungalow: Bungalow) => {
    const status = getBungalowStatus(bungalow);
    const occupancy = getBungalowOccupancy(bungalow);
    const occupants = getBungalowOccupants(bungalow);

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

          {/* Afficher les occupants dans ce bungalow */}
          {occupants.length > 0 ? (
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
                Occupants ({occupants.length})
              </h4>
              {occupants.map((occupant, idx) => (
                <div key={idx} style={{
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  {/* Header avec nom et genre */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid #F3F4F6'
                  }}>
                    <i className={`fas fa-${occupant.gender === 'M' ? 'male' : 'female'}`}
                       style={{
                         color: occupant.gender === 'M' ? '#3B82F6' : '#EC4899',
                         fontSize: '1.1rem'
                       }}></i>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: '600', fontSize: '0.9rem', color: '#1F2937'}}>
                        {occupant.participantName}
                      </div>
                      {occupant.role && (
                        <div style={{
                          display: 'inline-block',
                          fontSize: '0.7rem',
                          color: '#6B7280',
                          backgroundColor: '#F3F4F6',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          marginTop: '2px'
                        }}>
                          {occupant.role === 'instructor' ? 'Encadrant' :
                           occupant.role === 'musician' ? 'Musicien' :
                           occupant.role === 'staff' ? 'Staff' : 'Participant'}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#9CA3AF',
                      backgroundColor: '#F3F4F6',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: '500'
                    }}>
                      {occupant.bedId}
                    </span>
                  </div>

                  {/* Détails du participant */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '0.4rem',
                    fontSize: '0.75rem'
                  }}>
                    {occupant.age && (
                      <>
                        <div style={{color: '#6B7280', fontWeight: '500'}}>
                          <i className="fas fa-birthday-cake" style={{marginRight: '4px', width: '14px'}}></i>
                          Âge:
                        </div>
                        <div style={{color: '#374151'}}>{occupant.age} ans</div>
                      </>
                    )}

                    {occupant.nationality && (
                      <>
                        <div style={{color: '#6B7280', fontWeight: '500'}}>
                          <i className="fas fa-flag" style={{marginRight: '4px', width: '14px'}}></i>
                          Pays:
                        </div>
                        <div style={{color: '#374151'}}>{occupant.nationality}</div>
                      </>
                    )}

                    {occupant.languages && occupant.languages.length > 0 && (
                      <>
                        <div style={{color: '#6B7280', fontWeight: '500'}}>
                          <i className="fas fa-language" style={{marginRight: '4px', width: '14px'}}></i>
                          Langues:
                        </div>
                        <div style={{color: '#374151'}}>{occupant.languages.join(', ')}</div>
                      </>
                    )}

                    {occupant.stageName && (
                      <>
                        <div style={{color: '#6B7280', fontWeight: '500'}}>
                          <i className="fas fa-calendar-alt" style={{marginRight: '4px', width: '14px'}}></i>
                          Événement:
                        </div>
                        <div style={{color: '#374151', fontWeight: '500'}}>{occupant.stageName}</div>
                      </>
                    )}
                  </div>
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
              Aucun occupant
            </div>
          )}
        </div>
        <div className="bungalow-actions">
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              setSelectedBungalow(bungalow.id);
              setShowAssignModal(true);
            }}
          >
            <i className="fas fa-user-plus"></i>
            Assigner
          </button>
        </div>
      </div>
    );
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
            Assigner Inscription
          </button>
        </div>
      </header>

      {/* Métriques des lits */}
      <div className="villages-metrics" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        margin: '1.5rem 0',
        padding: '0 1rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem'
          }}>
            <i className="fas fa-bed"></i>
          </div>
          <div>
            <h3 style={{margin: 0, fontSize: '1.8rem', color: '#2c3e50'}}>{totalBeds}</h3>
            <p style={{margin: '0.25rem 0 0 0', color: '#7f8c8d', fontSize: '0.9rem'}}>Total Lits</p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem'
          }}>
            <i className="fas fa-check-circle"></i>
          </div>
          <div>
            <h3 style={{margin: 0, fontSize: '1.8rem', color: '#2c3e50'}}>{availableBeds}</h3>
            <p style={{margin: '0.25rem 0 0 0', color: '#7f8c8d', fontSize: '0.9rem'}}>Lits Disponibles</p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #3498db, #5dade2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem'
          }}>
            <i className="fas fa-users"></i>
          </div>
          <div>
            <h3 style={{margin: 0, fontSize: '1.8rem', color: '#2c3e50'}}>{occupiedBeds}</h3>
            <p style={{margin: '0.25rem 0 0 0', color: '#7f8c8d', fontSize: '0.9rem'}}>Lits Occupés</p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f39c12, #f8c471)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem'
          }}>
            <i className="fas fa-home"></i>
          </div>
          <div>
            <h3 style={{margin: 0, fontSize: '1.8rem', color: '#2c3e50'}}>{occupiedBungalows}/{totalBungalows}</h3>
            <p style={{margin: '0.25rem 0 0 0', color: '#7f8c8d', fontSize: '0.9rem'}}>Chambres Occupées</p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem'
          }}>
            <i className="fas fa-clipboard-list"></i>
          </div>
          <div>
            <h3 style={{margin: 0, fontSize: '1.8rem', color: '#2c3e50'}}>{registrations.length}</h3>
            <p style={{margin: '0.25rem 0 0 0', color: '#7f8c8d', fontSize: '0.9rem'}}>Non Assignés</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{textAlign: 'center', padding: '3rem'}}>
          <i className="fas fa-spinner fa-spin" style={{fontSize: '2rem', color: '#6366F1'}}></i>
          <p style={{marginTop: '1rem', color: '#6B7280'}}>Chargement...</p>
        </div>
      ) : (
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
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assigner une Inscription</h2>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>&times;</button>
            </div>
            <form className="modal-form" onSubmit={handleAssignRegistration}>
              <div className="form-group">
                <label htmlFor="registrationSelect">Sélectionner une Inscription (non assignées)</label>
                <select
                  id="registrationSelect"
                  name="registrationSelect"
                  required
                  value={selectedRegistration || ''}
                  onChange={(e) => setSelectedRegistration(parseInt(e.target.value))}
                >
                  <option value="">Choisir une inscription...</option>
                  {registrations.map(registration => (
                    <option key={registration.id} value={registration.id}>
                      {registration.participantName} - {registration.stageName} ({formatDate(registration.effectiveArrivalDate)} → {formatDate(registration.effectiveDepartureDate)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="registrationInfo">Détails de l'inscription</label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  {selectedRegistration && (() => {
                    const registration = registrations.find(r => r.id === selectedRegistration);
                    if (registration) {
                      return (
                        <div>
                          <div style={{marginBottom: '0.5rem'}}>
                            <i className="fas fa-user" style={{marginRight: '0.5rem', color: '#6366F1'}}></i>
                            <strong>{registration.participantName}</strong> ({registration.participantGender === 'M' ? 'Homme' : 'Femme'}, {registration.participantAge} ans)
                          </div>
                          <div style={{marginBottom: '0.5rem'}}>
                            <i className="fas fa-calendar-alt" style={{marginRight: '0.5rem', color: '#10B981'}}></i>
                            <strong>Événement:</strong> {registration.stageName}
                          </div>
                          <div style={{marginBottom: '0.5rem'}}>
                            <i className="fas fa-clock" style={{marginRight: '0.5rem', color: '#F59E0B'}}></i>
                            <strong>Période:</strong> {formatDate(registration.effectiveArrivalDate)} → {formatDate(registration.effectiveDepartureDate)}
                          </div>
                          <div>
                            <i className="fas fa-tag" style={{marginRight: '0.5rem', color: '#8B5CF6'}}></i>
                            <strong>Rôle:</strong> {getRoleText(registration.role)}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div style={{color: '#6c757d', fontStyle: 'italic'}}>
                        <i className="fas fa-info-circle" style={{marginRight: '0.5rem'}}></i>
                        Sélectionnez une inscription pour voir les détails
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
                  setSelectedRegistration(null);
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

export default Villages;
