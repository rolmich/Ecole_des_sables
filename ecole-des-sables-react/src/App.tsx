import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Stages from './components/Stages';
import Participants from './components/Participants';
import Villages from './components/Villages';
import Assignments from './components/Assignments';
import Reports from './components/Reports';
import Users from './components/Users';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="stages" element={<Stages />} />
            <Route path="participants" element={<Participants />} />
            <Route path="villages" element={<Villages />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;



