import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      // Afficher toutes les pages si peu de pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logique pour afficher: 1 ... 4 5 6 ... 10
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      marginTop: '1rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Info sur les éléments affichés */}
      <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
        Affichage de <strong>{startItem}</strong> à <strong>{endItem}</strong> sur <strong>{totalItems}</strong> élément{totalItems > 1 ? 's' : ''}
      </div>

      {/* Boutons de pagination */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {/* Bouton Précédent */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: currentPage === 1 ? '#F3F4F6' : 'white',
            color: currentPage === 1 ? '#9CA3AF' : '#374151',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.borderColor = '#6366F1';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }
          }}
        >
          <i className="fas fa-chevron-left" style={{ fontSize: '0.75rem' }}></i>
        </button>

        {/* Numéros de page */}
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span style={{ color: '#9CA3AF', padding: '0 0.25rem' }}>...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                style={{
                  padding: '0.5rem 0.75rem',
                  minWidth: '2.5rem',
                  backgroundColor: currentPage === page ? '#6366F1' : 'white',
                  color: currentPage === page ? 'white' : '#374151',
                  border: currentPage === page ? 'none' : '1px solid #E5E7EB',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: currentPage === page ? '600' : '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== page) {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#6366F1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== page) {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }
                }}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        {/* Bouton Suivant */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: currentPage === totalPages ? '#F3F4F6' : 'white',
            color: currentPage === totalPages ? '#9CA3AF' : '#374151',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.borderColor = '#6366F1';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }
          }}
        >
          <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
