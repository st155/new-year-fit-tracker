import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthLoadingSkeleton } from '@/components/ui/auth-skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('🔒 [ProtectedRoute] State:', { 
    hasUser: !!user, 
    userId: user?.id,
    loading, 
    path: location.pathname 
  });

  if (loading) {
    console.log('⏳ [ProtectedRoute] Loading auth...');
    return <AuthLoadingSkeleton />;
  }

  if (!user) {
    console.log('🚫 [ProtectedRoute] No user, redirecting to /auth');
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  console.log('✅ [ProtectedRoute] User authenticated, rendering children');
  return <>{children}</>;
}