import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

interface RoleBasedRouteProps {
  children: React.ReactNode;
}

export const RoleBasedRoute = ({ children }: RoleBasedRouteProps) => {
  const { isTrainer, loading } = useAuth();

  if (loading) {
    return <PageLoader message="Проверка роли..." />;
  }

  if (isTrainer) {
    return <Navigate to="/trainer-dashboard" replace />;
  }

  return <>{children}</>;
};
