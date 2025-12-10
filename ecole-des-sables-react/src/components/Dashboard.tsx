import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import PageHeader from './PageHeader';
import AlertModal from './AlertModal';

// Types pour les statistiques du dashboard
interface DashboardStats {
  overview: {
    totalEvents: number;
    activeEvents: number;
    upcomingEvents: number;
    pastEvents: number;
    totalParticipants: number;
    newParticipantsThisMonth: number;
    totalBungalows: number;
    occupiedBungalows: number;
    totalBedCapacity: number;
  };
  events: {
    byType: {
      stages: number;
      residences: number;
      autres: number;
    };
    active: Array<{
      id: number;
      name: string;
      type: string;
      startDate: string;
      endDate: string;
      capacity: number;
      registrations: number;
      assigned: number;
      daysRemaining: number;
      fillRate: number;
      instructor: string;
    }>;
    upcoming: Array<{
      id: number;
      name: string;
      type: string;
      startDate: string;
      endDate: string;
      capacity: number;
      registrations: number;
      daysUntil: number;
      fillRate: number;
    }>;
  };
  participants: {
    byStatus: {
      students: number;
      instructors: number;
      professionals: number;
      staff: number;
    };
    byGender: {
      men: number;
      women: number;
    };
    averageAge: number;
    topNationalities: Array<{ nationality: string; count: number }>;
    topLanguages: Array<{ name: string; code: string; count: number }>;
  };
  registrations: {
    activeTotal: number;
    assigned: number;
    unassigned: number;
    byRole: {
      participants: number;
      instructors: number;
      musicians: number;
      staff: number;
    };
  };
  villages: Array<{
    id: number;
    name: string;
    bungalowCount: number;
    totalCapacity: number;
    currentOccupants: number;
    occupancyRate: number;
  }>;
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    eventId?: number;
  }>;
  recentActivities: Array<{
    id: number;
    actionType: string;
    entityType: string;
    entityName: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
  trends: {
    participantsTrend: number;
    eventsTrend: number;
    newParticipantsThisMonth: number;
    newParticipantsLastMonth: number;
    eventsThisMonth: number;
    eventsLastMonth: number;
  };
  lastUpdated: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [networkInfo, setNetworkInfo] = useState<{ ip: string; url: string } | null>(null);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'info' | 'warning' | 'error' }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  // Charger les statistiques
  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDashboardStats();
      setStats(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  // Récupérer l'IP réseau depuis le backend
  const fetchNetworkInfo = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/network-info/');
      if (response.ok) {
        const data = await response.json();
        if (data.local_ip && data.local_ip !== '127.0.0.1') {
          setNetworkInfo({
            ip: data.local_ip,
            url: `http://${data.local_ip}:3000`
          });
        }
      }
    } catch (err) {
      // Pas d'erreur si l'endpoint n'existe pas encore
      console.log('Network info not available');
    }
  };

  useEffect(() => {
    loadStats();
    fetchNetworkInfo();
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(() => {
      loadStats();
      fetchNetworkInfo();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Formater la date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Formater le temps relatif
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  // Icône selon le type d'action
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create': return 'fas fa-plus-circle';
      case 'update': return 'fas fa-edit';
      case 'delete': return 'fas fa-trash';
      case 'assign': return 'fas fa-link';
      case 'unassign': return 'fas fa-unlink';
      default: return 'fas fa-circle';
    }
  };

  // Couleur selon le type d'action
  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create': return '#10B981';
      case 'update': return '#3B82F6';
      case 'delete': return '#EF4444';
      case 'assign': return '#8B5CF6';
      case 'unassign': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  // Couleur selon la sévérité de l'alerte
  const getAlertStyles = (severity: string) => {
    switch (severity) {
      case 'warning':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icon: 'fas fa-exclamation-triangle' };
      case 'error':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#B91C1C', icon: 'fas fa-times-circle' };
      case 'info':
        return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', icon: 'fas fa-info-circle' };
      default:
        return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151', icon: 'fas fa-bell' };
    }
  };

  // Couleur pour le type d'événement
  const getEventTypeStyle = (type: string) => {
    switch (type) {
      case 'stage':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Stage' };
      case 'resident':
        return { bg: '#D1FAE5', text: '#166534', label: 'Résidence' };
      default:
        return { bg: '#FEF3C7', text: '#92400E', label: 'Autres' };
    }
  };

  // Couleur pour le taux de remplissage
  const getFillRateColor = (rate: number) => {
    if (rate >= 90) return '#EF4444';
    if (rate >= 70) return '#F59E0B';
    if (rate >= 50) return '#10B981';
    return '#6B7280';
  };

  if (loading && !stats) {
    return (
      <>
        <PageHeader title="Tableau de Bord" />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          color: '#6B7280'
        }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginRight: '1rem' }}></i>
          Chargement des statistiques...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Tableau de Bord" />
        <div style={{
          backgroundColor: '#FEE2E2',
          borderRadius: '12px',
          padding: '2rem',
          margin: '1.5rem',
          textAlign: 'center',
          color: '#B91C1C'
        }}>
          <i className="fas fa-exclamation-circle" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
          <p>{error}</p>
          <button
            onClick={loadStats}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Réessayer
          </button>
        </div>
      </>
    );
  }

  if (!stats) return null;

  return (
    <>
      <PageHeader title="Tableau de Bord" />

      <div style={{ padding: '1.5rem', backgroundColor: '#F9FAFB', minHeight: 'calc(100vh - 100px)' }}>
        {/* Header avec dernière mise à jour */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ margin: 0, color: '#1F2937', fontSize: '1.5rem' }}>
              Vue d'ensemble
            </h2>
            {loading && (
              <i className="fas fa-sync fa-spin" style={{ color: '#6366F1' }}></i>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
              <i className="fas fa-clock" style={{ marginRight: '0.3rem' }}></i>
              Mise à jour: {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={loadStats}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6366F1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem'
              }}
            >
              <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i>
              Actualiser
            </button>
          </div>
        </div>

        {/* Info d'accès réseau - Afficher si machine connectée à un réseau WiFi */}
        {networkInfo && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            border: '2px solid #6366F1',
            boxShadow: '0 4px 6px rgba(99, 102, 241, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                backgroundColor: '#EEF2FF',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-wifi" style={{ fontSize: '1.5rem', color: '#6366F1' }}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                  Serveur accessible sur le réseau WiFi
                </div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1F2937',
                  fontFamily: 'monospace'
                }}>
                  {networkInfo.url}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  IP du serveur: {networkInfo.ip}
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(networkInfo.url);
                    setAlertModal({
                      isOpen: true,
                      message: 'URL copiée dans le presse-papiers !',
                      type: 'success'
                    });
                  } catch (err) {
                    console.error('Erreur lors de la copie:', err);
                    setAlertModal({
                      isOpen: true,
                      message: 'Erreur lors de la copie. Veuillez réessayer.',
                      type: 'error'
                    });
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6366F1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem'
                }}
                title="Copier l'URL"
              >
                <i className="fas fa-copy"></i>
                Copier
              </button>
            </div>
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #E5E7EB',
              fontSize: '0.75rem',
              color: '#6B7280'
            }}>
              <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
              Partagez cette URL avec d'autres appareils pour qu'ils accèdent à l'application
            </div>
          </div>
        )}

        {/* Alertes */}
        {stats.alerts.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            {stats.alerts.map((alert, index) => {
              const alertStyle = getAlertStyles(alert.severity);
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: alertStyle.bg,
                    borderLeft: `4px solid ${alertStyle.border}`,
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: alertStyle.text
                  }}
                >
                  <i className={alertStyle.icon}></i>
                  <span style={{ flex: 1 }}>{alert.message}</span>
                  {alert.eventId && (
                    <button
                      onClick={() => navigate(`/stages/${alert.eventId}`)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'transparent',
                        border: `1px solid ${alertStyle.border}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: alertStyle.text,
                        fontSize: '0.8rem'
                      }}
                    >
                      Voir
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Cartes de statistiques principales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Événements actifs */}
          <div style={{
            background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              right: '-20px',
              top: '-20px',
              fontSize: '6rem',
              opacity: 0.1
            }}>
              <i className="fas fa-calendar-check"></i>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                Événements Actifs
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {stats.overview.activeEvents}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                {stats.overview.upcomingEvents} à venir • {stats.overview.totalEvents} total
              </div>
            </div>
          </div>

          {/* Participants */}
          <div style={{
            background: 'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              right: '-20px',
              top: '-20px',
              fontSize: '6rem',
              opacity: 0.1
            }}>
              <i className="fas fa-users"></i>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                Participants Actifs
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {stats.overview.totalParticipants}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>+{stats.overview.newParticipantsThisMonth} ce mois</span>
                {stats.trends.participantsTrend !== 0 && (
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '10px',
                    fontSize: '0.75rem'
                  }}>
                    <i className={`fas fa-arrow-${stats.trends.participantsTrend > 0 ? 'up' : 'down'}`}></i>
                    {Math.abs(stats.trends.participantsTrend)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Inscriptions en cours */}
          <div style={{
            background: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              right: '-20px',
              top: '-20px',
              fontSize: '6rem',
              opacity: 0.1
            }}>
              <i className="fas fa-clipboard-list"></i>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                Inscriptions Actives
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {stats.registrations.activeTotal}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                {stats.registrations.assigned} assignés • {stats.registrations.unassigned} en attente
              </div>
            </div>
          </div>

          {/* Occupation hébergement */}
          <div style={{
            background: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              right: '-20px',
              top: '-20px',
              fontSize: '6rem',
              opacity: 0.1
            }}>
              <i className="fas fa-home"></i>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                Bungalows Occupés
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {stats.overview.occupiedBungalows}/{stats.overview.totalBungalows}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                {stats.overview.totalBedCapacity} lits disponibles
              </div>
            </div>
          </div>
        </div>

        {/* Section principale: 2 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Colonne gauche */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Timeline des Événements - Design Ingénieux */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '1.5rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background Pattern */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '200px',
                height: '200px',
                background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
                pointerEvents: 'none'
              }}></div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.1rem'
                  }}>
                    <i className="fas fa-stream"></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#1F2937', fontSize: '1.1rem' }}>Timeline des Événements</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                      {stats.events.active.length} en cours • {stats.events.upcoming.length} à venir
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/stages')}
                  style={{
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  Gérer <i className="fas fa-arrow-right"></i>
                </button>
              </div>

              {stats.events.active.length === 0 && stats.events.upcoming.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                  borderRadius: '16px',
                  border: '2px dashed #E2E8F0'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#E2E8F0',
                    margin: '0 auto 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-calendar-plus" style={{ fontSize: '1.5rem', color: '#94A3B8' }}></i>
                  </div>
                  <div style={{ color: '#64748B', fontWeight: '500' }}>Aucun événement programmé</div>
                  <div style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '0.25rem' }}>Créez votre premier événement</div>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '20px' }}>
                  {/* Ligne de Timeline */}
                  <div style={{
                    position: 'absolute',
                    left: '8px',
                    top: '10px',
                    bottom: '10px',
                    width: '3px',
                    background: 'linear-gradient(180deg, #6366F1 0%, #F59E0B 50%, #10B981 100%)',
                    borderRadius: '3px'
                  }}></div>

                  {/* Événements en cours */}
                  {stats.events.active.map((event, index) => {
                    const typeStyle = getEventTypeStyle(event.type);
                    const progressAngle = (event.fillRate / 100) * 360;

                    return (
                      <div
                        key={`active-${event.id}`}
                        onClick={() => navigate(`/stages/${event.id}`)}
                        style={{
                          position: 'relative',
                          marginBottom: '1rem',
                          marginLeft: '1.5rem',
                          cursor: 'pointer'
                        }}
                      >
                        {/* Point de Timeline avec animation pulse */}
                        <div style={{
                          position: 'absolute',
                          left: '-32px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                          border: '3px solid white',
                          boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.2)',
                          zIndex: 2
                        }}></div>

                        {/* Carte de l'événement en cours */}
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
                          borderRadius: '16px',
                          padding: '1.25rem',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateX(8px)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        >
                          {/* Badge EN COURS */}
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.65rem',
                            fontWeight: '600',
                            color: 'white',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: 'white',
                              animation: 'pulse 2s infinite'
                            }}></span>
                            En cours
                          </div>

                          <div style={{ display: 'flex', gap: '1rem' }}>
                            {/* Cercle de progression circulaire */}
                            <div style={{
                              width: '70px',
                              height: '70px',
                              borderRadius: '50%',
                              background: `conic-gradient(${getFillRateColor(event.fillRate)} ${progressAngle}deg, #E5E7EB ${progressAngle}deg)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <div style={{
                                width: '54px',
                                height: '54px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: getFillRateColor(event.fillRate) }}>
                                  {event.fillRate}%
                                </span>
                                <span style={{ fontSize: '0.55rem', color: '#6B7280' }}>rempli</span>
                              </div>
                            </div>

                            {/* Infos événement */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontWeight: '700',
                                  color: '#1F2937',
                                  fontSize: '1rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '200px'
                                }}>
                                  {event.name}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '10px',
                                  backgroundColor: typeStyle.bg,
                                  color: typeStyle.text,
                                  fontWeight: '600'
                                }}>
                                  {typeStyle.label}
                                </span>
                              </div>

                              {/* Métriques en ligne */}
                              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <i className="fas fa-users" style={{ color: '#6366F1', fontSize: '0.75rem' }}></i>
                                  <span style={{ fontSize: '0.8rem', color: '#374151' }}>
                                    <strong>{event.registrations}</strong>/{event.capacity}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <i className="fas fa-check-circle" style={{ color: '#10B981', fontSize: '0.75rem' }}></i>
                                  <span style={{ fontSize: '0.8rem', color: '#374151' }}>
                                    <strong>{event.assigned}</strong> assignés
                                  </span>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  backgroundColor: event.daysRemaining <= 3 ? '#FEE2E2' : '#EEF2FF',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '10px'
                                }}>
                                  <i className="fas fa-hourglass-half" style={{
                                    color: event.daysRemaining <= 3 ? '#DC2626' : '#6366F1',
                                    fontSize: '0.7rem'
                                  }}></i>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: event.daysRemaining <= 3 ? '#DC2626' : '#4338CA'
                                  }}>
                                    {event.daysRemaining}j restant{event.daysRemaining > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Dates */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#6B7280'
                              }}>
                                <i className="fas fa-calendar-alt"></i>
                                <span>{formatDate(event.startDate)}</span>
                                <i className="fas fa-arrow-right" style={{ fontSize: '0.6rem' }}></i>
                                <span>{formatDate(event.endDate)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Séparateur visuel entre en cours et à venir */}
                  {stats.events.active.length > 0 && stats.events.upcoming.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      margin: '1rem 0 1rem 1.5rem',
                      position: 'relative'
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: '-28px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#F59E0B',
                        border: '2px solid white'
                      }}></div>
                      <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, #F59E0B, transparent)' }}></div>
                      <span style={{
                        fontSize: '0.7rem',
                        color: '#F59E0B',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        Prochainement
                      </span>
                      <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, #F59E0B)' }}></div>
                    </div>
                  )}

                  {/* Événements à venir */}
                  {stats.events.upcoming.map((event, index) => {
                    const typeStyle = getEventTypeStyle(event.type);

                    return (
                      <div
                        key={`upcoming-${event.id}`}
                        onClick={() => navigate(`/stages/${event.id}`)}
                        style={{
                          position: 'relative',
                          marginBottom: '0.75rem',
                          marginLeft: '1.5rem',
                          cursor: 'pointer'
                        }}
                      >
                        {/* Point de Timeline */}
                        <div style={{
                          position: 'absolute',
                          left: '-30px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor: '#F59E0B',
                          border: '3px solid white',
                          boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.15)',
                          zIndex: 2
                        }}></div>

                        {/* Carte événement à venir */}
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.05) 100%)',
                          borderRadius: '12px',
                          padding: '1rem 1.25rem',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateX(8px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {/* Countdown Badge */}
                            <div style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                            }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}>{event.daysUntil}</span>
                              <span style={{ fontSize: '0.55rem', fontWeight: '500' }}>JOURS</span>
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: '600', color: '#1F2937' }}>{event.name}</span>
                                <span style={{
                                  fontSize: '0.6rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '8px',
                                  backgroundColor: typeStyle.bg,
                                  color: typeStyle.text,
                                  fontWeight: '500'
                                }}>
                                  {typeStyle.label}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span>
                                  <i className="fas fa-calendar-alt" style={{ marginRight: '0.3rem' }}></i>
                                  {formatDate(event.startDate)}
                                </span>
                                <span>
                                  <i className="fas fa-users" style={{ marginRight: '0.3rem' }}></i>
                                  {event.registrations}/{event.capacity}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Mini barre de progression */}
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: getFillRateColor(event.fillRate) }}>
                              {event.fillRate}%
                            </div>
                            <div style={{
                              width: '60px',
                              height: '4px',
                              backgroundColor: '#E5E7EB',
                              borderRadius: '2px',
                              overflow: 'hidden',
                              marginTop: '0.25rem'
                            }}>
                              <div style={{
                                width: `${Math.min(event.fillRate, 100)}%`,
                                height: '100%',
                                backgroundColor: getFillRateColor(event.fillRate),
                                borderRadius: '2px'
                              }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Style pour l'animation pulse */}
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </div>

            {/* Occupation des villages */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1F2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fas fa-building" style={{ color: '#10B981' }}></i>
                Occupation des Villages
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {stats.villages.map((village) => (
                  <div
                    key={village.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600', color: '#166534' }}>{village.name}</span>
                      <span style={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: village.occupancyRate > 80 ? '#DC2626' : village.occupancyRate > 50 ? '#F59E0B' : '#10B981'
                      }}>
                        {village.occupancyRate}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#15803D', marginBottom: '0.5rem' }}>
                      {village.currentOccupants}/{village.totalCapacity} places • {village.bungalowCount} bungalows
                    </div>
                    <div style={{
                      height: '8px',
                      backgroundColor: '#D1FAE5',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${village.occupancyRate}%`,
                        height: '100%',
                        backgroundColor: village.occupancyRate > 80 ? '#DC2626' : village.occupancyRate > 50 ? '#F59E0B' : '#10B981',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Langues les plus parlées */}
            {stats.participants.topLanguages && stats.participants.topLanguages.length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#1F2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-language" style={{ color: '#DC2626' }}></i>
                  Langues les plus parlées
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {stats.participants.topLanguages.slice(0, 6).map((lang, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        background: index === 0
                          ? 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)'
                          : '#FEF2F2',
                        color: index === 0 ? 'white' : '#991B1B',
                        flex: '1 1 calc(33.333% - 0.5rem)',
                        minWidth: '140px'
                      }}
                    >
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        backgroundColor: index === 0 ? 'rgba(255,255,255,0.2)' : '#FCA5A5',
                        color: index === 0 ? 'white' : '#7F1D1D',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}>
                        {lang.code}
                      </span>
                      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '500' }}>{lang.name}</span>
                      <span style={{
                        fontWeight: '700',
                        fontSize: '1rem'
                      }}>
                        {lang.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Colonne droite */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Répartition des participants */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1F2937', fontSize: '1rem' }}>
                <i className="fas fa-chart-pie" style={{ color: '#8B5CF6', marginRight: '0.5rem' }}></i>
                Répartition
              </h3>

              {/* Genre */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.5rem' }}>Par genre</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{
                    flex: stats.participants.byGender.men,
                    backgroundColor: '#DBEAFE',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <i className="fas fa-mars" style={{ color: '#3B82F6' }}></i>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1E40AF' }}>{stats.participants.byGender.men}</div>
                  </div>
                  <div style={{
                    flex: stats.participants.byGender.women,
                    backgroundColor: '#FCE7F3',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <i className="fas fa-venus" style={{ color: '#EC4899' }}></i>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#BE185D' }}>{stats.participants.byGender.women}</div>
                  </div>
                </div>
              </div>

              {/* Par statut */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.5rem' }}>Par catégorie</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#D1FAE5',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#166534' }}>Élèves</span>
                    <span style={{ fontWeight: '600', color: '#166534' }}>{stats.participants.byStatus.students}</span>
                  </div>
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#FEF3C7',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#92400E' }}>Enseignants</span>
                    <span style={{ fontWeight: '600', color: '#92400E' }}>{stats.participants.byStatus.instructors}</span>
                  </div>
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#E0E7FF',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#3730A3' }}>Pro.</span>
                    <span style={{ fontWeight: '600', color: '#3730A3' }}>{stats.participants.byStatus.professionals}</span>
                  </div>
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#F3E8FF',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#6B21A8' }}>Staff</span>
                    <span style={{ fontWeight: '600', color: '#6B21A8' }}>{stats.participants.byStatus.staff}</span>
                  </div>
                </div>
              </div>

              {/* Âge moyen */}
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#F3F4F6',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Âge moyen</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151' }}>
                  {stats.participants.averageAge} ans
                </div>
              </div>
            </div>

            {/* Top nationalités */}
            {stats.participants.topNationalities.length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#1F2937', fontSize: '1rem' }}>
                  <i className="fas fa-globe-africa" style={{ color: '#10B981', marginRight: '0.5rem' }}></i>
                  Top Nationalités
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stats.participants.topNationalities.slice(0, 5).map((nat, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: index === 0 ? '#D1FAE5' : '#F9FAFB',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: index === 0 ? '#10B981' : '#E5E7EB',
                          color: index === 0 ? 'white' : '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          {index + 1}
                        </span>
                        <span style={{ color: '#374151', fontSize: '0.9rem' }}>{nat.nationality}</span>
                      </div>
                      <span style={{
                        fontWeight: '600',
                        color: index === 0 ? '#166534' : '#6B7280'
                      }}>
                        {nat.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer avec types d'événements */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginTop: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#DBEAFE',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'center'
          }}>
            <i className="fas fa-theater-masks" style={{ fontSize: '2rem', color: '#3B82F6', marginBottom: '0.5rem' }}></i>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1E40AF' }}>{stats.events.byType.stages}</div>
            <div style={{ fontSize: '0.9rem', color: '#3B82F6' }}>Stages</div>
          </div>
          <div style={{
            backgroundColor: '#D1FAE5',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'center'
          }}>
            <i className="fas fa-home" style={{ fontSize: '2rem', color: '#10B981', marginBottom: '0.5rem' }}></i>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#166534' }}>{stats.events.byType.residences}</div>
            <div style={{ fontSize: '0.9rem', color: '#10B981' }}>Résidences</div>
          </div>
          <div style={{
            backgroundColor: '#FEF3C7',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'center'
          }}>
            <i className="fas fa-star" style={{ fontSize: '2rem', color: '#F59E0B', marginBottom: '0.5rem' }}></i>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#92400E' }}>{stats.events.byType.autres}</div>
            <div style={{ fontSize: '0.9rem', color: '#F59E0B' }}>Autres Activités</div>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ isOpen: false, message: '', type: 'info' })}
      />
    </>
  );
};

export default Dashboard;
