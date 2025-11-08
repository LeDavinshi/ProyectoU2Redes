import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Guardar la ruta a la que intentaba acceder
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}