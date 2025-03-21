import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataProvider } from './contexts/DataContext';

// Layout
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Restock from './pages/Restock';
import Items from './pages/Items';
import Warehouses from './pages/Warehouses';
import Optimization from './pages/Optimization';

// Auth Guard
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token');
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token');
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            
            {/* Protected Routes - Main Layout */}
            <Route path="/" element={
              <ProtectedRoute>
                <DataProvider>
                  <Layout />
                </DataProvider>
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="restock" element={<Restock />} />
              <Route path="optimization" element={<Optimization />} />
              <Route path="items" element={<Items />} />
              <Route path="warehouses" element={<Warehouses />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
