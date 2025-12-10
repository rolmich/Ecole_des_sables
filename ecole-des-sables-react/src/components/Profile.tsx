import React, { useState } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import dataService from '../services/dataService';
import PageHeader from './PageHeader';
import AlertModal from './AlertModal';

const Profile: React.FC = () => {
  const currentUser = useCurrentUser();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setAlertModal({
        isOpen: true,
        message: 'Les mots de passe ne correspondent pas',
        type: 'error'
      });
      return;
    }

    if (newPassword.length < 6) {
      setAlertModal({
        isOpen: true,
        message: 'Le mot de passe doit contenir au moins 6 caractères',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      await dataService.changePassword(oldPassword, newPassword);
      setAlertModal({
        isOpen: true,
        message: 'Mot de passe changé avec succès',
        type: 'success'
      });
      // Réinitialiser les champs
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        message: error.message || 'Erreur lors du changement de mot de passe',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#6366F1' }}></i>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <PageHeader title="Mon Profil" />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem',
        marginTop: '2rem'
      }}>
        {/* Informations personnelles */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-user" style={{ color: '#6366F1' }}></i>
            Informations personnelles
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6B7280', marginBottom: '0.25rem' }}>
                Nom complet
              </label>
              <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                {currentUser.firstName} {currentUser.lastName}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6B7280', marginBottom: '0.25rem' }}>
                Email
              </label>
              <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                {currentUser.email}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6B7280', marginBottom: '0.25rem' }}>
                Nom d'utilisateur
              </label>
              <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                {currentUser.username}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6B7280', marginBottom: '0.25rem' }}>
                Rôle
              </label>
              <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  backgroundColor: currentUser.role === 'admin' ? '#EEF2FF' : '#F3F4F6',
                  color: currentUser.role === 'admin' ? '#6366F1' : '#6B7280'
                }}>
                  {currentUser.role === 'admin' ? 'Administrateur' :
                   currentUser.role === 'manager' ? 'Gestionnaire' :
                   'Staff'}
                </span>
              </div>
            </div>

            {currentUser.phone && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6B7280', marginBottom: '0.25rem' }}>
                  Téléphone
                </label>
                <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  {currentUser.phone}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Changer le mot de passe */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-lock" style={{ color: '#6366F1' }}></i>
            Changer le mot de passe
          </h3>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Ancien mot de passe <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Nouveau mot de passe <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimum 6 caractères"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Confirmer le nouveau mot de passe <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Confirmer le mot de passe"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: loading ? '#9CA3AF' : '#6366F1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                  Changement en cours...
                </>
              ) : (
                <>
                  <i className="fas fa-check" style={{ marginRight: '0.5rem' }}></i>
                  Changer le mot de passe
                </>
              )}
            </button>
          </form>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#92400E'
          }}>
            <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
            Le mot de passe doit contenir au moins 6 caractères
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ isOpen: false, message: '', type: 'info' })}
      />
    </div>
  );
};

export default Profile;
