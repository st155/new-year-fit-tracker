/**
 * ConflictResolutionPanel - UI для разрешения конфликтов данных
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { ConfidenceBadge } from '@/components/data-quality/ConfidenceBadge';
import { getIntlLocale } from '@/lib/date-locale';

interface MetricConflict {
  metric_name: string;
  measurement_date: string;
  values: Array<{
    source: string;
    value: number;
    confidence_score: number;
    priority: number;
  }>;
}

interface ConflictResolutionPanelProps {
  clientId: string;
}

export function ConflictResolutionPanel({ clientId }: ConflictResolutionPanelProps) {
  const { t } = useTranslation('trainer');
  const [conflicts, setConflicts] = useState<MetricConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string[]>([]);

  useEffect(() => {
    loadConflicts();
  }, [clientId]);

  const loadConflicts = async () => {
    try {
      // Find metrics with multiple sources on the same date
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('metric_name, measurement_date, source, value, confidence_score, priority')
        .eq('user_id', clientId)
        .order('measurement_date', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Group by metric_name + date to find conflicts
      const grouped = new Map<string, MetricConflict>();
      
      data?.forEach(row => {
        const key = `${row.metric_name}_${row.measurement_date}`;
        
        if (!grouped.has(key)) {
          grouped.set(key, {
            metric_name: row.metric_name,
            measurement_date: row.measurement_date,
            values: [],
          });
        }
        
        grouped.get(key)!.values.push({
          source: row.source,
          value: row.value,
          confidence_score: row.confidence_score || 50,
          priority: row.priority || 5,
        });
      });

      // Filter only conflicts (more than 1 source with different values)
      const conflictsList = Array.from(grouped.values())
        .filter(item => {
          if (item.values.length < 2) return false;
          const uniqueValues = new Set(item.values.map(v => v.value));
          return uniqueValues.size > 1; // Different values = conflict
        })
        .slice(0, 20); // Show top 20 conflicts

      setConflicts(conflictsList);
    } catch (error) {
      console.error('Error loading conflicts:', error);
      toast.error(t('conflicts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (
    metricName: string,
    date: string,
    preferredSource: string
  ) => {
    const key = `${metricName}_${date}`;
    setResolving(prev => [...prev, key]);

    try {
      // Delete non-preferred sources
      const { error } = await supabase
        .from('unified_metrics')
        .delete()
        .eq('user_id', clientId)
        .eq('metric_name', metricName)
        .eq('measurement_date', date)
        .neq('source', preferredSource);

      if (error) throw error;

      toast.success(t('conflicts.resolved', { source: preferredSource }));
      
      // Reload conflicts
      await loadConflicts();
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error(t('conflicts.resolveError'));
    } finally {
      setResolving(prev => prev.filter(k => k !== key));
    }
  };

  const handleAutoResolve = async (metricName: string, date: string) => {
    const conflict = conflicts.find(
      c => c.metric_name === metricName && c.measurement_date === date
    );
    if (!conflict) return;

    // Auto-select highest confidence or highest priority
    const best = conflict.values.reduce((prev, curr) => {
      if (curr.confidence_score > prev.confidence_score) return curr;
      if (curr.confidence_score === prev.confidence_score && curr.priority < prev.priority) return curr;
      return prev;
    });

    await handleResolve(metricName, date, best.source);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('conflicts.loading')}</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          {t('conflicts.noConflicts')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          {t('conflicts.title')}
        </CardTitle>
        <CardDescription>
          {t('conflicts.found', { count: conflicts.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conflicts.map((conflict, idx) => {
          const key = `${conflict.metric_name}_${conflict.measurement_date}`;
          const isResolving = resolving.includes(key);
          const avgValue = conflict.values.reduce((sum, v) => sum + v.value, 0) / conflict.values.length;
          
          return (
            <div key={idx} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{conflict.metric_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(conflict.measurement_date).toLocaleDateString(getIntlLocale())}
                  </div>
                </div>
                <Button
                  onClick={() => handleAutoResolve(conflict.metric_name, conflict.measurement_date)}
                  disabled={isResolving}
                  size="sm"
                  variant="outline"
                >
                  {t('conflicts.autoResolve')}
                </Button>
              </div>

              <div className="grid gap-2">
                {conflict.values.map((val, valIdx) => {
                  const diff = ((val.value - avgValue) / avgValue * 100).toFixed(1);
                  const isHigher = val.value > avgValue;
                  
                  return (
                    <div
                      key={valIdx}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{val.source}</Badge>
                        <span className="font-mono font-semibold">{val.value}</span>
                        {Math.abs(Number(diff)) > 5 && (
                          <span className={`text-xs flex items-center gap-1 ${isHigher ? 'text-success' : 'text-destructive'}`}>
                            {isHigher ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {diff}%
                          </span>
                        )}
                        <ConfidenceBadge confidence={val.confidence_score} showDetails={false} />
                      </div>
                      <Button
                        onClick={() => handleResolve(conflict.metric_name, conflict.measurement_date, val.source)}
                        disabled={isResolving}
                        size="sm"
                        variant="ghost"
                      >
                        {t('conflicts.select')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
