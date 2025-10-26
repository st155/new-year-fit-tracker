import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

interface TrainerOnlyRouteProps {
  children: React.ReactNode;
}

export const TrainerOnlyRoute = ({ children }: TrainerOnlyRouteProps) => {
  const { isTrainer, loading, rolesLoading } = useAuth();
  const location = useLocation();

  // Wait for both auth and roles to load
  if (loading || rolesLoading) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:'16px',background:'#000',color:'#f0f'}}>
        <div>🔄 Checking trainer access... (TrainerOnlyRoute)</div>
      </div>
    );
  }

  if (!isTrainer) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};
