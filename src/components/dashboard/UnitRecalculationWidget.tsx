import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { healthApi } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export function UnitRecalculationWidget() {
  const { t } = useTranslation('dashboard');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const queryClient = useQueryClient();

  // Check for unconverted units (pmol/L with high normalized values)
  const { data: needsRecalculation, isLoading } = useQuery({
    queryKey: ['unit-recalculation-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('lab_test_results')
        .select('id, unit, normalized_value, normalized_unit')
        .eq('user_id', user.id)
        .or('unit.eq.pmol/L,unit.eq.pg/mL,unit.eq.ug/L')
        .gt('normalized_value', 100); // Suspiciously high values

      if (error) {
        console.error('Error checking for unconverted units:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const { data, error } = await healthApi.fixUnitConversions();

      if (error) throw error;

      toast.success(t('unitRecalculation.success'), {
        description: t('unitRecalculation.successDesc', { count: data?.updated || 0 }),
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['lab-test-results'] });
      queryClient.invalidateQueries({ queryKey: ['unit-recalculation-check'] });
    } catch (error: any) {
      console.error('Unit recalculation error:', error);
      toast.error(t('unitRecalculation.error'), {
        description: error.message,
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading || !needsRecalculation) {
    return null;
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-yellow-500">
                {t('unitRecalculation.title')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t('unitRecalculation.description')}
              </p>
            </div>
            <Button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isRecalculating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('unitRecalculation.recalculating')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('unitRecalculation.fixButton')}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
