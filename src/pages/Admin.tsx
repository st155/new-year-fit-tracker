import { useAuth } from '@/hooks/useAuth';
import { DataQualityMonitoring } from '@/components/admin/DataQualityMonitoring';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export default function Admin() {
  const { user, isTrainer } = useAuth();

  // Check if user is admin or trainer
  const isAuthorized = isTrainer;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAuthorized) {
    return (
      <div className="container max-w-4xl py-12">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page. Admin and trainer access only.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      <DataQualityMonitoring />
    </div>
  );
}
