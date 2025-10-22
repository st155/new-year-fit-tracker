import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { PageLoader } from '@/components/ui/page-loader';

interface RoleBasedRouteProps {
  children: React.ReactNode;
}

export const RoleBasedRoute = ({ children }: RoleBasedRouteProps) => {
  const { role, loading } = useUserRole();

  if (loading) {
    return <PageLoader message="Проверка роли..." />;
  }

  if (role === 'trainer') {
    return <Navigate to="/trainer-dashboard" replace />;
  }

  return <>{children}</>;
};
