import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: 'ok' | 'error' | 'loading';
  message?: string;
  data?: any;
}

export default function Health() {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { name: 'Build Info', status: 'loading' },
    { name: 'Supabase Auth', status: 'loading' },
    { name: 'Supabase Database', status: 'loading' },
  ]);

  useEffect(() => {
    runHealthChecks();
  }, []);

  const runHealthChecks = async () => {
    const newChecks: HealthCheck[] = [];

    // Check 1: Build info
    newChecks.push({
      name: 'Build Info',
      status: 'ok',
      data: {
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV,
        prod: import.meta.env.PROD,
        timestamp: new Date().toISOString(),
      }
    });

    // Check 2: Supabase Auth
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      newChecks.push({
        name: 'Supabase Auth',
        status: 'ok',
        message: data.session ? 'Authenticated' : 'Not authenticated',
        data: {
          hasSession: !!data.session,
          userId: data.session?.user?.id || null,
        }
      });
    } catch (error: any) {
      newChecks.push({
        name: 'Supabase Auth',
        status: 'error',
        message: error.message,
      });
    }

    // Check 3: Supabase Database
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      newChecks.push({
        name: 'Supabase Database',
        status: 'ok',
        message: 'Connection successful',
      });
    } catch (error: any) {
      newChecks.push({
        name: 'Supabase Database',
        status: 'error',
        message: error.message,
      });
    }

    setChecks(newChecks);
  };

  const StatusIcon = ({ status }: { status: HealthCheck['status'] }) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
  };

  const overallStatus = checks.every(c => c.status === 'ok') ? 'ok' : 
                        checks.some(c => c.status === 'error') ? 'error' : 'loading';

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Health Check</h1>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Overall Status:</span>
          <Badge variant={overallStatus === 'ok' ? 'default' : overallStatus === 'error' ? 'destructive' : 'secondary'}>
            {overallStatus.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {checks.map((check, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StatusIcon status={check.status} />
                {check.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {check.message && (
                <p className="text-sm text-muted-foreground mb-2">{check.message}</p>
              )}
              {check.data && (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(check.data, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
