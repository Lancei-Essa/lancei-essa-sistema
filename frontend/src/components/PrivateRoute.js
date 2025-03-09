import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();

  // Log detalhado
  console.log("PrivateRoute State:", JSON.stringify({
    isAuthenticated,
    loading,
    user
  }, null, 2));

  if (loading) {
    return <div>Carregando...</div>;
  }

  // Se não estiver autenticado, redireciona para /login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
