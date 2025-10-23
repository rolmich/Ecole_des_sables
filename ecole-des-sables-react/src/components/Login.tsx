import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      setErrorMessage(error.message || 'Échec de la connexion. Veuillez vérifier vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-body">
      <div className="login-container">
        <div className="login-card">
          <div className="logo-section">
            <div className="logo">
              <div className="logo-text">
                <div className="logo-line logo-red">ECOLE</div>
                <div className="logo-line logo-maroon">DES</div>
                <div className="logo-line logo-dark">SABLES</div>
              </div>
            </div>
            <p className="subtitle">Centre International des Danses Africaines</p>
          </div>
          
          <form onSubmit={handleSubmit} className="login-form">
            <h2>Connexion</h2>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eds.sn"
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
            
            {errorMessage && (
              <div style={{ color: 'var(--error)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
                {errorMessage}
              </div>
            )}
            
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Connexion en cours...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  Se connecter
                </>
              )}
            </button>
          </form>
          
          <div className="login-footer">
            <p>Gestion des Logements - Version 1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
