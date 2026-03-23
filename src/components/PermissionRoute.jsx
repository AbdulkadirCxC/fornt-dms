import { Navigate } from 'react-router-dom';
import { usePermissions } from '../auth/PermissionContext';

export default function PermissionRoute({ required = [], children }) {
  const { loading, hasAnyPermission } = usePermissions();

  if (loading) return <p>Loading permissions...</p>;
  if (!hasAnyPermission(required)) return <Navigate to="/" replace />;

  return children;
}

