import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface BeforeAfterCardProps {
  stackItemId: string;
  biomarkerId: string;
}

export function BeforeAfterCard({ stackItemId, biomarkerId }: BeforeAfterCardProps) {
  const { t, i18n } = useTranslation('biostack');
  const dateLocale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  const { data, isLoading } = useQuery({
    queryKey: ['before-after', stackItemId, biomarkerId],
    queryFn: async () => {
      // Get stack item to find start date
      const { data: stackItem } = await supabase
        .from('user_stack')
        .select('start_date')
        .eq('id', stackItemId)
        .single();

      if (!stackItem?.start_date) return null;

      const startDate = new Date(stackItem.start_date);
      
      // Get biomarker value BEFORE supplement started (within 3 months before)
      const threeMonthsBefore = new Date(startDate);
      threeMonthsBefore.setMonth(threeMonthsBefore.getMonth() - 3);
      
      const { data: beforeResults } = await supabase
        .from('lab_test_results')
        .select('normalized_value, normalized_unit, test_date')
        .eq('biomarker_id', biomarkerId)
        .gte('test_date', threeMonthsBefore.toISOString())
        .lt('test_date', startDate.toISOString())
        .order('test_date', { ascending: false })
        .limit(1);

      // Get biomarker value AFTER supplement started (most recent)
      const { data: afterResults } = await supabase
        .from('lab_test_results')
        .select('normalized_value, normalized_unit, test_date')
        .eq('biomarker_id', biomarkerId)
        .gte('test_date', startDate.toISOString())
        .order('test_date', { ascending: false })
        .limit(1);

      // Get biomarker name
      const { data: biomarker } = await supabase
        .from('biomarker_master')
        .select('display_name')
        .eq('id', biomarkerId)
        .single();

      if (!beforeResults?.[0] || !afterResults?.[0]) return null;

      const before = beforeResults[0];
      const after = afterResults[0];
      
      // Calculate change
      const change = ((after.normalized_value - before.normalized_value) / before.normalized_value) * 100;
      
      return {
        biomarkerName: biomarker?.display_name || 'Unknown',
        before: {
          value: before.normalized_value,
          unit: before.normalized_unit,
          date: before.test_date,
        },
        after: {
          value: after.normalized_value,
          unit: after.normalized_unit,
          date: after.test_date,
        },
        change,
      };
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const isImprovement = data.change > 0;
  const changeColor = Math.abs(data.change) < 5 ? 'text-gray-400' : isImprovement ? 'text-green-500' : 'text-red-500';
  const borderColor = Math.abs(data.change) < 5 ? 'border-gray-500/30' : isImprovement ? 'border-green-500/50' : 'border-red-500/50';
  const bgColor = Math.abs(data.change) < 5 ? 'bg-gray-500/5' : isImprovement ? 'bg-green-500/5' : 'bg-red-500/5';

  return (
    <Card className={cn("border transition-all", borderColor, bgColor)}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {isImprovement ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          {data.biomarkerName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('card.before')}</p>
            <p className="text-lg font-semibold">
              {data.before.value} {data.before.unit}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(data.before.date).toLocaleDateString(dateLocale)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-2xl">→</div>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground">{t('card.after')}</p>
            <p className="text-lg font-semibold">
              {data.after.value} {data.after.unit}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(data.after.date).toLocaleDateString(dateLocale)}
            </p>
          </div>
        </div>

        <div className={cn("text-center p-2 rounded-lg border", borderColor)}>
          <p className={cn("text-xl font-bold", changeColor)}>
            {isImprovement ? '+' : ''}{data.change.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.abs(data.change) < 5 
              ? t('card.noChange') 
              : isImprovement 
                ? t('card.improvement') 
                : t('card.decline')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
