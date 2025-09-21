import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  console.log('ProtectedRoute: user=', user?.email || 'null', 'loading=', loading);

  useEffect(() => {
    if (!loading && !user) {
      console.log('ProtectedRoute: Redirecting to /auth');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;