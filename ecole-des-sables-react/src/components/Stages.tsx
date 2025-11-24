import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage } from '../types/Stage';
import dataService from '../services/dataService';
import PageHeader from './PageHeader';
import ConfirmationModal from './ConfirmationModal';
import ExcelImportModal from './ExcelImportModal';

const Stages: React.FC = () => {
  const navigate = useNavigate();
  const [stages, setStages] = useState<Stage[]>([]);
  const [statusFilter, setStatusFilter] = useState('upcoming_active'); // Par défaut: stages à venir et en cours
  const [eventTypeFilter, setEventTypeFilter] = useState('all'); // Filtre par type d'événement
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [deletingStage, setDeletingStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);
  const [capacityConflicts, setCapacityConflicts] = useState<Array<{
    eventName: string;
    eventId: number;
    warning: Stage['warning'];
    timestamp: Date;
  }>>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    // Les warnings restent affichés 10 secondes, les autres messages 4 secondes
    const timeout = type === 'warning' ? 10000 : 4000;
    setTimeout(() => {
      setAlert(null);
    }, timeout);
  };

  const loadStages = useCallback(async () => {
    setLoading(true);
    try {
      const stagesData = await dataService.getStages({ 
        status: statusFilter === 'all' ? undefined : statusFilter 
      });
      setStages(stagesData);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors du chargement des événements');
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
      const response = await dataService.addStage(stageData);
      await loadStages();
      setShowCreateModal(false);

      // Vérifier si un warning de capacité est présent
      if (response.warning) {
        // Ajouter le conflit à la liste permanente
        setCapacityConflicts(prev => [{
          eventName: response.name,
          eventId: response.id,
          warning: response.warning,
          timestamp: new Date()
        }, ...prev]);

        showAlert('warning', response.warning.message);
      } else {
        showAlert('success', `Événement "${response.name}" créé avec succès`);
      }
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de la création de l\'événement');
    } finally {
      setLoading(false);
    }
  };

  const removeConflict = (eventId: number) => {
    setCapacityConflicts(prev => prev.filter(c => c.eventId !== eventId));
  };

  const handleEditStage = async (id: number, updates: Partial<Stage>) => {
    try {
      setLoading(true);
      const updatedStage = await dataService.updateStage(id, updates);
      await loadStages();
      setEditingStage(null);
      showAlert('success', `Événement "${updatedStage.name}" modifié avec succès`);
    } catch (error: any) {
      let errorMessage = error.message || 'Erreur lors de la modification de l\'événement';
      
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
        showAlert('warning', `Impossible de supprimer l'événement "${stage.name}" car il contient ${participants.length} participant(s). Veuillez d'abord supprimer ou réassigner les participants.`);
        return;
      }

      await dataService.deleteStage(stage.id);
      await loadStages();
      setDeletingStage(null);
      showAlert('success', `Événement "${stage.name}" supprimé avec succès`);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de la suppression de l\'événement');
    } finally {
      setLoading(false);
    }
  };

  const filteredStages = stages.filter(stage => {
    const status = getStatusClass(stage);

    // Filtre par statut
    let matchesStatus = false;
    switch (statusFilter) {
      case 'upcoming_active':
        matchesStatus = status === 'upcoming' || status === 'active';
        break;
      case 'upcoming':
        matchesStatus = status === 'upcoming';
        break;
      case 'active':
        matchesStatus = status === 'active';
        break;
      case 'completed':
        matchesStatus = status === 'completed';
        break;
      case 'all':
      default:
        matchesStatus = true;
    }

    // Filtre par type d'événement
    const matchesEventType = eventTypeFilter === 'all' || stage.eventType === eventTypeFilter;

    return matchesStatus && matchesEventType;
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

      <PageHeader title="Événements">
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
            <option value="all">Tous les événements</option>
          </select>
          <select
            className="filter-select"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
          >
            <option value="all">Tous les types</option>
            <option value="stage">Stage</option>
            <option value="resident">Résident</option>
            <option value="autres">Autres</option>
          </select>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
          <i className="fas fa-file-excel"></i>
          Import Excel
        </button>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <i className="fas fa-plus"></i>
          Nouvel Événement
        </button>
      </PageHeader>

      {/* Section Conflits de Capacité */}
      {capacityConflicts.length > 0 && (
        <div className="capacity-conflicts-section">
          <div className="conflicts-header">
            <h2>
              <i className="fas fa-exclamation-triangle"></i>
              Conflits de Capacité ({capacityConflicts.length})
            </h2>
            <p>Les événements suivants dépassent la capacité disponible des chambres</p>
          </div>
          <div className="conflicts-list">
            {capacityConflicts.map((conflict, index) => (
              <div key={index} className="conflict-card">
                <div className="conflict-header">
                  <div className="conflict-title">
                    <i className="fas fa-calendar-alt"></i>
                    <h3>{conflict.eventName}</h3>
                  </div>
                  <button
                    className="conflict-dismiss"
                    onClick={() => removeConflict(conflict.eventId)}
                    title="Ignorer cet avertissement"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="conflict-details">
                  <div className="conflict-stats">
                    <div className="conflict-stat">
                      <i className="fas fa-bed"></i>
                      <span>
                        <strong>{conflict.warning?.rooms_needed || 0}</strong>
                        <small>Chambres nécessaires</small>
                      </span>
                    </div>
                    <div className="conflict-stat">
                      <i className="fas fa-layer-group"></i>
                      <span>
                        <strong>{conflict.warning?.overlapping_events || 0}</strong>
                        <small>Événements superposés</small>
                      </span>
                    </div>
                    <div className="conflict-stat">
                      <i className="fas fa-chart-line"></i>
                      <span>
                        <strong>{conflict.warning?.total_rooms_used || 0}</strong>
                        <small>Total chambres utilisées</small>
                      </span>
                    </div>
                    <div className="conflict-stat">
                      <i className="fas fa-home"></i>
                      <span>
                        <strong>{conflict.warning?.total_available || 0}</strong>
                        <small>Chambres disponibles</small>
                      </span>
                    </div>
                    <div className="conflict-stat deficit">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>
                        <strong>{conflict.warning?.deficit || 0}</strong>
                        <small>Dépassement</small>
                      </span>
                    </div>
                  </div>
                  <div className="conflict-message">
                    <i className="fas fa-info-circle"></i>
                    <p>
                      Vous devrez ajuster les assignations ou réduire le nombre de participants
                      pour respecter la capacité des chambres disponibles.
                    </p>
                  </div>
                  <div className="conflict-timestamp">
                    <i className="fas fa-clock"></i>
                    <small>Créé le {conflict.timestamp.toLocaleString('fr-FR')}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiques rapides - Thème blanc sobre */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        padding: '0 1.5rem',
        marginBottom: '1.5rem'
      }}>
        {[
          {
            label: 'Total',
            value: stages.length,
            icon: 'fas fa-calendar-alt',
            color: '#6B7280',
            bg: '#F9FAFB',
            subtext: 'événements'
          },
          {
            label: 'En cours',
            value: stages.filter(s => getStatusClass(s) === 'active').length,
            icon: 'fas fa-play-circle',
            color: '#10B981',
            bg: '#ECFDF5',
            subtext: 'actifs maintenant'
          },
          {
            label: 'À venir',
            value: stages.filter(s => getStatusClass(s) === 'upcoming').length,
            icon: 'fas fa-clock',
            color: '#DC2626',
            bg: '#FEF2F2',
            subtext: 'programmés'
          },
          {
            label: 'Terminés',
            value: stages.filter(s => getStatusClass(s) === 'completed').length,
            icon: 'fas fa-check-circle',
            color: '#6366F1',
            bg: '#EEF2FF',
            subtext: 'accomplis'
          }
        ].map((stat, idx) => (
          <div key={idx} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #F3F4F6'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: stat.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className={stat.icon} style={{ color: stat.color, fontSize: '1.25rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1F2937' }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{stat.label} • {stat.subtext}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grille des événements - Design Premium */}
      <div style={{ padding: '0 1.5rem' }}>
        {filteredStages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'linear-gradient(135deg, #FAFBFC 0%, #F1F5F9 100%)',
            borderRadius: '24px',
            border: '2px dashed #E2E8F0'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-calendar-plus" style={{ fontSize: '2rem', color: '#94A3B8' }}></i>
            </div>
            <h3 style={{ color: '#475569', marginBottom: '0.5rem', fontWeight: '600' }}>Aucun événement</h3>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Créez votre premier événement pour commencer</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.25rem'
          }}>
            {filteredStages.map((stage) => {
              const statusClass = getStatusClass(stage);
              const fillRate = Math.round((stage.currentParticipants / stage.capacity) * 100);
              const startDate = new Date(stage.startDate);
              const endDate = new Date(stage.endDate);
              const now = new Date();
              const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
              const daysUntilStart = Math.max(0, Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
              const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              const daysElapsed = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
              const timeProgress = statusClass === 'completed' ? 100 : statusClass === 'upcoming' ? 0 : Math.min(100, Math.round((daysElapsed / totalDays) * 100));

              // Thèmes sobres selon le statut - Style blanc avec accents subtils
              const themes: Record<string, any> = {
                active: {
                  headerBg: '#ECFDF5',
                  headerBorder: '2px solid #A7F3D0',
                  glow: '0 8px 24px rgba(16, 185, 129, 0.12)',
                  accent: '#10B981',
                  light: '#ECFDF5',
                  badge: { bg: '#10B981', text: 'white' }
                },
                upcoming: {
                  headerBg: '#FEF2F2',
                  headerBorder: '2px solid #FECACA',
                  glow: '0 8px 24px rgba(220, 38, 38, 0.12)',
                  accent: '#DC2626',
                  light: '#FEF2F2',
                  badge: { bg: '#DC2626', text: 'white' }
                },
                completed: {
                  headerBg: '#F9FAFB',
                  headerBorder: '2px solid #E5E7EB',
                  glow: '0 4px 16px rgba(107, 114, 128, 0.1)',
                  accent: '#6B7280',
                  light: '#F9FAFB',
                  badge: { bg: '#6B7280', text: 'white' }
                }
              };

              const typeIcons: Record<string, { icon: string; label: string }> = {
                stage: { icon: 'fas fa-theater-masks', label: 'Stage' },
                resident: { icon: 'fas fa-home', label: 'Résidence' },
                autres: { icon: 'fas fa-sparkles', label: 'Événement' }
              };

              const theme = themes[statusClass];
              const typeInfo = typeIcons[stage.eventType || 'stage'];

              return (
                <div
                  key={stage.id}
                  onClick={() => navigate(`/stages/${stage.id}`)}
                  style={{
                    background: 'white',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = theme.glow;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)';
                  }}
                >
                  {/* Header sobre */}
                  <div style={{
                    background: theme.headerBg,
                    padding: '1rem 1.25rem',
                    borderBottom: theme.headerBorder
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Badges */}
                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            background: 'white',
                            border: `1px solid ${theme.accent}30`,
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            color: theme.accent
                          }}>
                            <i className={typeInfo.icon} style={{ fontSize: '0.6rem' }}></i>
                            {typeInfo.label}
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            background: theme.badge.bg,
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            color: 'white',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {statusClass === 'active' && (
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: 'white',
                                animation: 'pulse-dot 1.5s ease-in-out infinite'
                              }}></span>
                            )}
                            {statusClass === 'active' ? 'En cours' : statusClass === 'upcoming' ? 'À venir' : 'Terminé'}
                          </span>
                        </div>

                        {/* Titre */}
                        <h3 style={{
                          margin: 0,
                          fontSize: '1.05rem',
                          fontWeight: '700',
                          color: '#1F2937',
                          lineHeight: 1.3
                        }}>
                          {stage.name}
                        </h3>
                      </div>

                      {/* Indicateur circulaire de remplissage */}
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: `conic-gradient(${theme.accent} ${fillRate * 3.6}deg, #E5E7EB ${fillRate * 3.6}deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: theme.accent }}>{fillRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corps */}
                  <div style={{ padding: '1rem 1.25rem' }}>
                    {/* Timeline */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                      padding: '0.6rem 0.75rem',
                      background: 'white',
                      border: '1px solid #F3F4F6',
                      borderRadius: '12px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: theme.accent }}>{startDate.getDate()}</div>
                        <div style={{ fontSize: '0.6rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                          {startDate.toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{
                          height: '4px',
                          background: '#E5E7EB',
                          borderRadius: '2px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${timeProgress}%`,
                            background: theme.accent,
                            borderRadius: '2px',
                            transition: 'width 0.5s ease'
                          }}></div>
                        </div>
                        <div style={{
                          textAlign: 'center',
                          fontSize: '0.65rem',
                          color: theme.accent,
                          fontWeight: '600',
                          marginTop: '0.25rem'
                        }}>
                          {statusClass === 'upcoming' ? `Dans ${daysUntilStart} jour${daysUntilStart > 1 ? 's' : ''}` :
                           statusClass === 'completed' ? 'Terminé' :
                           `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`}
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: theme.accent }}>{endDate.getDate()}</div>
                        <div style={{ fontSize: '0.6rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                          {endDate.toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                      </div>
                    </div>

                    {/* Encadrant */}
                    {stage.instructor && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <i className="fas fa-user" style={{ fontSize: '0.65rem', color: 'white' }}></i>
                        </div>
                        <span style={{
                          fontSize: '0.8rem',
                          color: '#374151',
                          fontWeight: '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {stage.instructor}
                        </span>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{
                        textAlign: 'center',
                        padding: '0.5rem',
                        background: '#F8FAFC',
                        borderRadius: '10px'
                      }}>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1F2937' }}>{stage.currentParticipants}</div>
                        <div style={{ fontSize: '0.6rem', color: '#6B7280', fontWeight: '500' }}>Inscrits</div>
                      </div>
                      <div style={{
                        textAlign: 'center',
                        padding: '0.5rem',
                        background: '#ECFDF5',
                        borderRadius: '10px'
                      }}>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10B981' }}>{stage.assignedParticipantsCount || 0}</div>
                        <div style={{ fontSize: '0.6rem', color: '#6B7280', fontWeight: '500' }}>Assignés</div>
                      </div>
                      <div style={{
                        textAlign: 'center',
                        padding: '0.5rem',
                        background: '#FEF3C7',
                        borderRadius: '10px'
                      }}>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#F59E0B' }}>{stage.assignedBungalowsCount || 0}</div>
                        <div style={{ fontSize: '0.6rem', color: '#6B7280', fontWeight: '500' }}>Bungalows</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #F1F5F9'
                    }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/stages/${stage.id}`)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          padding: '0.6rem',
                          background: 'white',
                          color: theme.accent,
                          border: `2px solid ${theme.accent}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = theme.light;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                        }}
                      >
                        <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }}></i>
                        Détails
                      </button>
                      <button
                        onClick={() => setEditingStage(stage)}
                        style={{
                          width: '38px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#F1F5F9',
                          color: '#64748B',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontSize: '0.75rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#3B82F6';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#F1F5F9';
                          e.currentTarget.style.color = '#64748B';
                        }}
                      >
                        <i className="fas fa-pen"></i>
                      </button>
                      <button
                        onClick={() => setDeletingStage(stage)}
                        style={{
                          width: '38px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#FEF2F2',
                          color: '#EF4444',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontSize: '0.75rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#EF4444';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#FEF2F2';
                          e.currentTarget.style.color = '#EF4444';
                        }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>

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
            title="Supprimer l'événement"
            message={`Êtes-vous sûr de vouloir supprimer l'événement "${deletingStage.name}" ? Cette action est irréversible.`}
            confirmText="Supprimer"
            type="danger"
            isLoading={loading}
          />
        )}

        {showImportModal && (
          <ExcelImportModal
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              loadStages();
              showAlert('success', 'Import Excel terminé avec succès');
            }}
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
    eventType: 'stage' as 'stage' | 'resident' | 'autres',
    instructor: '',
    instructor2: '',
    instructor3: '',
    musiciansCount: 0,
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
          <h3>Nouvel Événement</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="stageName">Nom de l'Événement</label>
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
              <label htmlFor="eventType">Type d'événement</label>
              <select
                id="eventType"
                value={formData.eventType}
                onChange={(e) => setFormData({...formData, eventType: e.target.value as 'stage' | 'resident' | 'autres'})}
                required
              >
                <option value="stage">Stage</option>
                <option value="resident">Résident</option>
                <option value="autres">Autres</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="instructor">Encadrant Principal</label>
              <input
                type="text"
                id="instructor"
                placeholder="Nom de l'encadrant"
                value={formData.instructor}
                onChange={(e) => setFormData({...formData, instructor: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label htmlFor="instructor2">Encadrant 2 (optionnel)</label>
              <input
                type="text"
                id="instructor2"
                placeholder="Nom de l'encadrant 2"
                value={formData.instructor2}
                onChange={(e) => setFormData({...formData, instructor2: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label htmlFor="instructor3">Encadrant 3 (optionnel)</label>
              <input
                type="text"
                id="instructor3"
                placeholder="Nom de l'encadrant 3"
                value={formData.instructor3}
                onChange={(e) => setFormData({...formData, instructor3: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label htmlFor="musiciansCount">Nombre de musiciens</label>
              <input
                type="number"
                id="musiciansCount"
                placeholder="Nombre de musiciens"
                value={formData.musiciansCount}
                onChange={(e) => setFormData({...formData, musiciansCount: parseInt(e.target.value)})}
                min="0"
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
                Créer l'Événement
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
    eventType: stage.eventType || 'stage' as 'stage' | 'resident' | 'autres',
    instructor: stage.instructor || '',
    instructor2: stage.instructor2 || '',
    instructor3: stage.instructor3 || '',
    musiciansCount: stage.musiciansCount || 0,
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
          <h3>Modifier l'Événement</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="stageName">Nom de l'Événement</label>
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
              <label htmlFor="eventType">Type d'événement</label>
              <select
                id="eventType"
                value={formData.eventType}
                onChange={(e) => setFormData({...formData, eventType: e.target.value as 'stage' | 'resident' | 'autres'})}
                required
              >
                <option value="stage">Stage</option>
                <option value="resident">Résident</option>
                <option value="autres">Autres</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="instructor">Encadrant Principal</label>
              <input
                type="text"
                id="instructor"
                placeholder="Nom de l'encadrant"
                value={formData.instructor}
                onChange={(e) => setFormData({...formData, instructor: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label htmlFor="instructor2">Encadrant 2 (optionnel)</label>
              <input
                type="text"
                id="instructor2"
                placeholder="Nom de l'encadrant 2"
                value={formData.instructor2}
                onChange={(e) => setFormData({...formData, instructor2: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label htmlFor="instructor3">Encadrant 3 (optionnel)</label>
              <input
                type="text"
                id="instructor3"
                placeholder="Nom de l'encadrant 3"
                value={formData.instructor3}
                onChange={(e) => setFormData({...formData, instructor3: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label htmlFor="musiciansCount">Nombre de musiciens</label>
              <input
                type="number"
                id="musiciansCount"
                placeholder="Nombre de musiciens"
                value={formData.musiciansCount}
                onChange={(e) => setFormData({...formData, musiciansCount: parseInt(e.target.value)})}
                min="0"
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
                Modifier l'Événement
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Stages;
