import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

interface RoleBasedRouteProps {
  children: React.ReactNode;
}

export const RoleBasedRoute = ({ children }: RoleBasedRouteProps) => {
  const { isTrainer, loading, rolesLoading } = useAuth();

  // Wait for both auth and roles to load
  if (loading || rolesLoading) {
    return <PageLoader message="Проверка роли..." />;
  }

  // If trainer/admin, redirect to trainer dashboard
  if (isTrainer) {
    return <Navigate to="/trainer-dashboard" replace />;
  }

  return <>{children}</>;
};
