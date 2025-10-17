import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthLoadingSkeleton } from '@/components/ui/auth-skeleton';
import { useUserRole } from '@/hooks/useUserRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Redirect trainer to trainer dashboard if on root path
    if (!roleLoading && role === 'trainer' && location.pathname === '/') {
      navigate('/trainer-dashboard', { replace: true });
    }
  }, [role, roleLoading, location.pathname, navigate]);

  if (loading || roleLoading) {
    return <AuthLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}