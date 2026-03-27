import { Navigate } from 'react-router-dom';
import { usePermissions } from '../auth/PermissionContext';

export default function PermissionRoute({ required = [], children }) {
  const { loading, permissionsHydrated, hasAnyPermission } = usePermissions();

  if (loading && !permissionsHydrated) return <p>Loading permissions...</p>;
  if (!hasAnyPermission(required)) return <Navigate to="/" replace />;

  return children;
}

