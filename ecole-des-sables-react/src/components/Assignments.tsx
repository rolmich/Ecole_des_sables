import React, { useState, useEffect } from 'react';
import { Bungalow } from '../types/Bungalow';
import { Stage } from '../types/Stage';
import { Language } from '../types/Language';
import { ParticipantStage } from '../types/ParticipantStage';
import dataService from '../services/dataService';
import apiService from '../services/api';

const Assignments: React.FC = () => {
  // Inscriptions (ParticipantStage) au lieu de Participants
  const [registrations, setRegistrations] = useState<ParticipantStage[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<ParticipantStage[]>([]);
  const [bungalows, setBungalows] = useState<Bungalow[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedStage, setSelectedStage] = useState('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showManualAssignModal, setShowManualAssignModal] = useState(false);
  const [draggedRegistration, setDraggedRegistration] = useState<ParticipantStage | null>(null);
  const [dragOverBungalow, setDragOverBungalow] = useState<number | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<number | null>(null);
  const [selectedBungalow, setSelectedBungalow] = useState<number | null>(null);
  const [selectedBed, setSelectedBed] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Charger d'abord les stages pour avoir les dates
        const [stagesData, bungalowsData, languagesResponse] = await Promise.all([
          dataService.getStages(),
          dataService.getBungalows(),
          apiService.getLanguages({ is_active: true })
        ]);

        setBungalows(bungalowsData);
        setStages(stagesData);
        const languagesData = Array.isArray(languagesResponse) ? languagesResponse : (languagesResponse.results || languagesResponse.languages || []);
        setLanguages(languagesData);

        // NE PAS filtrer par date au chargement initial - charger TOUTES les inscriptions non assignées
        const registrationsData = await apiService.getUnassignedRegistrations();
        const regData = Array.isArray(registrationsData) ? registrationsData : (registrationsData.registrations || registrationsData.results || []);
        setRegistrations(regData);
        setFilteredRegistrations(regData);

        // Ne pas initialiser les dates automatiquement - laisser l'utilisateur filtrer si besoin
        // L'utilisateur peut sélectionner un stage et les dates seront ajustées en conséquence
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Recharger les inscriptions non assignées
  const reloadRegistrations = async () => {
    try {
      const params = startDate && endDate ? { startDate, endDate } : undefined;
      const registrationsData = await apiService.getUnassignedRegistrations(params);
      const regData = Array.isArray(registrationsData) ? registrationsData : (registrationsData.registrations || registrationsData.results || []);
      setRegistrations(regData);
      filterRegistrations(regData, selectedStage);
    } catch (error) {
      console.error('Erreur lors du rechargement des inscriptions:', error);
    }
  };

  // Filtrer les inscriptions selon l'événement sélectionné
  const filterRegistrations = (regs: ParticipantStage[], stageFilter: string) => {
    if (stageFilter === 'all') {
      setFilteredRegistrations(regs);
    } else {
      const stageId = parseInt(stageFilter);
      setFilteredRegistrations(regs.filter(r => r.stageId === stageId));
    }
  };

  // Filtrer les inscriptions selon les dates et l'événement
  useEffect(() => {
    filterRegistrations(registrations, selectedStage);
  }, [registrations, selectedStage]);

  // Recharger quand les dates changent (seulement si l'utilisateur a modifié manuellement)
  const [datesInitialized, setDatesInitialized] = useState(false);

  useEffect(() => {
    // Recharger seulement si les dates ont été initialisées par l'utilisateur
    if (datesInitialized && startDate && endDate) {
      reloadRegistrations();
    }
  }, [startDate, endDate, datesInitialized]);

  // Obtenir les inscriptions assignées à un bungalow (pour l'affichage)
  const getBungalowRegistrations = (bungalowId: number): ParticipantStage[] => {
    // On doit récupérer les assignations depuis le backend
    // Pour l'instant, on utilise les données des bungalows
    return [];
  };

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRegistration || !selectedBungalow || !selectedBed) {
      showAlert('error', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      await apiService.assignRegistration(selectedRegistration, {
        bungalowId: selectedBungalow,
        bed: selectedBed
      });

      // Recharger les données
      await Promise.all([
        reloadRegistrations(),
        dataService.getBungalows().then(setBungalows)
      ]);

      // Fermer le modal et réinitialiser
      setShowManualAssignModal(false);
      setSelectedRegistration(null);
      setSelectedBungalow(null);
      setSelectedBed('');

      showAlert('success', 'Inscription assignée avec succès !');
    } catch (error: any) {
      showAlert('error', 'Erreur lors de l\'assignation: ' + (error.message || 'Erreur inconnue'));
    }
  };

  // Calculer les statistiques
  const totalBeds = bungalows.reduce((sum, b) => sum + b.capacity, 0);
  const occupiedBeds = bungalows.reduce((sum, b) => {
    // Compter les lits occupés par bungalow
    const occupants = b.beds?.filter(bed => bed.occupiedBy !== null).length || 0;
    return sum + occupants;
  }, 0);
  const availableBeds = totalBeds - occupiedBeds;
  const availableBungalows = bungalows.filter(b => {
    const occupants = b.beds?.filter(bed => bed.occupiedBy !== null).length || 0;
    return occupants === 0;
  });

  const getStageName = (stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    return stage ? stage.name : 'Événement inconnu';
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'student': return 'Élève';
      case 'instructor': return 'Enseignant-e';
      case 'professional': return 'Professionnel-le';
      case 'staff': return 'Staff';
      default: return status;
    }
  };

  const getBungalowOccupancy = (bungalow: Bungalow) => {
    const occupants = bungalow.beds?.filter(bed => bed.occupiedBy !== null).length || 0;
    return `${occupants}/${bungalow.capacity}`;
  };

  const getBungalowStatus = (bungalow: Bungalow) => {
    const occupants = bungalow.beds?.filter(bed => bed.occupiedBy !== null).length || 0;
    if (occupants === 0) return 'empty';
    if (occupants === bungalow.capacity) return 'full';
    return 'partial';
  };

  const getBungalowOccupants = (bungalow: Bungalow) => {
    if (!bungalow.beds) return [];
    return bungalow.beds
      .filter(bed => bed.occupiedBy !== null && bed.occupiedBy !== undefined)
      .map(bed => {
        const occ = bed.occupiedBy;
        if (typeof occ === 'object' && occ !== null) {
          return {
            bedId: bed.id,
            participantName: occ.name || 'Inconnu',
            registrationId: occ.registrationId || null,
            stageName: occ.stageName || null
          };
        }
        // Fallback pour les anciennes données (string ou number)
        return {
          bedId: bed.id,
          participantName: typeof occ === 'string' ? occ : `Participant #${occ}`,
          registrationId: null,
          stageName: null
        };
      });
  };

  const handleDragStart = (registration: ParticipantStage) => {
    setDraggedRegistration(registration);
  };

  const handleDragEnd = () => {
    setDraggedRegistration(null);
    setDragOverBungalow(null);
  };

  const handleDragOver = (e: React.DragEvent, bungalowId: number) => {
    e.preventDefault();
    const bungalow = bungalows.find(b => b.id === bungalowId);
    const currentOccupancy = bungalow?.beds?.filter(bed => bed.occupiedBy !== null).length || 0;

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
    if (!draggedRegistration) {
      setDragOverBungalow(null);
      return;
    }

    const bungalow = bungalows.find(b => b.id === bungalowId);
    const currentOccupancy = bungalow?.beds?.filter(bed => bed.occupiedBy !== null).length || 0;

    if (bungalow && currentOccupancy >= bungalow.capacity) {
      showAlert('error', `Le bungalow ${bungalow.name} est complet (${bungalow.capacity}/${bungalow.capacity})`);
      setDragOverBungalow(null);
      return;
    }

    // Trouver le prochain lit disponible
    const availableBed = bungalow?.beds?.find(bed => bed.occupiedBy === null);
    const bedId = availableBed?.id || `bed${currentOccupancy + 1}`;

    try {
      console.log('[ASSIGNMENT] Assigning registration:', {
        registrationId: draggedRegistration.id,
        bungalowId,
        bedId,
        participant: draggedRegistration.participantName,
        stage: draggedRegistration.stageName
      });

      // Assigner via l'API
      await apiService.assignRegistration(draggedRegistration.id, {
        bungalowId,
        bed: bedId
      });

      // Recharger les données
      await Promise.all([
        reloadRegistrations(),
        dataService.getBungalows().then(setBungalows)
      ]);

      showAlert('success', `✅ ${draggedRegistration.participantName} assigné au bungalow ${bungalow?.name} (${draggedRegistration.stageName})`);
    } catch (error: any) {
      console.error('[ASSIGNMENT] Error:', error);
      const errorMsg = error.message || error.data?.error || 'Erreur lors de l\'assignation';
      showAlert('error', `❌ ${errorMsg}`);
    }

    setDragOverBungalow(null);
  };

  const handleRemoveRegistration = async (registrationId: number, participantName: string) => {
    try {
      console.log('[ASSIGNMENT] Unassigning registration:', registrationId);

      await apiService.unassignRegistration(registrationId);

      // Recharger les données
      await Promise.all([
        reloadRegistrations(),
        dataService.getBungalows().then(setBungalows)
      ]);

      showAlert('warning', `✅ ${participantName} retiré de sa chambre`);
    } catch (error: any) {
      console.error('[ASSIGNMENT] Error:', error);
      const errorMsg = error.message || error.data?.error || 'Erreur lors de la désassignation';
      showAlert('error', `❌ ${errorMsg}`);
    }
  };

  // Format date pour affichage
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Format date pour export (YYYY-MM-DD)
  const formatDateExport = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0]; // Garde juste la partie date
  };

  // Format heure pour export (HH:MM)
  const formatTimeExport = (timeStr: string | undefined) => {
    if (!timeStr) return '';
    return timeStr;
  };

  // State pour le modal d'export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStageId, setExportStageId] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  // Exporter les assignations en CSV
  const exportAssignments = async () => {
    setExporting(true);
    try {
      // Appeler l'API backend pour récupérer les données avec les heures
      const stageId = exportStageId !== 'all' ? parseInt(exportStageId) : undefined;
      const response = await apiService.exportAssignments(stageId);

      const assignments = response.assignments || [];

      if (assignments.length === 0) {
        showAlert('warning', 'Aucune assignation à exporter');
        setShowExportModal(false);
        setExporting(false);
        return;
      }

      // Créer le contenu CSV avec BOM pour Excel
      const headers = ['Village', 'Chambre', 'Nom et Prénom', 'Date d\'arrivée', 'Heure d\'arrivée', 'Date de départ', 'Heure de départ'];
      const rows = assignments.map((a: any) => [
        a.village,
        a.bungalow,
        a.participantName,
        a.arrivalDate,
        a.arrivalTime,
        a.departureDate,
        a.departureTime
      ]);

      const csvContent = '\uFEFF' + [headers, ...rows]
        .map((row: string[]) => row.map((cell: string) => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
        .join('\n');

      // Télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      const stageName = exportStageId !== 'all'
        ? stages.find(s => s.id === parseInt(exportStageId))?.name?.replace(/[^a-zA-Z0-9]/g, '_') || exportStageId
        : 'tous';
      link.download = `assignations_${stageName}_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showAlert('success', `${assignments.length} assignation(s) exportée(s)`);
      setShowExportModal(false);
    } catch (error: any) {
      showAlert('error', 'Erreur lors de l\'export: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setExporting(false);
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
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatesInitialized(true);
              }}
              style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd'}}
            />
          </div>
          <div className="form-group" style={{marginBottom: 0}}>
            <label htmlFor="endDate" style={{marginRight: '0.5rem'}}>Date Fin:</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatesInitialized(true);
              }}
              style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd'}}
            />
          </div>
          {/* Bouton pour réinitialiser le filtre de dates */}
          {datesInitialized && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setDatesInitialized(false);
                // Recharger toutes les inscriptions sans filtre
                apiService.getUnassignedRegistrations().then((data) => {
                  const regData = Array.isArray(data) ? data : (data.registrations || data.results || []);
                  setRegistrations(regData);
                  filterRegistrations(regData, selectedStage);
                });
              }}
              style={{padding: '0.5rem 1rem', fontSize: '0.85rem'}}
            >
              <i className="fas fa-times" style={{marginRight: '0.3rem'}}></i>
              Effacer filtre dates
            </button>
          )}
        </div>

        <div className="header-actions">
          <div className="assignment-controls">
            <select
              className="filter-select"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
            >
              <option value="all">Tous les événements</option>
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
            className="btn btn-success"
            onClick={() => setShowExportModal(true)}
            style={{ marginRight: '8px' }}
          >
            <i className="fas fa-file-export"></i>
            Exporter
          </button>
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
                <h3>{registrations.length}</h3>
                <p>Inscriptions Non Assignées</p>
              </div>
            </div>
              <div className="overview-card">
                <div className="card-icon">
                  <i className="fas fa-bed"></i>
                </div>
                <div className="card-content">
                  <h3>{occupiedBeds}</h3>
                  <p>Lits Occupés</p>
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
                  <i className="fas fa-bed"></i>
                </div>
                <div className="card-content">
                  <h3>{availableBeds}/{totalBeds}</h3>
                  <p>Lits Disponibles</p>
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
            <h3>Inscriptions Non Assignées ({filteredRegistrations.length})</h3>
            {loading ? (
              <div style={{textAlign: 'center', padding: '2rem'}}>
                <i className="fas fa-spinner fa-spin" style={{fontSize: '2rem', color: '#6366F1'}}></i>
                <p style={{marginTop: '1rem', color: '#6B7280'}}>Chargement...</p>
              </div>
            ) : (
              <div className="participants-list">
                {filteredRegistrations.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '2rem', color: '#6B7280'}}>
                    <i className="fas fa-check-circle" style={{fontSize: '2rem', color: '#10B981', marginBottom: '1rem'}}></i>
                    <p>Toutes les inscriptions sont assignées !</p>
                  </div>
                ) : (
                  filteredRegistrations.map((registration) => (
                    <div
                      key={registration.id}
                      className={`participant-card ${draggedRegistration?.id === registration.id ? 'dragging' : ''}`}
                      draggable="true"
                      onDragStart={() => handleDragStart(registration)}
                      onDragEnd={handleDragEnd}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        backgroundColor: 'white',
                        borderRadius: '10px',
                        marginBottom: '6px',
                        border: `2px solid ${registration.participantGender === 'M' ? '#DBEAFE' : '#FCE7F3'}`,
                        borderLeft: `4px solid ${registration.participantGender === 'M' ? '#3B82F6' : '#EC4899'}`,
                        cursor: 'grab',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      {/* Avatar compact */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: registration.participantGender === 'M' ? '#DBEAFE' : '#FCE7F3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <i className={`fas ${registration.participantGender === 'M' ? 'fa-mars' : 'fa-venus'}`}
                           style={{color: registration.participantGender === 'M' ? '#3B82F6' : '#EC4899', fontSize: '16px'}}></i>
                      </div>

                      {/* Infos principales */}
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '3px'
                        }}>
                          <span style={{fontWeight: '600', fontSize: '13px', color: '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                            {registration.participantName || 'Inconnu'}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: '#6B7280',
                            backgroundColor: '#F3F4F6',
                            padding: '1px 6px',
                            borderRadius: '10px'
                          }}>
                            {registration.participantAge || '?'} ans
                          </span>
                        </div>

                        {/* Ligne événement + dates */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px'
                        }}>
                          <span style={{
                            backgroundColor: '#EEF2FF',
                            color: '#4338CA',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '500',
                            maxWidth: '120px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {registration.stageName || 'Événement'}
                          </span>
                          <span style={{color: '#9CA3AF'}}>
                            {formatDate(registration.effectiveArrivalDate)} - {formatDate(registration.effectiveDepartureDate)}
                          </span>
                        </div>
                      </div>

                      {/* Badge rôle */}
                      <div style={{
                        padding: '3px 8px',
                        backgroundColor: registration.role === 'instructor' ? '#FEF3C7' : registration.role === 'musician' ? '#E0E7FF' : '#F3F4F6',
                        color: registration.role === 'instructor' ? '#92400E' : registration.role === 'musician' ? '#4338CA' : '#6B7280',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        {getRoleText(registration.role)}
                      </div>

                      {/* Drag handle */}
                      <div style={{color: '#D1D5DB', cursor: 'grab'}}>
                        <i className="fas fa-grip-vertical"></i>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
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
                          const occupants = getBungalowOccupants(bungalow);
                          const isFull = status === 'full';

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
                                {occupants.map((occupant, idx) => (
                                  <div
                                    key={idx}
                                    className="assigned-participant"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '6px 10px',
                                      backgroundColor: '#F0FDF4',
                                      borderRadius: '6px',
                                      marginBottom: '4px',
                                      border: '1px solid #BBF7D0'
                                    }}
                                  >
                                    <i className="fas fa-user" style={{color: '#16A34A'}}></i>
                                    <div style={{flex: 1}}>
                                      <div style={{fontWeight: '500', fontSize: '13px'}}>{occupant.participantName}</div>
                                      {occupant.stageName && (
                                        <div style={{fontSize: '11px', color: '#6B7280'}}>{occupant.stageName}</div>
                                      )}
                                    </div>
                                    <span style={{fontSize: '11px', color: '#9CA3AF', marginRight: '4px'}}>{occupant.bedId}</span>
                                    {occupant.registrationId && (
                                      <button
                                        className="remove-participant-btn"
                                        onClick={() => handleRemoveRegistration(occupant.registrationId!, occupant.participantName)}
                                        title="Retirer de la chambre"
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#EF4444',
                                          cursor: 'pointer',
                                          padding: '4px'
                                        }}
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {occupants.length === 0 && (
                                  <div className="empty-bungalow" style={{
                                    padding: '12px',
                                    textAlign: 'center',
                                    color: '#9CA3AF',
                                    fontSize: '12px',
                                    border: '2px dashed #E5E7EB',
                                    borderRadius: '6px'
                                  }}>
                                    <i className="fas fa-plus" style={{marginRight: '6px'}}></i>
                                    <span>Glissez une inscription ici</span>
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
                <label htmlFor="registrationSelect">Sélectionner une Inscription</label>
                <select
                  id="registrationSelect"
                  name="registrationSelect"
                  required
                  value={selectedRegistration || ''}
                  onChange={(e) => setSelectedRegistration(parseInt(e.target.value))}
                >
                  <option value="">Choisir une inscription...</option>
                  {filteredRegistrations.map(registration => (
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
                    const registration = filteredRegistrations.find(r => r.id === selectedRegistration);
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
                  setShowManualAssignModal(false);
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-file-export" style={{ marginRight: '10px', color: '#10B981' }}></i>
                Exporter les Assignations
              </h2>
              <button className="close-btn" onClick={() => setShowExportModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label htmlFor="exportStage" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: '500' }}>
                  <i className="fas fa-calendar-alt" style={{ marginRight: '8px', color: '#6366F1' }}></i>
                  Événement
                </label>
                <select
                  id="exportStage"
                  value={exportStageId}
                  onChange={(e) => setExportStageId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '1rem'
                  }}
                >
                  <option value="all">Tous les événements</option>
                  {stages.map(stage => (
                    <option key={stage.id} value={stage.id.toString()}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#F0FDF4',
                borderRadius: '8px',
                border: '1px solid #BBF7D0'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '0.9rem' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                  Colonnes exportées
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#15803D' }}>
                  <li>Village</li>
                  <li>Chambre</li>
                  <li>Nom et Prénom</li>
                  <li>Date d'arrivée</li>
                  <li>Heure d'arrivée</li>
                  <li>Date de départ</li>
                  <li>Heure de départ</li>
                </ul>
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowExportModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={exportAssignments}
                  disabled={exporting}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {exporting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Export en cours...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download"></i>
                      Télécharger CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Assignments;
