import { useAuth } from '@/hooks/useAuth';
import { DataQualityMonitoring } from '@/components/admin/DataQualityMonitoring';
import { TerraTokenAdmin } from '@/components/admin/TerraTokenAdmin';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldAlert, Activity, Link2 } from 'lucide-react';

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
      <Tabs defaultValue="data-quality" className="space-y-6">
        <TabsList>
          <TabsTrigger value="data-quality" className="gap-2">
            <Activity className="h-4 w-4" />
            Data Quality
          </TabsTrigger>
          <TabsTrigger value="terra-tokens" className="gap-2">
            <Link2 className="h-4 w-4" />
            Terra Tokens
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="data-quality">
          <DataQualityMonitoring />
        </TabsContent>
        
        <TabsContent value="terra-tokens">
          <TerraTokenAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}
