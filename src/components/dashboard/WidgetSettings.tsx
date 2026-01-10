import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Settings, Plus, Trash2, Info, Sparkles, Loader2, Database } from 'lucide-react';
import { Widget } from '@/hooks/useWidgetsQuery';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { widgetKeys } from '@/hooks/useWidgetsQuery';
import { useAIWidgetSuggestions } from '@/hooks/useAIWidgetSuggestions';
import { useAuth } from '@/hooks/useAuth';
import { useAvailableMetrics } from '@/hooks/useAvailableMetrics';

// Habit widgets that are always available (not from unified_metrics)
const SPECIAL_WIDGETS = [
  '🏆 Habit Level',
  '🔥 Habit Streaks',
  '🤝 Habit Social',
];

interface WidgetSettingsProps {
  widgets: Widget[];
  onAdd: (metricName: string) => void;
  onRemove: (widgetId: string) => void;
  onReorder: (newOrder: Widget[]) => void;
}

export function WidgetSettings({ 
  widgets, 
  onAdd, 
  onRemove, 
  onReorder 
}: WidgetSettingsProps) {
  const [open, setOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [addingAI, setAddingAI] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');
  
  const { data: aiSuggestions = [], isLoading: aiLoading } = useAIWidgetSuggestions(user?.id, widgets);
  const { data: availableMetrics = [], isLoading: metricsLoading } = useAvailableMetrics(user?.id);
  
  // Combine database metrics with special widgets, filter out already added
  const addedMetricNames = useMemo(() => new Set(widgets.map(w => w.metric_name)), [widgets]);
  
  const filteredMetrics = useMemo(() => {
    // Get metrics from database that aren't already added
    const dbMetrics = availableMetrics
      .filter(m => !addedMetricNames.has(m.metric_name))
      .map(m => ({ name: m.metric_name, dataPoints: m.data_points }));
    
    // Get special widgets that aren't already added
    const specialMetrics = SPECIAL_WIDGETS
      .filter(name => !addedMetricNames.has(name))
      .map(name => ({ name, dataPoints: null as number | null }));
    
    // Special widgets first, then db metrics sorted by data points
    return [...specialMetrics, ...dbMetrics];
  }, [availableMetrics, addedMetricNames]);

  const updateDisplayModeMutation = useMutation({
    mutationFn: async ({ widgetId, mode }: { widgetId: string; mode: 'single' | 'multi' }) => {
      const { error } = await supabase
        .from('dashboard_widgets')
        .update({ display_mode: mode })
        .eq('id', widgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: widgetKeys.all });
      toast({
        title: t('widgets.modeUpdated'),
        description: t('widgets.settingsSaved'),
      });
    },
    onError: (error) => {
      toast({
        title: t('widgets.error'),
        description: t('widgets.updateError'),
        variant: 'destructive',
      });
    },
  });

  const handleDisplayModeChange = (widgetId: string, isMulti: boolean) => {
    updateDisplayModeMutation.mutate({
      widgetId,
      mode: isMulti ? 'multi' : 'single',
    });
  };

  const handleAdd = () => {
    if (!selectedMetric) return;

    // Check if widget already exists
    const exists = widgets.some(w => w.metric_name === selectedMetric);
    if (exists) {
      toast({
        title: t('widgets.alreadyAdded'),
        description: t('widgets.metricExists', { metric: selectedMetric }),
        variant: 'destructive',
      });
      return;
    }

    if (widgets.length >= 20) {
      toast({
        title: t('widgets.limitReached'),
        description: t('widgets.maxWidgets'),
        variant: 'destructive',
      });
      return;
    }

    onAdd(selectedMetric);
    setSelectedMetric('');
  };

  const handleAddAllAI = async () => {
    if (aiSuggestions.length === 0) return;
    
    setAddingAI(true);
    try {
      const availableSlots = 20 - widgets.length;
      const toAdd = aiSuggestions.slice(0, availableSlots);
      
      for (const suggestion of toAdd) {
        onAdd(suggestion.metric_name);
        // Небольшая задержка между добавлениями для корректной работы
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      toast({
        title: t('widgets.widgetsAdded'),
        description: t('widgets.addedCount', { count: toAdd.length }),
      });
    } catch (error) {
      toast({
        title: t('widgets.error'),
        description: t('widgets.addAllError'),
        variant: 'destructive',
      });
    } finally {
      setAddingAI(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="md:w-auto md:px-3 md:gap-2 h-10 md:h-9"
          title={t('widgets.configureBtn')}
        >
          <Settings className="h-4 w-4 text-green-500" />
          <span className="hidden md:inline">{t('widgets.configureBtn')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('widgets.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('widgets.dialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Suggestions Section */}
          {aiSuggestions.length > 0 && widgets.length < 20 && (
            <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h3 className="font-medium">{t('widgets.aiRecs')}</h3>
                <Badge variant="secondary">{aiSuggestions.length}</Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {t('widgets.aiRecsDesc')}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {aiSuggestions.map((suggestion) => (
                  <Badge 
                    key={suggestion.metric_name} 
                    variant="outline" 
                    className="py-1.5 px-3 bg-background/50"
                  >
                    {suggestion.metric_name}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({suggestion.dataPoints})
                    </span>
                  </Badge>
                ))}
              </div>
              
              <Button 
                onClick={handleAddAllAI} 
                disabled={addingAI || widgets.length >= 20}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {addingAI ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {t('widgets.addAllRecs', { count: Math.min(aiSuggestions.length, 20 - widgets.length) })}
              </Button>
            </div>
          )}
          
          {aiLoading && (
            <div className="border rounded-lg p-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('widgets.analyzing')}</span>
            </div>
          )}

          {/* Add Widget Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{t('widgets.addManual')}</h3>
              {metricsLoading && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{t('widgets.loadingMetrics', 'Loading...')}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('widgets.metric')}</label>
                  <span className="text-xs text-muted-foreground">
                    <Database className="h-3 w-3 inline mr-1" />
                    {filteredMetrics.length} {t('widgets.available', 'available')}
                  </span>
                </div>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('widgets.selectMetric')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredMetrics.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        {t('widgets.allAdded', 'All available metrics are already added')}
                      </div>
                    ) : (
                      filteredMetrics.map((metric) => (
                        <SelectItem key={metric.name} value={metric.name}>
                          <span className="flex items-center gap-2">
                            <span>{metric.name}</span>
                            {metric.dataPoints !== null && (
                              <span className="text-xs text-muted-foreground">
                                ({metric.dataPoints})
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-md">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  {t('widgets.autoSource')}
                </span>
              </div>

              <Button 
                onClick={handleAdd} 
                disabled={!selectedMetric || widgets.length >= 20 || filteredMetrics.length === 0}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('widgets.addWidget')}
              </Button>
            </div>
            {widgets.length >= 20 && (
              <p className="text-sm text-destructive">
                {t('widgets.maxReached')}
              </p>
            )}
          </div>

          {/* Current Widgets List */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">
              {t('widgets.currentWidgets', { count: widgets.length })}
            </h3>
            
            {widgets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('widgets.noWidgets')}
              </p>
            ) : (
              <div className="space-y-2">
                {widgets.map((widget, index) => (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{widget.metric_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('widgets.position', { pos: index + 1 })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {t('widgets.allSources')}
                        </span>
                        <Switch
                          checked={widget.display_mode === 'multi'}
                          onCheckedChange={(checked) => handleDisplayModeChange(widget.id, checked)}
                          disabled={updateDisplayModeMutation.isPending}
                        />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(widget.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
