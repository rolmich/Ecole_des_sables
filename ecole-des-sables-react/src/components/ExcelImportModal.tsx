import React, { useState, useRef } from 'react';
import apiService from '../services/api';

interface ImportResult {
  summary: {
    totalRows: number;
    validImports: number;
    newParticipants: number;
    alreadyRegistered: number;
    errors: number;
  };
  valid_imports: any[];
  new_participants: any[];
  already_registered: any[];
  errors: any[];
}

interface ExecuteResult {
  summary: {
    imported: number;
    createdAndImported: number;
    errors: number;
  };
  imported: any[];
  created_and_imported: any[];
  errors: any[];
}

interface ExcelImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm_new' | 'result'>('upload');
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [selectedNewParticipants, setSelectedNewParticipants] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Télécharger un template Excel vide
  const downloadTemplate = () => {
    // Créer le contenu CSV (compatible Excel)
    const headers = [
      'email',
      'stage_name',
      'first_name',
      'last_name',
      'gender',
      'age',
      'nationality',
      'status',
      'role',
      'arrival_date',
      'arrival_time',
      'departure_date',
      'departure_time',
      'languages'
    ];

    const exampleRow = [
      'exemple@email.com',
      'Nom de l\'événement',
      'Jean',
      'Dupont',
      'M',
      '30',
      'Française',
      'student',
      'participant',
      '2025-01-15',
      '10:00',
      '2025-01-20',
      '16:00',
      'Français, English, Wolof'
    ];

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + exampleRow.join(';');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_import_participants.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Format non supporté. Utilisez un fichier .xlsx, .xls ou .csv');
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.validateExcelImport(file);
      setValidationResult(result);

      // Pré-sélectionner tous les nouveaux participants
      if (result.new_participants.length > 0) {
        setSelectedNewParticipants(new Set(result.new_participants.map((_: any, i: number) => i)));
      }

      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!validationResult) return;

    setLoading(true);
    setError(null);

    try {
      // Filtrer les nouveaux participants sélectionnés
      const selectedNew = validationResult.new_participants.filter(
        (_: any, index: number) => selectedNewParticipants.has(index)
      );

      const result = await apiService.executeExcelImport({
        valid_imports: validationResult.valid_imports,
        new_participants: selectedNew
      });

      setExecuteResult(result);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  const toggleNewParticipant = (index: number) => {
    const newSet = new Set(selectedNewParticipants);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedNewParticipants(newSet);
  };

  const selectAllNew = () => {
    if (validationResult) {
      setSelectedNewParticipants(new Set(validationResult.new_participants.map((_: any, i: number) => i)));
    }
  };

  const deselectAllNew = () => {
    setSelectedNewParticipants(new Set());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-file-excel" style={{ color: '#10B981', marginRight: '10px' }}></i>
            Import Excel - Participants
          </h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <div className="modal-body" style={{ overflow: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              backgroundColor: '#FEE2E2',
              border: '2px solid #DC2626',
              color: '#991B1B',
              padding: '16px 20px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '24px', color: '#DC2626', marginTop: '2px' }}></i>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', marginBottom: '8px', fontSize: '16px' }}>
                    {error.includes('session') || error.includes('reconnecter') ? 'Session expirée' : 'Erreur'}
                  </strong>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                    {error}
                  </p>
                  {(error.includes('session') || error.includes('reconnecter')) && (
                    <button
                      onClick={() => window.location.href = '/login'}
                      style={{
                        marginTop: '12px',
                        backgroundColor: '#DC2626',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      <i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }}></i>
                      Se reconnecter
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: '12px',
                  padding: '40px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: file ? '#F0FDF4' : '#F8FAFC',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <i className="fas fa-cloud-upload-alt" style={{ fontSize: '48px', color: file ? '#10B981' : '#94A3B8', marginBottom: '16px' }}></i>
                <p style={{ fontSize: '16px', color: '#475569', marginBottom: '8px' }}>
                  {file ? file.name : 'Glissez votre fichier ici ou cliquez pour parcourir'}
                </p>
                <p style={{ fontSize: '13px', color: '#94A3B8' }}>
                  Formats acceptés: .xlsx, .xls, .csv
                </p>
              </div>

              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '12px', color: '#1E293B' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#3B82F6' }}></i>
                  Format du fichier
                </h4>
                <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '12px' }}>
                  Le fichier doit contenir les colonnes suivantes (en-têtes en première ligne):
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#DC2626', marginBottom: '8px' }}>
                    <i className="fas fa-asterisk" style={{ fontSize: '10px', marginRight: '4px' }}></i>
                    Colonnes obligatoires:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '13px', paddingLeft: '12px' }}>
                    <div><strong>email</strong> - Identifiant unique du participant</div>
                    <div><strong>stage_name</strong> - Nom exact de l'événement</div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400E', marginBottom: '8px' }}>
                    <i className="fas fa-user-plus" style={{ fontSize: '10px', marginRight: '4px' }}></i>
                    Si nouveau participant:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '13px', paddingLeft: '12px' }}>
                    <div><strong>first_name</strong> - Prénom</div>
                    <div><strong>last_name</strong> - Nom de famille</div>
                    <div><strong>gender</strong> - M ou F</div>
                    <div><strong>age</strong> - Âge</div>
                    <div><strong>nationality</strong> - Nationalité</div>
                    <div><strong>status</strong> - student, instructor, professional, staff</div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#3B82F6', marginBottom: '8px' }}>
                    <i className="fas fa-calendar-alt" style={{ fontSize: '10px', marginRight: '4px' }}></i>
                    Dates et heures (optionnel):
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '13px', paddingLeft: '12px' }}>
                    <div><strong>arrival_date</strong> - Date d'arrivée (AAAA-MM-JJ)</div>
                    <div><strong>arrival_time</strong> - Heure d'arrivée (HH:MM)</div>
                    <div><strong>departure_date</strong> - Date de départ (AAAA-MM-JJ)</div>
                    <div><strong>departure_time</strong> - Heure de départ (HH:MM)</div>
                    <div><strong>role</strong> - participant, musician, instructor, staff</div>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#8B5CF6', marginBottom: '8px' }}>
                    <i className="fas fa-language" style={{ fontSize: '10px', marginRight: '4px' }}></i>
                    Langues (optionnel):
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '6px', fontSize: '13px', paddingLeft: '12px' }}>
                    <div><strong>languages</strong> - Langues parlées, séparées par des virgules (ex: "Français, English, Wolof")</div>
                  </div>
                </div>

                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#DBEAFE', borderRadius: '6px', fontSize: '12px', color: '#1E40AF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <i className="fas fa-lightbulb" style={{ marginRight: '6px' }}></i>
                    <strong>Astuce:</strong> Téléchargez le template pour avoir le bon format
                  </div>
                  <button
                    onClick={downloadTemplate}
                    style={{
                      backgroundColor: '#10B981',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-download"></i>
                    Télécharger template
                  </button>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button onClick={onClose} className="btn btn-secondary">Annuler</button>
                <button
                  onClick={handleValidate}
                  className="btn btn-primary"
                  disabled={!file || loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Validation...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> Valider le fichier
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && validationResult && (
            <div>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', backgroundColor: '#DCFCE7', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534' }}>{validationResult.summary.validImports}</div>
                  <div style={{ fontSize: '13px', color: '#166534' }}>Prêts à importer</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#FEF3C7', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400E' }}>{validationResult.summary.newParticipants}</div>
                  <div style={{ fontSize: '13px', color: '#92400E' }}>Nouveaux participants</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#E0E7FF', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3730A3' }}>{validationResult.summary.alreadyRegistered}</div>
                  <div style={{ fontSize: '13px', color: '#3730A3' }}>Déjà inscrits</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#FEE2E2', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#991B1B' }}>{validationResult.summary.errors}</div>
                  <div style={{ fontSize: '13px', color: '#991B1B' }}>Erreurs</div>
                </div>
              </div>

              {/* Valid imports */}
              {validationResult.valid_imports.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#166534', marginBottom: '12px' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
                    Participants existants à ajouter ({validationResult.valid_imports.length})
                  </h4>
                  <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#F1F5F9', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Email</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nom</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Événement</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Rôle</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Langues à ajouter</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.valid_imports.map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '8px 12px' }}>{item.email}</td>
                            <td style={{ padding: '8px 12px' }}>{item.participantName}</td>
                            <td style={{ padding: '8px 12px' }}>{item.stageName}</td>
                            <td style={{ padding: '8px 12px' }}>{item.role}</td>
                            <td style={{ padding: '8px 12px' }}>
                              {item.languageNames?.length > 0 ? item.languageNames.join(', ') : '-'}
                              {item.languageWarning && (
                                <span style={{ color: '#F59E0B', marginLeft: '4px' }} title={item.languageWarning}>
                                  <i className="fas fa-exclamation-triangle"></i>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* New participants */}
              {validationResult.new_participants.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ color: '#92400E', margin: 0 }}>
                      <i className="fas fa-user-plus" style={{ marginRight: '8px' }}></i>
                      Nouveaux participants à créer ({selectedNewParticipants.size}/{validationResult.new_participants.length})
                    </h4>
                    <div>
                      <button onClick={selectAllNew} className="btn btn-sm btn-secondary" style={{ marginRight: '8px' }}>
                        Tout sélectionner
                      </button>
                      <button onClick={deselectAllNew} className="btn btn-sm btn-secondary">
                        Tout désélectionner
                      </button>
                    </div>
                  </div>
                  <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #FCD34D', borderRadius: '8px', backgroundColor: '#FFFBEB' }}>
                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#FEF3C7', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '8px 12px', width: '40px' }}></th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Email</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Prénom Nom</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Événement</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nationalité</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Langues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.new_participants.map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #FCD34D', backgroundColor: selectedNewParticipants.has(i) ? '#FEF9C3' : 'transparent' }}>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={selectedNewParticipants.has(i)}
                                onChange={() => toggleNewParticipant(i)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px' }}>{item.email}</td>
                            <td style={{ padding: '8px 12px' }}>{item.firstName} {item.lastName}</td>
                            <td style={{ padding: '8px 12px' }}>{item.stageName}</td>
                            <td style={{ padding: '8px 12px' }}>{item.nationality || '-'}</td>
                            <td style={{ padding: '8px 12px' }}>
                              {item.languageNames?.length > 0 ? item.languageNames.join(', ') : '-'}
                              {item.languageWarning && (
                                <span style={{ color: '#F59E0B', marginLeft: '4px' }} title={item.languageWarning}>
                                  <i className="fas fa-exclamation-triangle"></i>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ fontSize: '12px', color: '#92400E', marginTop: '8px' }}>
                    <i className="fas fa-info-circle"></i> Ces participants n'existent pas encore. Cochez ceux que vous souhaitez créer automatiquement.
                  </p>
                </div>
              )}

              {/* Already registered */}
              {validationResult.already_registered.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#3730A3', marginBottom: '12px' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                    Déjà inscrits (ignorés) ({validationResult.already_registered.length})
                  </h4>
                  <div style={{ maxHeight: '120px', overflow: 'auto', border: '1px solid #C7D2FE', borderRadius: '8px', backgroundColor: '#EEF2FF' }}>
                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#E0E7FF', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Email</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nom</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Événement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.already_registered.map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #C7D2FE' }}>
                            <td style={{ padding: '8px 12px' }}>{item.email}</td>
                            <td style={{ padding: '8px 12px' }}>{item.participantName}</td>
                            <td style={{ padding: '8px 12px' }}>{item.stageName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#991B1B', marginBottom: '12px' }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                    Erreurs ({validationResult.errors.length})
                  </h4>
                  <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #FCA5A5', borderRadius: '8px', backgroundColor: '#FEF2F2' }}>
                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#FEE2E2', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ligne</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Email</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Raison</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.errors.map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #FCA5A5' }}>
                            <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>{item.row}</td>
                            <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>{item.email || '-'}</td>
                            <td style={{ padding: '8px 12px', color: '#991B1B' }}>
                              {item.reason.includes(' | ') ? (
                                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                  {item.reason.split(' | ').map((r: string, idx: number) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>{r}</li>
                                  ))}
                                </ul>
                              ) : item.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button onClick={() => { setStep('upload'); setFile(null); setValidationResult(null); }} className="btn btn-secondary">
                  <i className="fas fa-arrow-left"></i> Retour
                </button>
                <button
                  onClick={handleExecuteImport}
                  className="btn btn-primary"
                  disabled={loading || (validationResult.valid_imports.length === 0 && selectedNewParticipants.size === 0)}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Import en cours...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-import"></i> Importer ({validationResult.valid_imports.length + selectedNewParticipants.size} participants)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && executeResult && (
            <div>
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '64px', color: '#10B981', marginBottom: '16px' }}></i>
                <h3 style={{ color: '#166534', marginBottom: '24px' }}>Import terminé!</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', backgroundColor: '#DCFCE7', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534' }}>{executeResult.summary.imported}</div>
                  <div style={{ fontSize: '13px', color: '#166534' }}>Participants ajoutés</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#FEF3C7', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400E' }}>{executeResult.summary.createdAndImported}</div>
                  <div style={{ fontSize: '13px', color: '#92400E' }}>Créés et ajoutés</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#FEE2E2', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#991B1B' }}>{executeResult.summary.errors}</div>
                  <div style={{ fontSize: '13px', color: '#991B1B' }}>Erreurs</div>
                </div>
              </div>

              {executeResult.errors.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#991B1B', marginBottom: '12px' }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                    Erreurs lors de l'import
                  </h4>
                  <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #FCA5A5', borderRadius: '8px', backgroundColor: '#FEF2F2' }}>
                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#FEE2E2', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Email</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Raison</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executeResult.errors.map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #FCA5A5' }}>
                            <td style={{ padding: '8px 12px' }}>{item.email}</td>
                            <td style={{ padding: '8px 12px', color: '#991B1B' }}>{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button onClick={() => { onSuccess(); onClose(); }} className="btn btn-primary">
                  <i className="fas fa-check"></i> Terminé
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;
