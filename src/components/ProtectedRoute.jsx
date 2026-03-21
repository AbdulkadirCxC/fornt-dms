import { Navigate, useLocation } from 'react-router-dom';
import { tokenStorage } from '../api/tokenStorage';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = tokenStorage.getAccess();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
