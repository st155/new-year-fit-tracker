import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthLoadingSkeleton } from '@/components/ui/auth-skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('🛡️ [ProtectedRoute] Render', {
    timestamp: new Date().toISOString(),
    pathname: location.pathname,
    hasUser: !!user,
    userId: user?.id,
    loading
  });

  useEffect(() => {
    if (!loading && !user) {
      console.log('🚫 [ProtectedRoute] User not authenticated, redirecting to /auth', {
        from: location.pathname
      });
      navigate('/auth');
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    console.log('⏳ [ProtectedRoute] Loading authentication state');
    return <AuthLoadingSkeleton />;
  }

  if (!user) {
    console.log('🚫 [ProtectedRoute] No user, rendering null while redirecting');
    return null;
  }

  console.log('✅ [ProtectedRoute] User authenticated, rendering children');
  return <>{children}</>;
}