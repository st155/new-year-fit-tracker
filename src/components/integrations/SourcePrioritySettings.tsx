import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GripVertical, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricMapping {
  id: string;
  unified_metric_name: string;
  unified_metric_category: string;
  aggregation_method: string;
  priority_order: string[];
  device_mappings: any;
}

export function SourcePrioritySettings() {
  const { t } = useTranslation('integrations');
  const [mappings, setMappings] = useState<MetricMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('metric_mappings')
        .select('*')
        .eq('is_active', true)
        .order('unified_metric_name');

      if (error) throw error;
      setMappings(data || []);
    } catch (error) {
      console.error('Error loading mappings:', error);
      toast({
        title: t('prioritySettings.error'),
        description: t('prioritySettings.loadError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePriority = (mappingId: string, newPriority: string[]) => {
    setMappings(prev =>
      prev.map(m =>
        m.id === mappingId ? { ...m, priority_order: newPriority } : m
      )
    );
  };

  const movePriority = (mappingId: string, source: string, direction: 'up' | 'down') => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (!mapping) return;

    const currentPriority = mapping.priority_order || [];
    const currentIndex = currentPriority.indexOf(source);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= currentPriority.length) return;

    const newPriority = [...currentPriority];
    [newPriority[currentIndex], newPriority[newIndex]] = [newPriority[newIndex], newPriority[currentIndex]];
    
    updatePriority(mappingId, newPriority);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Обновляем приоритеты для всех метрик
      const updates = mappings.map(mapping => 
        supabase
          .from('metric_mappings')
          .update({ priority_order: mapping.priority_order })
          .eq('id', mapping.id)
      );

      await Promise.all(updates);

      toast({
        title: t('prioritySettings.success'),
        description: t('prioritySettings.saved'),
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t('prioritySettings.error'),
        description: t('prioritySettings.saveError'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('prioritySettings.title')}</CardTitle>
              <CardDescription>
                {t('prioritySettings.description')}
              </CardDescription>
            </div>
            <Button onClick={saveSettings} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {t('prioritySettings.save')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mappings.map(mapping => {
              const sources = Object.keys(mapping.device_mappings);
              const priorityOrder = mapping.priority_order || sources;
              
              return (
                <div key={mapping.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{mapping.unified_metric_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('prioritySettings.aggregationMethod')} {mapping.aggregation_method}
                      </p>
                    </div>
                    <Badge variant="outline">{mapping.unified_metric_category}</Badge>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('prioritySettings.priorityOrder')}</label>
                    <div className="space-y-2">
                      {priorityOrder.map((source, index) => (
                        <div
                          key={source}
                          className="flex items-center gap-2 bg-muted/50 rounded-md p-3"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="flex-1 font-medium uppercase">{source}</span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => movePriority(mapping.id, source, 'up')}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => movePriority(mapping.id, source, 'down')}
                              disabled={index === priorityOrder.length - 1}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
