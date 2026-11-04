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
  const token = authStorage.getToken();
  const isExpired = authStorage.isTokenExpired(token);

  if (!token || isExpired) {
    if (token && isExpired) {
      authStorage.clearToken();
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading && !user) {
    return <DashboardSkeleton />;
  }

  const effectiveUser = user || authStorage.getCachedUser();

  if (effectiveUser && effectiveUser.role !== 'ADMIN') {
    setBanner({
      type: 'error',
      message: 'Access denied: Your account does not have administrative privileges.',
    });
    return <Navigate to="/app" replace />;
  }

  if (effectiveUser && effectiveUser.role === 'ADMIN') {
    return children;
  }

  return <DashboardSkeleton />;
};
