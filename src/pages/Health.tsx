import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    { name: 'Service Worker', status: 'loading' },
    { name: 'Caches', status: 'loading' },
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
        location: window.location.href,
      }
    });

    // Check 2: Service Worker
    try {
      const supported = 'serviceWorker' in navigator;
      const details: any = { supported, controller: !!navigator.serviceWorker?.controller };
      let message = 'Not supported';
      if (supported) {
        const regs = await navigator.serviceWorker.getRegistrations();
        details.registrations = regs.map(r => ({ scope: r.scope, hasActive: !!r.active, hasWaiting: !!r.waiting, hasInstalling: !!r.installing }));
        message = regs.length ? `Registrations: ${regs.length}` : 'No registrations';
      }
      newChecks.push({ name: 'Service Worker', status: 'ok', message, data: details });
    } catch (error: any) {
      newChecks.push({ name: 'Service Worker', status: 'error', message: error.message });
    }

    // Check 3: Caches
    try {
      const cacheNames = 'caches' in window ? await caches.keys() : [];
      newChecks.push({ name: 'Caches', status: 'ok', message: `Cache keys: ${cacheNames.length}` , data: { cacheNames }});
    } catch (error: any) {
      newChecks.push({ name: 'Caches', status: 'error', message: error.message });
    }

    // Check 4: Supabase Auth
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      newChecks.push({
        name: 'Supabase Auth',
        status: 'ok',
        message: data.session ? 'Authenticated' : 'Not authenticated',
        data: { hasSession: !!data.session, userId: data.session?.user?.id || null }
      });
    } catch (error: any) {
      newChecks.push({ name: 'Supabase Auth', status: 'error', message: error.message });
    }

    // Check 5: Supabase Database
    try {
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .single();
      if (error && (error as any).code !== 'PGRST116') throw error;
      newChecks.push({ name: 'Supabase Database', status: 'ok', message: 'Connection successful' });
    } catch (error: any) {
      newChecks.push({ name: 'Supabase Database', status: 'error', message: error.message });
    }

    setChecks(newChecks);
  };

  const handleRunRecovery = () => {
    try { localStorage.setItem('recoverOnce', '1'); } catch {}
    const url = `${location.origin}${location.pathname}?recover=1${location.hash}`;
    location.href = url;
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
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Overall Status:</span>
            <Badge variant={overallStatus === 'ok' ? 'default' : overallStatus === 'error' ? 'destructive' : 'secondary'}>
              {overallStatus.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={runHealthChecks}>Re-run</Button>
            <Button variant="default" onClick={handleRunRecovery}>Run Recovery now</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Tip: open /?recover=1 to force pre-boot cleanup.</p>
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
