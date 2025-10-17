import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { PageLoader } from '@/components/ui/page-loader';

interface RoleBasedRouteProps {
  children: React.ReactNode;
}

export const RoleBasedRoute = ({ children }: RoleBasedRouteProps) => {
  const { role, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role === 'trainer') {
      navigate('/trainer-dashboard', { replace: true });
    }
  }, [role, loading, navigate]);

  if (loading) {
    return <PageLoader message="Проверка роли..." />;
  }

  if (role === 'trainer') {
    return null;
  }

  return <>{children}</>;
};
