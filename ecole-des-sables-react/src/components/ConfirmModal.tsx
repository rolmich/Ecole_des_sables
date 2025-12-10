import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Annuler',
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const getTypeColor = () => {
    switch (type) {
      case 'danger':
        return '#EF4444';
      case 'info':
        return '#3B82F6';
      case 'warning':
      default:
        return '#F59E0B';
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'danger':
        return 'fa-exclamation-triangle';
      case 'info':
        return 'fa-info-circle';
      case 'warning':
      default:
        return 'fa-question-circle';
    }
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
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        animation: 'slideDown 0.3s ease-out',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: getTypeColor(),
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className={`fas ${getTypeIcon()}`} style={{
              color: 'white',
              fontSize: '24px'
            }}></i>
          </div>
          <div>
            {title && (
              <h3 style={{
                margin: 0,
                color: 'white',
                fontSize: '1.25rem',
                fontWeight: '700',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {title}
              </h3>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{
          padding: '24px',
          color: '#374151',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          whiteSpace: 'pre-line'
        }}>
          {message}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#F9FAFB',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          borderTop: '1px solid #E5E7EB'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#6B7280',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.borderColor = '#9CA3AF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#D1D5DB';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: getTypeColor(),
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
