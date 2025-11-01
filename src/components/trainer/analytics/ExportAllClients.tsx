import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function ExportAllClients() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ['trainer-clients-export', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainer_clients')
        .select(`
          client_id,
          profiles:client_id (
            full_name,
            username
          )
        `)
        .eq('trainer_id', user?.id)
        .eq('active', true);

      if (error) throw error;

      // Fetch metrics for each client
      const clientsWithMetrics = await Promise.all(
        data.map(async (client) => {
          const { data: metrics } = await supabase
            .from('unified_metrics')
            .select('*')
            .eq('user_id', client.client_id)
            .gte('measurement_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('measurement_date', { ascending: false });

          const avgRecovery = metrics
            ?.filter(m => m.metric_name === 'Recovery Score')
            .reduce((acc, m) => acc + (m.value || 0), 0) / 
            (metrics?.filter(m => m.metric_name === 'Recovery Score').length || 1);

          const avgSleep = metrics
            ?.filter(m => m.metric_name === 'Sleep Duration')
            .reduce((acc, m) => acc + (m.value || 0), 0) / 
            (metrics?.filter(m => m.metric_name === 'Sleep Duration').length || 1);

          const steps = metrics
            ?.filter(m => m.metric_name === 'Steps')
            .reduce((acc, m) => acc + (m.value || 0), 0);

          const lastSync = metrics?.[0]?.created_at;

          return {
            name: client.profiles?.full_name || client.profiles?.username || 'Unknown',
            avgRecovery: avgRecovery?.toFixed(1) || 'N/A',
            avgSleep: avgSleep?.toFixed(1) || 'N/A',
            stepsLast7d: steps || 0,
            lastSync: lastSync ? format(new Date(lastSync), 'yyyy-MM-dd HH:mm') : 'Never',
          };
        })
      );

      return clientsWithMetrics;
    },
    enabled: !!user?.id,
  });

  const handleExport = () => {
    if (!clients || clients.length === 0) {
      toast.error('No client data to export');
      return;
    }

    setIsExporting(true);

    try {
      // Create CSV content
      const headers = ['Client Name', 'Avg Recovery', 'Avg Sleep (hrs)', 'Steps (7d)', 'Last Sync'];
      const rows = clients.map(c => [
        c.name,
        c.avgRecovery,
        c.avgSleep,
        c.stepsLast7d,
        c.lastSync,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `clients-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting || !clients || clients.length === 0}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {isExporting ? 'Exporting...' : 'Export All Clients'}
    </Button>
  );
}
