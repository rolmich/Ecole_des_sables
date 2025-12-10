import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Stages from './components/Stages';
import StageDetail from './components/StageDetail';
import Participants from './components/Participants';
import Villages from './components/Villages';
import Assignments from './components/Assignments';
import Reports from './components/Reports';
import Users from './components/Users';
import Languages from './components/Languages';
import History from './components/History';
import Profile from './components/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import authService from './services/authService';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Page de connexion */}
          <Route path="/login" element={<Login />} />

          {/* Redirection racine : /login si déconnecté, /dashboard si connecté */}
          <Route
            path="/"
            element={
              authService.isLoggedIn()
                ? <Navigate to="/dashboard" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* Routes protégées */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="stages" element={<Stages />} />
            <Route path="stages/:id" element={<StageDetail />} />
            <Route path="participants" element={<Participants />} />
            <Route path="villages" element={<Villages />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="languages" element={<Languages />} />
            <Route path="history" element={<History />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;



