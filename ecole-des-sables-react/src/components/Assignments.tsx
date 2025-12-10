import React, { useState, useEffect } from 'react';
import { Bungalow } from '../types/Bungalow';
import { Stage } from '../types/Stage';
import { Language } from '../types/Language';
import { ParticipantStage } from '../types/ParticipantStage';
import dataService from '../services/dataService';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';

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
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);

  // Modal de confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    type?: 'warning' | 'danger' | 'info';
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  // Modal de warning pour les règles d'assignation
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

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

        // Filtrer pour n'afficher que les événements actifs et à venir
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeAndUpcomingStages = stagesData.filter(stage => {
          const endDate = new Date(stage.endDate);
          endDate.setHours(0, 0, 0, 0);
          return endDate >= today; // Événements dont la date de fin est >= aujourd'hui
        });

        setBungalows(bungalowsData);
        setStages(activeAndUpcomingStages);
        const languagesData = Array.isArray(languagesResponse) ? languagesResponse : (languagesResponse.results || languagesResponse.languages || []);
        setLanguages(languagesData);

        // Définir les dates par défaut sur le prochain événement (le premier actif/à venir)
        if (activeAndUpcomingStages.length > 0) {
          const nextEvent = activeAndUpcomingStages[0]; // Le premier événement (trié par date)
          setStartDate(nextEvent.startDate);
          setEndDate(nextEvent.endDate);
          setDatesInitialized(true);

          // Charger les inscriptions filtrées pour ce prochain événement
          const registrationsData = await apiService.getUnassignedRegistrations({
            startDate: nextEvent.startDate,
            endDate: nextEvent.endDate
          });
          const regData = Array.isArray(registrationsData) ? registrationsData : (registrationsData.registrations || registrationsData.results || []);
          setRegistrations(regData);
          setFilteredRegistrations(regData);
        } else {
          // Pas d'événement à venir, charger toutes les inscriptions
          const registrationsData = await apiService.getUnassignedRegistrations();
          const regData = Array.isArray(registrationsData) ? registrationsData : (registrationsData.registrations || registrationsData.results || []);
          setRegistrations(regData);
          setFilteredRegistrations(regData);
        }
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

  const handleManualAssign = async (e: React.FormEvent, forceAssign: boolean = false) => {
    e.preventDefault();

    if (!selectedRegistration || !selectedBungalow || !selectedBed) {
      showAlert('error', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      await apiService.assignRegistration(selectedRegistration, {
        bungalowId: selectedBungalow,
        bed: selectedBed,
        force_assign: forceAssign
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
      // Vérifier si c'est un warning (status 409)
      if (error.status === 409 && error.data?.warning && error.data?.requires_confirmation) {
        // Afficher le modal de warning
        setWarningModal({
          isOpen: true,
          message: error.data.message,
          onConfirm: () => {
            setWarningModal(prev => ({ ...prev, isOpen: false }));
            // Réessayer avec force_assign = true
            handleManualAssign(e, true);
          }
        });
      } else {
        showAlert('error', 'Erreur lors de l\'assignation: ' + (error.message || 'Erreur inconnue'));
      }
    }
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
            role: occ.role || null,
            wasForced: occ.wasForced || false
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
          role: null,
          wasForced: false
        };
      });
  };

  // Calculer les statistiques (avec filtrage par dates)
  const totalBeds = bungalows.reduce((sum, b) => sum + b.capacity, 0);
  const occupiedBeds = bungalows.reduce((sum, b) => {
    // Compter les lits occupés par bungalow (en tenant compte du filtre de dates)
    const occupants = getBungalowOccupants(b).length;
    return sum + occupants;
  }, 0);
  const availableBeds = totalBeds - occupiedBeds;
  const availableBungalows = bungalows.filter(b => {
    const occupants = getBungalowOccupants(b).length;
    return occupants === 0;
  });

  // Calculer le nombre de bungalows avec des conflits (assignations forcées)
  const bungalowsWithConflicts = bungalows.filter(bungalow => {
    return bungalow.beds?.some(bed =>
      bed.occupiedBy && typeof bed.occupiedBy === 'object' && bed.occupiedBy.wasForced
    );
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
    const occupants = getBungalowOccupants(bungalow).length;
    return `${occupants}/${bungalow.capacity}`;
  };

  const getBungalowStatus = (bungalow: Bungalow) => {
    const occupants = getBungalowOccupants(bungalow).length;

    // Vérifier si au moins un occupant a une assignation forcée
    const hasForcedAssignment = bungalow.beds?.some(bed =>
      bed.occupiedBy && typeof bed.occupiedBy === 'object' && bed.occupiedBy.wasForced
    );

    if (hasForcedAssignment) return 'forced';
    if (occupants === 0) return 'empty';
    if (occupants === bungalow.capacity) return 'full';
    return 'partial';
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

  const handleDrop = async (e: React.DragEvent, bungalowId: number, forceAssign: boolean = false) => {
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

    const currentDraggedRegistration = draggedRegistration;

    try {
      console.log('[ASSIGNMENT] Assigning registration:', {
        registrationId: currentDraggedRegistration.id,
        bungalowId,
        bedId,
        participant: currentDraggedRegistration.participantName,
        stage: currentDraggedRegistration.stageName,
        forceAssign
      });

      // Assigner via l'API
      await apiService.assignRegistration(currentDraggedRegistration.id, {
        bungalowId,
        bed: bedId,
        force_assign: forceAssign
      });

      // Recharger les données
      await Promise.all([
        reloadRegistrations(),
        dataService.getBungalows().then(setBungalows)
      ]);

      showAlert('success', `✅ ${currentDraggedRegistration.participantName} assigné au bungalow ${bungalow?.name} (${currentDraggedRegistration.stageName})`);
    } catch (error: any) {
      console.error('[ASSIGNMENT] Error:', error);

      // Vérifier si c'est un warning (status 409)
      if (error.status === 409 && error.data?.warning && error.data?.requires_confirmation) {
        // Afficher le modal de warning
        setWarningModal({
          isOpen: true,
          message: error.data.message,
          onConfirm: () => {
            setWarningModal(prev => ({ ...prev, isOpen: false }));
            // Réessayer avec force_assign = true
            handleDrop(e, bungalowId, true);
          }
        });
      } else {
        const errorMsg = error.message || error.data?.error || 'Erreur lors de l\'assignation';
        showAlert('error', `❌ ${errorMsg}`);
      }
    }

    setDragOverBungalow(null);
  };

  const handleAutoAssign = async () => {
    // Si "Tous les événements", traiter tous les événements à venir et en cours
    if (selectedStage === 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filtrer les événements à venir et en cours
      const upcomingStages = stages.filter(stage => {
        const endDate = new Date(stage.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today;
      });

      if (upcomingStages.length === 0) {
        showAlert('warning', 'Aucun événement à venir ou en cours');
        return;
      }

      setConfirmModal({
        isOpen: true,
        title: 'Assignation automatique',
        message: `Lancer l'assignation automatique pour TOUS les événements à venir (${upcomingStages.length} événements) ?\n\nCela assignera automatiquement tous les participants non assignés aux bungalows disponibles.`,
        type: 'info',
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));

          setLoading(true);
          try {
            let totalAssigned = 0;
            let totalFailed = 0;
            const results = [];

            // Traiter chaque événement
            for (const stage of upcomingStages) {
              try {
                const result = await apiService.autoAssignStageParticipants(stage.id);
                if (result.success) {
                  totalAssigned += result.summary.total_assigned;
                  totalFailed += result.summary.total_failed;
                  results.push({ stage: stage.name, success: true, ...result.summary });
                }
              } catch (error: any) {
                console.error(`[AUTO-ASSIGN] Error for stage ${stage.name}:`, error);
                results.push({ stage: stage.name, success: false, error: error.message });
                totalFailed++;
              }
            }

            // Recharger les données
            await Promise.all([
              reloadRegistrations(),
              dataService.getBungalows().then(setBungalows)
            ]);

            // Afficher le résumé global
            let message = `✅ Assignation automatique terminée pour ${upcomingStages.length} événement(s) !\n\n`;
            message += `✔ ${totalAssigned} participant(s) assigné(s) au total\n`;
            if (totalFailed > 0) {
              message += `✖ ${totalFailed} échec(s)\n`;
            }

            showAlert('success', message);
          } catch (error: any) {
            console.error('[AUTO-ASSIGN-ALL] Error:', error);
            const errorMsg = error.message || error.data?.error || 'Erreur lors de l\'assignation automatique';
            showAlert('error', `❌ ${errorMsg}`);
          } finally {
            setLoading(false);
          }
        }
      });
      return;
    }

    // Cas d'un événement spécifique
    const stageId = parseInt(selectedStage);
    const stage = stages.find(s => s.id === stageId);

    if (!stage) {
      showAlert('error', 'Événement introuvable');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Assignation automatique',
      message: `Lancer l'assignation automatique pour l'événement "${stage.name}" ?\n\nCela assignera automatiquement tous les participants non assignés aux bungalows disponibles.`,
      type: 'info',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        setLoading(true);
        try {
          const result = await apiService.autoAssignStageParticipants(stageId);

      if (result.success) {
        const { summary, assignments, failures } = result;

        // Recharger les données
        await Promise.all([
          reloadRegistrations(),
          dataService.getBungalows().then(setBungalows)
        ]);

        // Afficher le résumé
        let message = `✅ Assignation automatique terminée !\n\n`;
        message += `✔ ${summary.total_assigned} participant(s) assigné(s)\n`;
        if (summary.total_failed > 0) {
          message += `✖ ${summary.total_failed} échec(s)\n`;
        }
        message += `\nTaux de réussite: ${summary.success_rate}%`;

        showAlert('success', message);

        // Afficher les échecs en détail si présents
        if (failures.length > 0) {
          console.log('Échecs d\'assignation:', failures);
        }
      } else {
        showAlert('error', result.error || 'Erreur lors de l\'assignation automatique');
      }
    } catch (error: any) {
      console.error('[AUTO-ASSIGN] Error:', error);
      const errorMsg = error.message || error.data?.error || 'Erreur lors de l\'assignation automatique';
      showAlert('error', `❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
        }
      });
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
          <div className="form-group" style={{marginBottom: 0, position: 'relative'}}>
            <label htmlFor="startDate" style={{marginRight: '0.5rem'}}>Date Début:</label>
            <div style={{position: 'relative', display: 'inline-block'}}>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatesInitialized(true);
                }}
                style={{padding: '0.5rem', paddingRight: startDate ? '2rem' : '0.5rem', borderRadius: '4px', border: '1px solid #ddd'}}
              />
              {startDate && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    if (!endDate) {
                      setDatesInitialized(false);
                      apiService.getUnassignedRegistrations().then((data) => {
                        const regData = Array.isArray(data) ? data : (data.registrations || data.results || []);
                        setRegistrations(regData);
                        filterRegistrations(regData, selectedStage);
                      });
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: '0.3rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    color: '#999',
                    fontSize: '0.9rem'
                  }}
                  title="Effacer la date de début"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>
          </div>
          <div className="form-group" style={{marginBottom: 0, position: 'relative'}}>
            <label htmlFor="endDate" style={{marginRight: '0.5rem'}}>Date Fin:</label>
            <div style={{position: 'relative', display: 'inline-block'}}>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatesInitialized(true);
                }}
                style={{padding: '0.5rem', paddingRight: endDate ? '2rem' : '0.5rem', borderRadius: '4px', border: '1px solid #ddd'}}
              />
              {endDate && (
                <button
                  type="button"
                  onClick={() => {
                    setEndDate('');
                    if (!startDate) {
                      setDatesInitialized(false);
                      apiService.getUnassignedRegistrations().then((data) => {
                        const regData = Array.isArray(data) ? data : (data.registrations || data.results || []);
                        setRegistrations(regData);
                        filterRegistrations(regData, selectedStage);
                      });
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: '0.3rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    color: '#999',
                    fontSize: '0.9rem'
                  }}
                  title="Effacer la date de fin"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>
          </div>
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
            <button
              className="btn btn-secondary"
              onClick={handleAutoAssign}
              disabled={loading}
              title={selectedStage === 'all' ? 'Assigner automatiquement tous les événements à venir' : 'Assigner automatiquement les participants de cet événement'}
            >
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
            <div
              className="overview-card"
              onClick={() => {
                if (bungalowsWithConflicts.length > 0) {
                  setShowOnlyConflicts(!showOnlyConflicts);
                }
              }}
              style={{
                cursor: bungalowsWithConflicts.length > 0 ? 'pointer' : 'default',
                border: showOnlyConflicts ? '2px solid #D32F2F' : undefined,
                transform: showOnlyConflicts ? 'scale(1.02)' : undefined,
                transition: 'all 0.2s'
              }}
              title={bungalowsWithConflicts.length > 0 ? "Cliquer pour filtrer les bungalows avec conflits" : "Aucun conflit"}
            >
              <div className="card-icon" style={{ backgroundColor: bungalowsWithConflicts.length > 0 ? '#D32F2F' : undefined }}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="card-content">
                <h3>{bungalowsWithConflicts.length}</h3>
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
            <h3>
              Bungalows
              {showOnlyConflicts && (
                <span style={{
                  marginLeft: '1rem',
                  fontSize: '0.85rem',
                  color: '#D32F2F',
                  fontWeight: '500',
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(211, 47, 47, 0.3)'
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                  Affichage des conflits uniquement
                </span>
              )}
            </h3>
            <div className="villages-container">
              {(['A', 'B', 'C'] as const).map((village) => {
                let villageBungalows = bungalows.filter(b => b.village === village);

                // Filtrer pour afficher uniquement les bungalows avec conflits si l'option est activée
                if (showOnlyConflicts) {
                  villageBungalows = villageBungalows.filter(bungalow =>
                    bungalow.beds?.some(bed =>
                      bed.occupiedBy && typeof bed.occupiedBy === 'object' && bed.occupiedBy.wasForced
                    )
                  );
                }

                // Ne pas afficher le village s'il n'a aucun bungalow à afficher
                if (villageBungalows.length === 0) return null;

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
                                {status === 'empty' ? 'Libre' :
                                 status === 'full' ? 'Complet' :
                                 status === 'forced' ? 'Conflit' :
                                 'Partiel'}
                              </span>
                            </div>
                            <div className="bungalow-assignment-details">
                              <div className="occupancy-info">
                                <i className="fas fa-bed"></i>
                                <span>{occupancy}</span>
                              </div>
                              <div className="assigned-participants">
                                {occupants.map((occupant, idx) => (
                                  <div key={idx} style={{
                                    padding: '0.75rem',
                                    marginBottom: '0.5rem',
                                    backgroundColor: occupant.wasForced ? 'rgba(211, 47, 47, 0.02)' : 'white',
                                    borderRadius: '8px',
                                    border: occupant.wasForced ? '2px solid rgba(211, 47, 47, 0.3)' : '1px solid #E5E7EB',
                                    boxShadow: occupant.wasForced ? '0 2px 8px rgba(211, 47, 47, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
                                  }}>
                                    {/* Indicateur de conflit */}
                                    {occupant.wasForced && (
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem',
                                        marginBottom: '0.5rem',
                                        backgroundColor: 'rgba(211, 47, 47, 0.1)',
                                        border: '1px solid rgba(211, 47, 47, 0.2)',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        color: '#B91C1C',
                                        fontWeight: '600'
                                      }}>
                                        <i className="fas fa-exclamation-triangle" style={{ fontSize: '0.9rem' }}></i>
                                        <span>Assignation forcée (conflit accepté)</span>
                                      </div>
                                    )}
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
                                            padding: '4px',
                                            fontSize: '0.9rem'
                                          }}
                                        >
                                          <i className="fas fa-times"></i>
                                        </button>
                                      )}
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
              {showOnlyConflicts && bungalowsWithConflicts.length === 0 && (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#059669',
                  backgroundColor: '#ECFDF5',
                  borderRadius: '12px',
                  border: '2px solid #10B981',
                  margin: '1rem'
                }}>
                  <i className="fas fa-check-circle" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
                  <h3 style={{ marginBottom: '0.5rem', color: '#047857' }}>Aucun conflit détecté</h3>
                  <p style={{ margin: 0, color: '#065F46' }}>Toutes les assignations ont été effectuées sans conflit.</p>
                </div>
              )}
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmModal.type}
        confirmText="Confirmer"
        cancelText="Annuler"
      />

      {/* Warning Modal pour les règles d'assignation */}
      {warningModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1001 }}>
          <div className="modal" style={{ maxWidth: '550px' }}>
            <div className="modal-content" style={{ padding: '0' }}>
              {/* Header */}
              <div className="modal-header" style={{
                padding: '1.5rem',
                borderBottom: '1px solid #E5E7EB',
                backgroundColor: '#FEF3C7'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#FCD34D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-exclamation-triangle" style={{ color: '#92400E', fontSize: '1.25rem' }}></i>
                  </div>
                  <h3 style={{ margin: 0, color: '#92400E', fontSize: '1.1rem', fontWeight: '600' }}>
                    Confirmation requise
                  </h3>
                </div>
                <button
                  onClick={() => setWarningModal(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '1rem',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: '#92400E',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem' }}>
                <div style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FCD34D',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{
                    margin: 0,
                    color: '#78350F',
                    fontSize: '0.95rem',
                    lineHeight: '1.5'
                  }}>
                    {warningModal.message}
                  </p>
                </div>

                <div style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <p style={{
                    margin: 0,
                    color: '#7F1D1D',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                    Êtes-vous sûr de vouloir continuer malgré cet avertissement ?
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
                backgroundColor: '#F9FAFB'
              }}>
                <button
                  onClick={() => setWarningModal(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                >
                  <i className="fas fa-times" style={{ marginRight: '0.5rem' }}></i>
                  Annuler
                </button>
                <button
                  onClick={warningModal.onConfirm}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F59E0B'}
                >
                  <i className="fas fa-check" style={{ marginRight: '0.5rem' }}></i>
                  Oui, continuer quand même
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
