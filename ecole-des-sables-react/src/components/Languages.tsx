import React, { useState, useEffect, useCallback } from 'react';
import { Language, LanguageCreateData, LanguageUpdateData } from '../types/Language';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';
import Pagination from './Pagination';

const ITEMS_PER_PAGE = 9; // 3x3 grid

const Languages: React.FC = () => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [filteredLanguages, setFilteredLanguages] = useState<Language[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  const filterLanguages = useCallback(() => {
    let filtered = languages.filter(language => {
      const matchesSearch = language.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           language.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (language.nativeName && language.nativeName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' ||
                           (statusFilter === 'active' && language.isActive) ||
                           (statusFilter === 'inactive' && !language.isActive);
      return matchesSearch && matchesStatus;
    });
    setFilteredLanguages(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [languages, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLanguages.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLanguages = filteredLanguages.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const loadLanguages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getLanguages();
      const languagesData = Array.isArray(response) ? response : (response.results || response.languages || []);
      setLanguages(languagesData);
      setFilteredLanguages(languagesData);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors du chargement des langues');
      setLanguages([]);
      setFilteredLanguages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  useEffect(() => {
    filterLanguages();
  }, [filterLanguages]);

  const handleCreateLanguage = async (languageData: LanguageCreateData) => {
    try {
      setLoading(true);
      const newLanguage = await apiService.createLanguage(languageData);
      await loadLanguages();
      setShowCreateModal(false);
      showAlert('success', `Langue ${newLanguage.name} créée avec succès`);
    } catch (error: any) {
      const errorMessage = error.data?.code?.[0] || error.data?.name?.[0] || error.message || 'Erreur lors de la création de la langue';
      showAlert('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLanguage = async (id: number, updates: LanguageUpdateData) => {
    try {
      setLoading(true);
      const updatedLanguage = await apiService.updateLanguage(id, updates);
      await loadLanguages();
      setEditingLanguage(null);
      showAlert('success', `Langue ${updatedLanguage.name} modifiée avec succès`);
    } catch (error: any) {
      const errorMessage = error.data?.code?.[0] || error.data?.name?.[0] || error.data?.isActive?.[0] || error.message || 'Erreur lors de la modification de la langue';
      showAlert('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLanguage = async (id: number) => {
    const language = languages.find(l => l.id === id);
    if (language) {
      setConfirmModal({
        isOpen: true,
        title: 'Supprimer la langue',
        message: `Êtes-vous sûr de vouloir supprimer la langue ${language.name} ?\n\nCette action est irréversible.`,
        type: 'danger',
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          try {
            setLoading(true);
            await apiService.deleteLanguage(id);
            await loadLanguages();
            showAlert('warning', `Langue ${language.name} supprimée`);
          } catch (error: any) {
            const errorMessage = error.data?.error || error.message || 'Erreur lors de la suppression de la langue';
            showAlert('error', errorMessage);
          } finally {
            setLoading(false);
          }
        }
      });
    }
  };

  const handleToggleActive = async (language: Language) => {
    try {
      await apiService.updateLanguage(language.id, { isActive: !language.isActive });
      await loadLanguages();
      showAlert('success', `Langue ${language.name} ${!language.isActive ? 'activée' : 'désactivée'}`);
    } catch (error: any) {
      showAlert('error', error.message || 'Erreur lors de la modification');
    }
  };

  // Statistiques
  const stats = {
    total: languages.length,
    active: languages.filter(l => l.isActive).length,
    inactive: languages.filter(l => !l.isActive).length,
    totalParticipants: languages.reduce((sum, l) => sum + (l.participantCount || 0), 0)
  };

  return (
    <div style={{ padding: '0 1.5rem 1.5rem' }}>
      {/* Alert System */}
      {alert && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          background: alert.type === 'success' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' :
                      alert.type === 'error' ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' :
                      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          color: 'white',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'slideIn 0.3s ease'
        }}>
          <i className={`fas ${alert.type === 'success' ? 'fa-check-circle' : alert.type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}`}></i>
          <span style={{ fontWeight: '500' }}>{alert.message}</span>
          <button
            onClick={() => setAlert(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              marginLeft: '0.5rem'
            }}
          >
            <i className="fas fa-times" style={{ fontSize: '0.7rem' }}></i>
          </button>
        </div>
      )}

      {/* Header sobre - Thème blanc */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        borderLeft: '4px solid #DC2626'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-language" style={{ fontSize: '1.5rem', color: '#DC2626' }}></i>
            </div>
            <div>
              <h1 style={{ margin: 0, color: '#1F2937', fontSize: '1.5rem', fontWeight: '700' }}>
                Gestion des Langues
              </h1>
              <p style={{ margin: '0.25rem 0 0', color: '#6B7280', fontSize: '0.85rem' }}>
                Gérez les langues disponibles pour les participants
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
              transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.3)';
              }}
            >
              <i className="fas fa-plus"></i>
              Ajouter une langue
            </button>
        </div>
      </div>

      {/* Stats Cards - Thème blanc */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {[
          { label: 'Total', value: stats.total, icon: 'fas fa-globe', color: '#6B7280', bg: '#F9FAFB' },
          { label: 'Actives', value: stats.active, icon: 'fas fa-check-circle', color: '#10B981', bg: '#ECFDF5' },
          { label: 'Inactives', value: stats.inactive, icon: 'fas fa-pause-circle', color: '#F59E0B', bg: '#FEF3C7' },
          { label: 'Participants', value: stats.totalParticipants, icon: 'fas fa-users', color: '#DC2626', bg: '#FEF2F2' }
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
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: stat.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className={stat.icon} style={{ color: stat.color, fontSize: '1rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1F2937' }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <i className="fas fa-search" style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9CA3AF',
            fontSize: '0.9rem'
          }}></i>
          <input
            type="text"
            placeholder="Rechercher une langue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.875rem 1rem 0.875rem 2.75rem',
              fontSize: '0.95rem',
              border: '2px solid #E5E7EB',
              borderRadius: '12px',
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#DC2626';
              e.target.style.boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'active', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: statusFilter === status ? '#DC2626' : '#F3F4F6',
                color: statusFilter === status ? 'white' : '#6B7280',
                boxShadow: 'none'
              }}
            >
              {status === 'all' ? 'Toutes' : status === 'active' ? 'Actives' : 'Inactives'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu principal */}
      {loading ? (
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '4rem',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '4px solid #E5E7EB',
            borderTopColor: '#DC2626',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#6B7280', fontSize: '1rem' }}>Chargement des langues...</p>
        </div>
      ) : filteredLanguages.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, #FAFBFC 0%, #F1F5F9 100%)',
          borderRadius: '24px',
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '2px dashed #E2E8F0'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)',
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fas fa-language" style={{ fontSize: '2rem', color: '#94A3B8' }}></i>
          </div>
          <h3 style={{ color: '#475569', marginBottom: '0.5rem', fontWeight: '600' }}>
            {searchTerm ? 'Aucun résultat' : 'Aucune langue'}
          </h3>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {searchTerm ? `Aucune langue ne correspond à "${searchTerm}"` : 'Ajoutez votre première langue pour commencer'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
              }}
            >
              <i className="fas fa-plus"></i>
              Ajouter une langue
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {paginatedLanguages.map((language) => (
            <div
              key={language.id}
              style={{
                background: 'white',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
              }}
            >
              {/* Header de la carte - Design blanc sobre */}
              <div style={{
                padding: '1.25rem',
                borderBottom: '1px solid #F3F4F6'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Code badge */}
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '12px',
                      background: language.isActive ? '#FEF2F2' : '#F3F4F6',
                      border: language.isActive ? '2px solid #FECACA' : '2px solid #E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: '800',
                      color: language.isActive ? '#DC2626' : '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      {language.code}
                    </div>
                    <div>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        color: '#1F2937'
                      }}>
                        {language.name}
                      </h3>
                      {language.nativeName && (
                        <p style={{
                          margin: '0.25rem 0 0',
                          fontSize: '0.85rem',
                          color: '#6B7280',
                          fontStyle: 'italic'
                        }}>
                          {language.nativeName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(language);
                    }}
                    style={{
                      background: language.isActive ? '#ECFDF5' : '#F3F4F6',
                      border: language.isActive ? '1px solid #A7F3D0' : '1px solid #E5E7EB',
                      borderRadius: '20px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: language.isActive ? '#059669' : '#6B7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: language.isActive ? '#10B981' : '#9CA3AF',
                      boxShadow: language.isActive ? '0 0 6px rgba(16, 185, 129, 0.4)' : 'none'
                    }}></span>
                    {language.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              {/* Corps de la carte */}
              <div style={{ padding: '1.25rem' }}>
                {/* Statistiques */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: language.participantCount && language.participantCount > 0 ? '#10B981' : '#9CA3AF'
                    }}>
                      {language.participantCount || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', marginTop: '0.25rem' }}>
                      <i className="fas fa-users" style={{ marginRight: '0.3rem' }}></i>
                      Participants
                    </div>
                  </div>
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#6366F1'
                    }}>
                      #{language.displayOrder}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', marginTop: '0.25rem' }}>
                      <i className="fas fa-sort" style={{ marginRight: '0.3rem' }}></i>
                      Ordre
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #F1F5F9'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLanguage(language);
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: 'white',
                      color: '#6B7280',
                      border: '2px solid #E5E7EB',
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F9FAFB';
                      e.currentTarget.style.borderColor = '#DC2626';
                      e.currentTarget.style.color = '#DC2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.color = '#6B7280';
                    }}
                  >
                    <i className="fas fa-pen" style={{ fontSize: '0.75rem' }}></i>
                    Modifier
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLanguage(language.id);
                    }}
                    style={{
                      width: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#FEF2F2',
                      color: '#EF4444',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
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
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredLanguages.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={filteredLanguages.length}
        />
      )}

      {/* Info footer */}
      {filteredLanguages.length > 0 && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem 1.5rem',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i className="fas fa-info-circle" style={{ color: '#6B7280', fontSize: '1rem' }}></i>
            <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>
              <strong style={{ color: '#1F2937' }}>{filteredLanguages.length}</strong> langue{filteredLanguages.length > 1 ? 's' : ''} au total
              {searchTerm && <> pour "{searchTerm}"</>}
            </span>
          </div>
          {totalPages > 1 && (
            <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>
              Page <strong style={{ color: '#1F2937' }}>{currentPage}</strong> sur <strong style={{ color: '#1F2937' }}>{totalPages}</strong>
              {' '}({startIndex + 1}-{Math.min(endIndex, filteredLanguages.length)} affichées)
            </span>
          )}
        </div>
      )}

      {/* Animations CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {showCreateModal && <CreateLanguageModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateLanguage} />}
      {editingLanguage && <EditLanguageModal language={editingLanguage} onClose={() => setEditingLanguage(null)} onEdit={handleEditLanguage} />}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmModal.type}
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </div>
  );
};

const CreateLanguageModal: React.FC<{
  onClose: () => void;
  onCreate: (data: LanguageCreateData) => void;
}> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState<LanguageCreateData>({
    code: '',
    name: '',
    nativeName: '',
    isActive: true,
    displayOrder: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3)'
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '1.75rem 2rem',
          background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)'
          }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-plus" style={{ fontSize: '1.25rem', color: 'white' }}></i>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: 'white' }}>
                  Nouvelle Langue
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                  Ajouter une langue au système
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Code + Ordre sur la même ligne */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Code <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="FR"
                  required
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    fontSize: '1rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    outline: 'none',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    fontWeight: '700',
                    letterSpacing: '2px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#DC2626';
                    e.target.style.boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    fontSize: '1rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#DC2626';
                    e.target.style.boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Nom de la langue */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Nom de la langue <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Français"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  fontSize: '1rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#DC2626';
                  e.target.style.boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Nom Natif */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Nom natif
              </label>
              <input
                type="text"
                value={formData.nativeName}
                onChange={(e) => setFormData({...formData, nativeName: e.target.value})}
                placeholder="Français"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  fontSize: '1rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#DC2626';
                  e.target.style.boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <small style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem', color: '#9CA3AF' }}>
                Nom de la langue dans sa propre langue
              </small>
            </div>

            {/* Langue active */}
            <div style={{
              padding: '1rem',
              background: formData.isActive ? '#ECFDF5' : '#F9FAFB',
              borderRadius: '12px',
              border: formData.isActive ? '2px solid #10B981' : '2px solid #E5E7EB',
              transition: 'all 0.2s'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer'
              }}>
                <div style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  background: formData.isActive ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#D1D5DB',
                  position: 'relative',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }} onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: formData.isActive ? '25px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s'
                  }}></div>
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#374151' }}>
                    {formData.isActive ? 'Langue active' : 'Langue inactive'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                    {formData.isActive ? 'Disponible pour sélection' : 'Non disponible pour sélection'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            marginTop: '2rem',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.875rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#6B7280',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.background = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.background = 'white';
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              style={{
                padding: '0.875rem 2rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.4)';
              }}
            >
              <i className="fas fa-check"></i>
              Créer la langue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditLanguageModal: React.FC<{
  language: Language;
  onClose: () => void;
  onEdit: (id: number, updates: LanguageUpdateData) => void;
}> = ({ language, onClose, onEdit }) => {
  const [formData, setFormData] = useState<LanguageUpdateData>({
    code: language.code,
    name: language.name,
    nativeName: language.nativeName || '',
    isActive: language.isActive,
    displayOrder: language.displayOrder
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEdit(language.id, formData);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3)'
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '1.75rem 2rem',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)'
          }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                fontWeight: '800',
                color: 'white'
              }}>
                {language.code}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: 'white' }}>
                  Modifier la Langue
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                  {language.name}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Code + Ordre sur la même ligne */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Code <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="FR"
                  required
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    fontSize: '1rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    outline: 'none',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    fontWeight: '700',
                    letterSpacing: '2px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    fontSize: '1rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Nom de la langue */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Nom de la langue <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Français"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  fontSize: '1rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Nom Natif */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Nom natif
              </label>
              <input
                type="text"
                value={formData.nativeName}
                onChange={(e) => setFormData({...formData, nativeName: e.target.value})}
                placeholder="Français"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  fontSize: '1rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Langue active */}
            <div style={{
              padding: '1rem',
              background: formData.isActive ? '#ECFDF5' : '#F9FAFB',
              borderRadius: '12px',
              border: formData.isActive ? '2px solid #10B981' : '2px solid #E5E7EB',
              transition: 'all 0.2s'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer'
              }}>
                <div style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  background: formData.isActive ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#D1D5DB',
                  position: 'relative',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }} onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: formData.isActive ? '25px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s'
                  }}></div>
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#374151' }}>
                    {formData.isActive ? 'Langue active' : 'Langue inactive'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                    {formData.isActive ? 'Disponible pour sélection' : 'Non disponible pour sélection'}
                  </div>
                </div>
              </label>

              {language.participantCount && language.participantCount > 0 && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  background: '#FEF3C7',
                  borderRadius: '10px',
                  border: '1px solid #FCD34D',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ color: '#D97706' }}></i>
                  <span style={{ fontSize: '0.85rem', color: '#92400E' }}>
                    Utilisée par <strong>{language.participantCount}</strong> participant{language.participantCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{
            marginTop: '2rem',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.875rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#6B7280',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.background = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.background = 'white';
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              style={{
                padding: '0.875rem 2rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
              }}
            >
              <i className="fas fa-check"></i>
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Languages;
