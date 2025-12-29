import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, AlertTriangle, Bell, Download } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { terraApi } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState } from 'react';

export function QuickActionsPanel() {
  const { t } = useTranslation('trainerDashboard');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync all clients mutation
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      setIsSyncing(true);
      const { data: clients, error: clientsError } = await supabase
        .from('trainer_clients')
        .select('client_id')
        .eq('trainer_id', user?.id)
        .eq('active', true);

      if (clientsError) throw clientsError;

      // Trigger sync for each client
      const syncPromises = clients.map(client =>
        terraApi.forceSync(client.client_id)
      );

      await Promise.allSettled(syncPromises);
      return clients.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['trainer-clients'] });
      toast.success(t('quickActions.syncStarted', { count }));
      setIsSyncing(false);
    },
    onError: (error) => {
      console.error('Sync error:', error);
      toast.error(t('quickActions.syncFailed'));
      setIsSyncing(false);
    },
  });

  const actions = [
    {
      icon: RefreshCw,
      label: t('quickActions.syncAll'),
      description: t('quickActions.syncAllDesc'),
      onClick: () => syncAllMutation.mutate(),
      loading: isSyncing,
      variant: 'default' as const,
    },
    {
      icon: FileText,
      label: t('quickActions.weeklyReport'),
      description: t('quickActions.weeklyReportDesc'),
      onClick: () => toast.info(t('quickActions.reportComingSoon')),
      variant: 'outline' as const,
    },
    {
      icon: AlertTriangle,
      label: t('quickActions.resolveConflicts'),
      description: t('quickActions.resolveConflictsDesc'),
      onClick: () => {
        // Scroll to conflicts section or open modal
        const conflictsSection = document.getElementById('conflicts-section');
        conflictsSection?.scrollIntoView({ behavior: 'smooth' });
      },
      variant: 'outline' as const,
    },
    {
      icon: Bell,
      label: t('quickActions.viewAlerts'),
      description: t('quickActions.viewAlertsDesc'),
      onClick: () => toast.info(t('quickActions.alertsComingSoon')),
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Card key={action.label} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <Button
                variant={action.variant}
                className="w-full h-auto flex flex-col items-center gap-2 py-4"
                onClick={action.onClick}
                disabled={action.loading}
              >
                <Icon className={`h-6 w-6 ${action.loading ? 'animate-spin' : ''}`} />
                <div className="text-center">
                  <p className="font-semibold text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </p>
                </div>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
