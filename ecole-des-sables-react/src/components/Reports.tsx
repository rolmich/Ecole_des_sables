import React, { useState } from 'react';
import apiService from '../services/api';
// @ts-ignore - xlsx is a JavaScript library
import * as XLSX from 'xlsx';
// @ts-ignore - jspdf
import { jsPDF } from 'jspdf';
// @ts-ignore - jspdf-autotable
import autoTable from 'jspdf-autotable';

// Type assertion pour les fonctions xlsx
const xlsxUtils = XLSX.utils as any;

interface FrequencyReport {
  period: {
    startDate: string;
    endDate: string;
  };
  events: {
    total: number;
    stages: number;
    residences: number;
    autres: number;
    list: Array<{
      id: number;
      name: string;
      type: string;
      startDate: string;
      endDate: string;
      capacity: number;
      currentParticipants: number;
    }>;
  };
  participants: {
    totalRegistrations: number;
    uniqueParticipants: number;
    byRole: {
      participants: number;
      instructors: number;
      musicians: number;
      staff: number;
    };
    byStatus: {
      students: number;
      instructors: number;
      professionals: number;
      staff: number;
    };
  };
  demographics: {
    gender: {
      men: number;
      women: number;
      menPercentage: number;
      womenPercentage: number;
    };
    age: {
      average: number;
      min: number;
      max: number;
      distribution: Record<string, number>;
    };
  };
  nationalities: {
    total: number;
    list: Array<{ nationality: string; count: number }>;
  };
  languages: Array<{ language: string; count: number }>;
  occupancy: {
    totalBedCapacity: number;
    totalEventCapacity: number;
    totalRegistrations: number;
    assignedToBungalows: number;
    eventFillRate: number;
    assignmentRate: number;
  };
}

const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<FrequencyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Générer le bilan
  const generateReport = async () => {
    if (!startDate || !endDate) {
      setError('Veuillez sélectionner une période (date de début et date de fin)');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('La date de début doit être antérieure à la date de fin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiService.getFrequencyReport(startDate, endDate);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération du bilan');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  // Raccourcis de période
  const setQuickPeriod = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const setYearPeriod = (year: number) => {
    setStartDate(`${year}-01-01`);
    setEndDate(`${year}-12-31`);
  };

  // Export Excel du bilan
  const exportToExcel = () => {
    if (!report) return;

    const wb = xlsxUtils.book_new();

    // Feuille Résumé
    const summaryData = [
      ['BILAN DE FRÉQUENTATION'],
      [''],
      ['Période', `${formatDate(report.period.startDate)} - ${formatDate(report.period.endDate)}`],
      [''],
      ['=== ÉVÉNEMENTS ==='],
      ['Total événements', report.events.total],
      ['Stages', report.events.stages],
      ['Résidences', report.events.residences],
      ['Autres activités', report.events.autres],
      [''],
      ['=== PARTICIPANTS ==='],
      ['Total inscriptions', report.participants.totalRegistrations],
      ['Participants uniques', report.participants.uniqueParticipants],
      [''],
      ['Par rôle:'],
      ['  - Participants', report.participants.byRole.participants],
      ['  - Encadrants', report.participants.byRole.instructors],
      ['  - Musiciens', report.participants.byRole.musicians],
      ['  - Staff', report.participants.byRole.staff],
      [''],
      ['Par statut:'],
      ['  - Élèves', report.participants.byStatus.students],
      ['  - Enseignant-e-s', report.participants.byStatus.instructors],
      ['  - Professionnel-le-s', report.participants.byStatus.professionals],
      ['  - Salarié-e-s', report.participants.byStatus.staff],
      [''],
      ['=== DÉMOGRAPHIE ==='],
      ['Hommes', `${report.demographics.gender.men} (${report.demographics.gender.menPercentage}%)`],
      ['Femmes', `${report.demographics.gender.women} (${report.demographics.gender.womenPercentage}%)`],
      [''],
      ['Âge moyen', report.demographics.age.average],
      ['Âge minimum', report.demographics.age.min],
      ['Âge maximum', report.demographics.age.max],
      [''],
      ['=== TAUX DE FRÉQUENTATION ==='],
      ['Capacité totale événements', report.occupancy.totalEventCapacity],
      ['Inscriptions totales', report.occupancy.totalRegistrations],
      ['Taux de remplissage', `${report.occupancy.eventFillRate}%`],
      ['Assignés aux chambres', report.occupancy.assignedToBungalows],
      ['Taux d\'assignation', `${report.occupancy.assignmentRate}%`],
    ];
    const wsSummary = xlsxUtils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 40 }];
    xlsxUtils.book_append_sheet(wb, wsSummary, 'Résumé');

    // Feuille Événements
    const eventsData = [
      ['Nom', 'Type', 'Date début', 'Date fin', 'Capacité', 'Participants'],
      ...report.events.list.map(e => [
        e.name,
        e.type === 'stage' ? 'Stage' : e.type === 'resident' ? 'Résidence' : 'Autres',
        formatDate(e.startDate),
        formatDate(e.endDate),
        e.capacity,
        e.currentParticipants
      ])
    ];
    const wsEvents = xlsxUtils.aoa_to_sheet(eventsData);
    wsEvents['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
    xlsxUtils.book_append_sheet(wb, wsEvents, 'Événements');

    // Feuille Nationalités
    const nationalitiesData = [
      ['Nationalité', 'Nombre de personnes'],
      ...report.nationalities.list.map(n => [n.nationality, n.count])
    ];
    const wsNationalities = xlsxUtils.aoa_to_sheet(nationalitiesData);
    wsNationalities['!cols'] = [{ wch: 30 }, { wch: 20 }];
    xlsxUtils.book_append_sheet(wb, wsNationalities, 'Nationalités');

    // Feuille Langues
    const languagesData = [
      ['Langue', 'Nombre de personnes'],
      ...report.languages.map(l => [l.language, l.count])
    ];
    const wsLanguages = xlsxUtils.aoa_to_sheet(languagesData);
    wsLanguages['!cols'] = [{ wch: 25 }, { wch: 20 }];
    xlsxUtils.book_append_sheet(wb, wsLanguages, 'Langues');

    // Feuille Distribution des âges
    const ageData = [
      ['Tranche d\'âge', 'Nombre'],
      ...Object.entries(report.demographics.age.distribution).map(([range, count]) => [range, count])
    ];
    const wsAge = xlsxUtils.aoa_to_sheet(ageData);
    wsAge['!cols'] = [{ wch: 15 }, { wch: 15 }];
    xlsxUtils.book_append_sheet(wb, wsAge, 'Distribution âges');

    // Télécharger
    const fileName = `Bilan_Frequentation_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export PDF du bilan
  const exportToPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Couleurs
    const primaryColor: [number, number, number] = [99, 102, 241]; // Indigo
    const textColor: [number, number, number] = [55, 65, 81];
    const lightGray: [number, number, number] = [243, 244, 246];

    // En-tête avec titre
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('BILAN DE FRÉQUENTATION', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Du ${formatDate(report.period.startDate)} au ${formatDate(report.period.endDate)}`, pageWidth / 2, 25, { align: 'center' });

    yPos = 45;

    // Fonction helper pour ajouter une section
    const addSection = (title: string, startY: number): number => {
      doc.setFillColor(...primaryColor);
      doc.rect(14, startY, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 17, startY + 5.5);
      return startY + 12;
    };

    // Fonction pour ajouter une ligne de statistique
    const addStatLine = (label: string, value: string | number, y: number, indent: number = 0): number => {
      doc.setTextColor(...textColor);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(label, 17 + indent, y);
      doc.setFont('helvetica', 'bold');
      doc.text(String(value), pageWidth - 17, y, { align: 'right' });
      return y + 6;
    };

    // ========== RÉSUMÉ ÉVÉNEMENTS ==========
    yPos = addSection('ÉVÉNEMENTS', yPos);
    yPos = addStatLine('Total événements', report.events.total, yPos);
    yPos = addStatLine('Stages', report.events.stages, yPos, 5);
    yPos = addStatLine('Résidences', report.events.residences, yPos, 5);
    yPos = addStatLine('Autres activités', report.events.autres, yPos, 5);
    yPos += 4;

    // ========== PARTICIPANTS ==========
    yPos = addSection('PARTICIPANTS', yPos);
    yPos = addStatLine('Inscriptions totales', report.participants.totalRegistrations, yPos);
    yPos = addStatLine('Participants uniques', report.participants.uniqueParticipants, yPos);
    yPos += 2;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Par rôle:', 17, yPos);
    yPos += 5;
    yPos = addStatLine('Participants', report.participants.byRole.participants, yPos, 5);
    yPos = addStatLine('Encadrants', report.participants.byRole.instructors, yPos, 5);
    yPos = addStatLine('Musiciens', report.participants.byRole.musicians, yPos, 5);
    yPos = addStatLine('Staff', report.participants.byRole.staff, yPos, 5);
    yPos += 2;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Par statut:', 17, yPos);
    yPos += 5;
    yPos = addStatLine('Élèves', report.participants.byStatus.students, yPos, 5);
    yPos = addStatLine('Enseignant-e-s', report.participants.byStatus.instructors, yPos, 5);
    yPos = addStatLine('Professionnel-le-s', report.participants.byStatus.professionals, yPos, 5);
    yPos = addStatLine('Salarié-e-s', report.participants.byStatus.staff, yPos, 5);
    yPos += 4;

    // ========== DÉMOGRAPHIE ==========
    yPos = addSection('DÉMOGRAPHIE', yPos);
    yPos = addStatLine('Hommes', `${report.demographics.gender.men} (${report.demographics.gender.menPercentage}%)`, yPos);
    yPos = addStatLine('Femmes', `${report.demographics.gender.women} (${report.demographics.gender.womenPercentage}%)`, yPos);
    yPos += 2;
    yPos = addStatLine('Âge moyen', `${report.demographics.age.average} ans`, yPos);
    yPos = addStatLine('Âge minimum', `${report.demographics.age.min} ans`, yPos);
    yPos = addStatLine('Âge maximum', `${report.demographics.age.max} ans`, yPos);
    yPos += 4;

    // ========== TAUX DE FRÉQUENTATION ==========
    yPos = addSection('TAUX DE FRÉQUENTATION', yPos);
    yPos = addStatLine('Capacité totale événements', report.occupancy.totalEventCapacity, yPos);
    yPos = addStatLine('Inscriptions totales', report.occupancy.totalRegistrations, yPos);
    yPos = addStatLine('Taux de remplissage', `${report.occupancy.eventFillRate}%`, yPos);
    yPos = addStatLine('Assignés aux chambres', report.occupancy.assignedToBungalows, yPos);
    yPos = addStatLine('Taux d\'assignation', `${report.occupancy.assignmentRate}%`, yPos);

    // ========== NOUVELLE PAGE - TABLEAUX ==========
    doc.addPage();
    yPos = 20;

    // Tableau des événements
    doc.setFillColor(...primaryColor);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAIL DES ÉVÉNEMENTS', 17, yPos + 5.5);
    yPos += 12;

    autoTable(doc, {
      startY: yPos,
      head: [['Nom', 'Type', 'Dates', 'Capacité', 'Inscrits', 'Taux']],
      body: report.events.list.map(e => {
        const rate = e.capacity > 0 ? Math.round((e.currentParticipants / e.capacity) * 100) : 0;
        return [
          e.name,
          e.type === 'stage' ? 'Stage' : e.type === 'resident' ? 'Résidence' : 'Autres',
          `${formatDateShort(e.startDate)} - ${formatDateShort(e.endDate)}`,
          e.capacity,
          e.currentParticipants,
          `${rate}%`
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 45 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Tableau des nationalités
    if (report.nationalities.list.length > 0) {
      doc.setFillColor(...primaryColor);
      doc.rect(14, yPos, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`NATIONALITÉS (${report.nationalities.total} pays)`, 17, yPos + 5.5);
      yPos += 12;

      autoTable(doc, {
        startY: yPos,
        head: [['Nationalité', 'Nombre']],
        body: report.nationalities.list.map(n => [n.nationality, n.count]),
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 40, halign: 'center' }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Tableau distribution des âges
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(...primaryColor);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUTION DES ÂGES', 17, yPos + 5.5);
    yPos += 12;

    autoTable(doc, {
      startY: yPos,
      head: [['Tranche d\'âge', 'Nombre']],
      body: Object.entries(report.demographics.age.distribution).map(([range, count]) => [range, count]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 80, halign: 'center' }
      }
    });

    // Langues si présentes
    if (report.languages.length > 0) {
      yPos = (doc as any).lastAutoTable.finalY + 15;

      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(...primaryColor);
      doc.rect(14, yPos, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('LANGUES PARLÉES', 17, yPos + 5.5);
      yPos += 12;

      autoTable(doc, {
        startY: yPos,
        head: [['Langue', 'Nombre']],
        body: report.languages.map(l => [l.language, l.count]),
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 40, halign: 'center' }
        }
      });
    }

    // Pied de page sur toutes les pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `École des Sables - Bilan généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Télécharger
    const fileName = `Bilan_Frequentation_${startDate}_${endDate}.pdf`;
    doc.save(fileName);
  };

  // Formater une date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Formater une date courte
  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <>
      <header className="main-header">
        <h1>Bilan de Fréquentation</h1>
      </header>

      <div className="reports-content" style={{ padding: '1.5rem' }}>
        {/* Sélection de période */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', color: '#374151' }}>
            <i className="fas fa-calendar-alt" style={{ marginRight: '0.5rem', color: '#6366F1' }}></i>
            Définir la période du bilan
          </h2>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#6B7280' }}>
                Date de début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#6B7280' }}>
                Date de fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  fontSize: '1rem'
                }}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={generateReport}
              disabled={loading}
              style={{ height: '42px' }}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                  Génération...
                </>
              ) : (
                <>
                  <i className="fas fa-chart-bar" style={{ marginRight: '0.5rem' }}></i>
                  Générer le bilan
                </>
              )}
            </button>

            {report && (
              <>
                <button
                  className="btn btn-success"
                  onClick={exportToExcel}
                  style={{ height: '42px' }}
                >
                  <i className="fas fa-file-excel" style={{ marginRight: '0.5rem' }}></i>
                  Exporter Excel
                </button>
                <button
                  className="btn"
                  onClick={exportToPDF}
                  style={{
                    height: '42px',
                    backgroundColor: '#DC2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 1rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-file-pdf" style={{ marginRight: '0.5rem' }}></i>
                  Exporter PDF
                </button>
              </>
            )}
          </div>

          {/* Raccourcis de période */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#6B7280', fontSize: '0.9rem', marginRight: '0.5rem' }}>Raccourcis :</span>
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setQuickPeriod(1)}>
              Dernier mois
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setQuickPeriod(3)}>
              3 derniers mois
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setQuickPeriod(6)}>
              6 derniers mois
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setQuickPeriod(12)}>
              12 derniers mois
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setYearPeriod(currentYear)}>
              Année {currentYear}
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setYearPeriod(currentYear - 1)}>
              Année {currentYear - 1}
            </button>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {/* État initial */}
        {!report && !loading && !error && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <i className="fas fa-chart-pie" style={{ fontSize: '4rem', color: '#D1D5DB', marginBottom: '1rem' }}></i>
            <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>Sélectionnez une période</h3>
            <p>Choisissez une date de début et de fin pour générer votre bilan de fréquentation.</p>
          </div>
        )}

        {/* Résultats du bilan */}
        {report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Période et titre */}
            <div style={{
              backgroundColor: '#6366F1',
              color: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                Bilan du {formatDate(report.period.startDate)} au {formatDate(report.period.endDate)}
              </h2>
            </div>

            {/* Cartes principales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* Événements */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.75rem' }}>
                    <i className="fas fa-calendar-alt" style={{ color: '#3B82F6', fontSize: '1.2rem' }}></i>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>Événements</h3>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1F2937', marginBottom: '0.5rem' }}>{report.events.total}</div>
                <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                  {report.events.stages} stages, {report.events.residences} résidences, {report.events.autres} autres
                </div>
              </div>

              {/* Participants uniques */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.75rem' }}>
                    <i className="fas fa-users" style={{ color: '#10B981', fontSize: '1.2rem' }}></i>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>Participants uniques</h3>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1F2937', marginBottom: '0.5rem' }}>{report.participants.uniqueParticipants}</div>
                <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                  {report.participants.totalRegistrations} inscriptions au total
                </div>
              </div>

              {/* Taux de remplissage */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.75rem' }}>
                    <i className="fas fa-percentage" style={{ color: '#F59E0B', fontSize: '1.2rem' }}></i>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>Taux de remplissage</h3>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1F2937', marginBottom: '0.5rem' }}>{report.occupancy.eventFillRate}%</div>
                <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                  {report.occupancy.totalRegistrations}/{report.occupancy.totalEventCapacity} places
                </div>
              </div>

              {/* Âge moyen */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.75rem' }}>
                    <i className="fas fa-birthday-cake" style={{ color: '#6366F1', fontSize: '1.2rem' }}></i>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>Âge moyen</h3>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1F2937', marginBottom: '0.5rem' }}>{report.demographics.age.average} ans</div>
                <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                  De {report.demographics.age.min} à {report.demographics.age.max} ans
                </div>
              </div>
            </div>

            {/* Section détaillée */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {/* Répartition par genre */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#374151' }}>
                  <i className="fas fa-venus-mars" style={{ marginRight: '0.5rem', color: '#8B5CF6' }}></i>
                  Répartition Hommes / Femmes
                </h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '1rem', backgroundColor: '#DBEAFE', borderRadius: '8px' }}>
                    <i className="fas fa-mars" style={{ fontSize: '1.5rem', color: '#3B82F6', marginBottom: '0.5rem', display: 'block' }}></i>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E40AF' }}>{report.demographics.gender.men}</div>
                    <div style={{ fontSize: '0.9rem', color: '#3B82F6' }}>Hommes ({report.demographics.gender.menPercentage}%)</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '1rem', backgroundColor: '#FCE7F3', borderRadius: '8px' }}>
                    <i className="fas fa-venus" style={{ fontSize: '1.5rem', color: '#EC4899', marginBottom: '0.5rem', display: 'block' }}></i>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#BE185D' }}>{report.demographics.gender.women}</div>
                    <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>Femmes ({report.demographics.gender.womenPercentage}%)</div>
                  </div>
                </div>
              </div>

              {/* Répartition par statut */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#374151' }}>
                  <i className="fas fa-user-tag" style={{ marginRight: '0.5rem', color: '#10B981' }}></i>
                  Par catégorie de personne
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#F0FDF4', borderRadius: '8px', borderLeft: '4px solid #10B981' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#166534' }}>{report.participants.byStatus.students}</div>
                    <div style={{ fontSize: '0.85rem', color: '#15803D' }}>Élèves</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#FEF3C7', borderRadius: '8px', borderLeft: '4px solid #F59E0B' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#92400E' }}>{report.participants.byStatus.instructors}</div>
                    <div style={{ fontSize: '0.85rem', color: '#B45309' }}>Enseignant-e-s</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#E0E7FF', borderRadius: '8px', borderLeft: '4px solid #6366F1' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#3730A3' }}>{report.participants.byStatus.professionals}</div>
                    <div style={{ fontSize: '0.85rem', color: '#4338CA' }}>Professionnel-le-s</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#F3E8FF', borderRadius: '8px', borderLeft: '4px solid #A855F7' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#6B21A8' }}>{report.participants.byStatus.staff}</div>
                    <div style={{ fontSize: '0.85rem', color: '#7C3AED' }}>Salarié-e-s</div>
                  </div>
                </div>
              </div>

              {/* Distribution des âges */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#374151' }}>
                  <i className="fas fa-chart-bar" style={{ marginRight: '0.5rem', color: '#6366F1' }}></i>
                  Distribution des âges
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Object.entries(report.demographics.age.distribution).map(([range, count]) => {
                    const maxCount = Math.max(...Object.values(report.demographics.age.distribution));
                    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={range} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '50px', fontSize: '0.85rem', color: '#6B7280' }}>{range}</div>
                        <div style={{ flex: 1, height: '24px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${percentage}%`,
                              height: '100%',
                              backgroundColor: '#6366F1',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease'
                            }}
                          ></div>
                        </div>
                        <div style={{ width: '40px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rôles dans les événements */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#374151' }}>
                  <i className="fas fa-user-tie" style={{ marginRight: '0.5rem', color: '#3B82F6' }}></i>
                  Rôles dans les événements
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#DBEAFE', borderRadius: '8px', borderLeft: '4px solid #3B82F6' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1E40AF' }}>{report.participants.byRole.participants}</div>
                    <div style={{ fontSize: '0.85rem', color: '#3B82F6' }}>Participants</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#FEF3C7', borderRadius: '8px', borderLeft: '4px solid #F59E0B' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#92400E' }}>{report.participants.byRole.instructors}</div>
                    <div style={{ fontSize: '0.85rem', color: '#B45309' }}>Encadrants</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#E0E7FF', borderRadius: '8px', borderLeft: '4px solid #6366F1' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#3730A3' }}>{report.participants.byRole.musicians}</div>
                    <div style={{ fontSize: '0.85rem', color: '#4338CA' }}>Musiciens</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#F3E8FF', borderRadius: '8px', borderLeft: '4px solid #A855F7' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#6B21A8' }}>{report.participants.byRole.staff}</div>
                    <div style={{ fontSize: '0.85rem', color: '#7C3AED' }}>Staff</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nationalités */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#374151' }}>
                <i className="fas fa-globe-africa" style={{ marginRight: '0.5rem', color: '#10B981' }}></i>
                Nationalités ({report.nationalities.total} pays représentés)
              </h3>
              {report.nationalities.list.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {report.nationalities.list.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#F0FDF4',
                        borderRadius: '20px',
                        border: '1px solid #BBF7D0'
                      }}
                    >
                      <span style={{ fontWeight: '500', color: '#166534' }}>{item.nationality}</span>
                      <span style={{
                        backgroundColor: '#10B981',
                        color: 'white',
                        padding: '0.1rem 0.5rem',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6B7280', fontStyle: 'italic' }}>Aucune nationalité renseignée</p>
              )}
            </div>

            {/* Langues */}
            {report.languages.length > 0 && (
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#374151' }}>
                  <i className="fas fa-language" style={{ marginRight: '0.5rem', color: '#8B5CF6' }}></i>
                  Langues parlées
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {report.languages.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#F3E8FF',
                        borderRadius: '20px',
                        border: '1px solid #DDD6FE'
                      }}
                    >
                      <span style={{ fontWeight: '500', color: '#6B21A8' }}>{item.language}</span>
                      <span style={{
                        backgroundColor: '#8B5CF6',
                        color: 'white',
                        padding: '0.1rem 0.5rem',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Liste des événements */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#374151' }}>
                <i className="fas fa-list" style={{ marginRight: '0.5rem', color: '#3B82F6' }}></i>
                Détail des événements
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB', color: '#374151' }}>Nom</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB', color: '#374151' }}>Type</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB', color: '#374151' }}>Dates</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '2px solid #E5E7EB', color: '#374151' }}>Capacité</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '2px solid #E5E7EB', color: '#374151' }}>Participants</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '2px solid #E5E7EB', color: '#374151' }}>Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.events.list.map((event) => {
                      const rate = event.capacity > 0 ? Math.round((event.currentParticipants / event.capacity) * 100) : 0;
                      return (
                        <tr key={event.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>{event.name}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              fontWeight: '500',
                              backgroundColor: event.type === 'stage' ? '#DBEAFE' : event.type === 'resident' ? '#D1FAE5' : '#FEF3C7',
                              color: event.type === 'stage' ? '#1E40AF' : event.type === 'resident' ? '#166534' : '#92400E'
                            }}>
                              {event.type === 'stage' ? 'Stage' : event.type === 'resident' ? 'Résidence' : 'Autres'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#6B7280' }}>
                            {formatDateShort(event.startDate)} - {formatDateShort(event.endDate)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{event.capacity}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '600' }}>{event.currentParticipants}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              backgroundColor: rate >= 80 ? '#D1FAE5' : rate >= 50 ? '#FEF3C7' : '#FEE2E2',
                              color: rate >= 80 ? '#166534' : rate >= 50 ? '#92400E' : '#DC2626'
                            }}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Reports;
