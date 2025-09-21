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

  console.log('ProtectedRoute render:', { user: !!user, loading, email: user?.email });

  useEffect(() => {
    console.log('ProtectedRoute useEffect:', { user: !!user, loading });
    if (!loading && !user) {
      console.log('No user found, redirecting to /auth');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    console.log('ProtectedRoute: showing loader');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: no user, returning null');
    return null;
  }

  console.log('ProtectedRoute: rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;