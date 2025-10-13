import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, children }) => {
  return (
    <header className="main-header">
      <h1>{title}</h1>
      <div className="header-actions">
        {children}
      </div>
    </header>
  );
};

export default PageHeader;
