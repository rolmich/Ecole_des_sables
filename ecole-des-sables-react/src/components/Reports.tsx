import React, { useState, useEffect } from 'react';
import { Participant } from '../types/Participant';
import { Bungalow } from '../types/Bungalow';
import { Stage } from '../types/Stage';
import dataService from '../services/dataService';
// @ts-ignore - xlsx is a JavaScript library without TypeScript types
import * as XLSX from 'xlsx';

const Reports: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bungalows, setBungalows] = useState<Bungalow[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    };
    loadData();
  }, []);

  const assignedParticipants = participants.filter(p => p.assignedBungalowId);
  const unassignedParticipants = participants.filter(p => !p.assignedBungalowId);
  const occupiedBungalows = bungalows.filter(b => b.occupancy > 0);
  const availableBungalows = bungalows.filter(b => b.occupancy === 0);
  const occupancyRate = Math.round((occupiedBungalows.length / bungalows.length) * 100);

  const reportTypes = [
    {
      id: 'occupancy',
      title: 'Occupation des Chambres',
      description: 'Rapport détaillé de l\'occupation par village et bungalow',
      icon: 'fas fa-home'
    },
    {
      id: 'participants',
      title: 'Liste des Participants',
      description: 'Export des participants par stage avec leurs assignations',
      icon: 'fas fa-users'
    },
    {
      id: 'conflicts',
      title: 'Conflits et Problèmes',
      description: 'Identification des conflits d\'assignation et sureffectifs',
      icon: 'fas fa-exclamation-triangle'
    },
    {
      id: 'statistics',
      title: 'Statistiques Globales',
      description: 'Analyse des tendances et métriques d\'occupation',
      icon: 'fas fa-chart-pie'
    }
  ];

  const renderReportPreview = () => {
    if (!selectedReport) {
      return (
        <div className="empty-state">
          <i className="fas fa-chart-bar"></i>
          <p>Choisissez un type de rapport pour voir un aperçu</p>
        </div>
      );
    }

    switch (selectedReport) {
      case 'occupancy':
        return (
          <div className="occupancy-report">
            <h4>Occupation par Village</h4>
            {(['A', 'B', 'C'] as const).map((village) => {
              const villageBungalows = bungalows.filter(b => b.village === village);
              const occupied = villageBungalows.filter(b => b.occupancy > 0).length;
              const total = villageBungalows.length;
              const rate = Math.round((occupied / total) * 100);
              
              return (
                <div key={village} className="village-occupancy">
                  <div className="village-header">
                    <span>Village {village}</span>
                    <span>{occupied}/{total} bungalows ({rate}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${rate}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      
      case 'participants':
        return (
          <div className="participants-report">
            <h4>Participants par Stage</h4>
            {stages.map(stage => {
              const stageParticipants = participants.filter(p => p.stageIds?.includes(stage.id));
              const assigned = stageParticipants.filter(p => p.assignedBungalowId).length;
              
              return (
                <div key={stage.id} className="stage-participants">
                  <div className="stage-header">
                    <span>{stage.name}</span>
                    <span>{assigned}/{stageParticipants.length} assignés</span>
                  </div>
                  <div className="participants-list">
                    {stageParticipants.map(participant => (
                      <div key={participant.id} className="participant-item">
                        <span>{participant.firstName} {participant.lastName}</span>
                        <span className={participant.assignedBungalowId ? 'assigned' : 'unassigned'}>
                          {participant.assignedBungalowId ? 'Assigné' : 'Non assigné'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      
      case 'conflicts':
        return (
          <div className="conflicts-report">
            <h4>Conflits Détectés</h4>
            <div className="conflict-item">
              <i className="fas fa-exclamation-triangle"></i>
              <div>
                <strong>Sureffectif dans le Village A</strong>
                <p>2 participants de plus que la capacité disponible</p>
              </div>
            </div>
            <div className="conflict-item">
              <i className="fas fa-exclamation-triangle"></i>
              <div>
                <strong>Conflit de genre</strong>
                <p>Mélange de genres dans le bungalow B3</p>
              </div>
            </div>
          </div>
        );
      
      case 'statistics':
        return (
          <div className="statistics-report">
            <h4>Métriques Clés</h4>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-value">{occupancyRate}%</span>
                <span className="metric-label">Taux d'Occupation</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">{assignedParticipants.length}</span>
                <span className="metric-label">Participants Assignés</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">{availableBungalows.length}</span>
                <span className="metric-label">Chambres Disponibles</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">{stages.length}</span>
                <span className="metric-label">Stages Actifs</span>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getReportTitle = () => {
    if (!selectedReport) return 'Sélectionnez un type de rapport';
    const report = reportTypes.find(r => r.id === selectedReport);
    return report ? report.title : 'Rapport';
  };

  // Fonction pour filtrer les participants par période
  const getParticipantsInPeriod = () => {
    if (!startDate || !endDate) {
      return participants;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    return participants.filter(p => {
      return p.stageIds?.some(stageId => {
        const stage = stages.find(s => s.id === stageId);
        if (!stage || !stage.startDate || !stage.endDate) return false;
        
        const stageStart = new Date(stage.startDate);
        const stageEnd = new Date(stage.endDate);
        
        // Vérifier si les périodes se chevauchent
        return stageStart <= end && stageEnd >= start;
      });
    });
  };

  // Fonction d'export Excel des assignations de chambres
  const exportAssignationsToExcel = () => {
    const filteredParticipants = getParticipantsInPeriod();
    const assignedParticipants = filteredParticipants.filter(p => p.assignedBungalowId);

    // Préparer les données pour Excel
    const excelData = assignedParticipants.map(participant => {
      const bungalow = bungalows.find(b => b.id === participant.assignedBungalowId);
      const participantStages = participant.stageIds?.map(stageId => {
        const stage = stages.find(s => s.id === stageId);
        return stage ? stage.name : `Stage ${stageId}`;
      }).join(', ') || 'Aucun';

      return {
        'Prénom': participant.firstName,
        'Nom': participant.lastName,
        'Email': participant.email,
        'Sexe': participant.gender === 'M' ? 'Homme' : 'Femme',
        'Âge': participant.age,
        'Statut': getStatusText(participant.status),
        'Langue': participant.language,
        'Stage(s)': participantStages,
        'Village': bungalow ? bungalow.village : '-',
        'Bungalow': bungalow ? bungalow.name : '-',
        'Lit': participant.assignedBed || '-',
        'Capacité Bungalow': bungalow ? bungalow.capacity : '-'
      };
    });

    // Créer le workbook et la worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Définir la largeur des colonnes
    const colWidths = [
      { wch: 15 }, // Prénom
      { wch: 15 }, // Nom
      { wch: 30 }, // Email
      { wch: 10 }, // Sexe
      { wch: 8 },  // Âge
      { wch: 18 }, // Statut
      { wch: 12 }, // Langue
      { wch: 35 }, // Stage(s)
      { wch: 10 }, // Village
      { wch: 15 }, // Bungalow
      { wch: 10 }, // Lit
      { wch: 18 }  // Capacité
    ];
    ws['!cols'] = colWidths;

    // Ajouter la worksheet au workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Assignations Chambres');

    // Créer un nom de fichier avec la période
    const fileName = startDate && endDate 
      ? `Assignations_Chambres_${startDate}_${endDate}.xlsx`
      : `Assignations_Chambres_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Télécharger le fichier
    XLSX.writeFile(wb, fileName);
  };

  // Fonction pour obtenir le texte du statut
  const getStatusText = (status: string) => {
    switch (status) {
      case 'student': return 'Élève';
      case 'instructor': return 'Enseignant-e';
      case 'professional': return 'Professionnel-le';
      case 'staff': return 'Salarié-e';
      default: return 'Inconnu';
    }
  };

  return (
    <>
      <header className="main-header">
        <h1>Rapports et Exports</h1>
        <div className="header-actions">
          <div className="date-range">
            <input 
              type="date" 
              className="date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Date début"
            />
            <span>à</span>
            <input 
              type="date" 
              className="date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Date fin"
            />
          </div>
          <button 
            className="btn btn-success"
            onClick={exportAssignationsToExcel}
            title="Exporter les assignations de chambres en Excel"
          >
            <i className="fas fa-file-excel"></i>
            Export Assignations Excel
          </button>
        </div>
      </header>
      
      <div className="reports-content">
        {/* Report Types */}
        <div className="report-types">
          <h2>Types de Rapports</h2>
          <div className="report-cards">
            {reportTypes.map((report) => (
              <div 
                key={report.id} 
                className={`report-card ${selectedReport === report.id ? 'selected' : ''}`}
                onClick={() => setSelectedReport(report.id)}
              >
                <div className="report-icon">
                  <i className={report.icon}></i>
                </div>
                <div className="report-content">
                  <h3>{report.title}</h3>
                  <p>{report.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Selected Report Preview */}
        <div className="report-preview">
          <div className="preview-header">
            <h3>{getReportTitle()}</h3>
            <div className="preview-actions">
              <button className="btn btn-secondary" disabled>
                <i className="fas fa-file-pdf"></i>
                Export PDF
              </button>
              <button 
                className="btn btn-success"
                onClick={exportAssignationsToExcel}
                disabled={!selectedReport}
                title="Exporter en Excel"
              >
                <i className="fas fa-file-excel"></i>
                Export Excel
              </button>
            </div>
          </div>
          <div className="preview-content">
            {renderReportPreview()}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="quick-stats">
          <h2>Statistiques Rapides</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{occupancyRate}%</div>
              <div className="stat-label">Taux d'Occupation</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{occupiedBungalows.length}/{bungalows.length}</div>
              <div className="stat-label">Bungalows Occupés</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stages.length}</div>
              <div className="stat-label">Stages Actifs</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{participants.length}</div>
              <div className="stat-label">Participants Total</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">2</div>
              <div className="stat-label">Conflits Détectés</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{availableBungalows.length}</div>
              <div className="stat-label">Chambres Disponibles</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Reports;
