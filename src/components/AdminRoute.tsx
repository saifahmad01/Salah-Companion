import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authStorage } from '../services/backendApi';
import { DashboardSkeleton } from './SkeletonLoaders';

interface AdminRouteProps {
  children: React.ReactElement;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading, setBanner } = useAuth();
  const location = useLocation();
  const hasToken = !!authStorage.getToken();

  if (!hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'ADMIN') {
    setBanner({
      type: 'error',
      message: 'Access denied: Your account does not have administrative privileges.',
    });
    return <Navigate to="/app" replace />;
  }

  return children;
};
