import { Navigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles, normalizeRoleTypes } from '../app/RoleProtectedRoute';
import { getRedirectPathByRoles } from '../hooks/useRedirectByRole';

export default function DashboardRedirectPage() {
  const { user } = useAuth();
  const levels = normalizeRoles(user);
  const types = normalizeRoleTypes(user);
  const path = getRedirectPathByRoles(levels, types);
  return <Navigate to={path} replace />;
}

