import { useState } from 'react';
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
import { Settings, Plus, Trash2, Info } from 'lucide-react';
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

interface WidgetSettingsProps {
  widgets: Widget[];
  onAdd: (metricName: string) => void;
  onRemove: (widgetId: string) => void;
  onReorder: (newOrder: Widget[]) => void;
}

// Available metrics (source is selected automatically)
const AVAILABLE_METRICS = [
  // Habits 3.0 виджеты
  '🏆 Habit Level',
  '🔥 Habit Streaks',
  '🤝 Habit Social',
  // Обычные метрики
  'Steps',
  'Active Calories',
  'Sleep Duration',
  'Resting Heart Rate',
  'Recovery Score',
  'Day Strain',
  'Max Heart Rate',
  'Weight',
  'Body Fat Percentage',
  'HRV RMSSD',
  'Sleep Efficiency',
  'Training Readiness',
  'VO2Max',
  'Muscle Mass',
  'Workout Calories',
  'Sleep Performance',
  'Average Heart Rate',
  'BMR',
  'Visceral Fat',
  'Body Water',
];

export function WidgetSettings({ 
  widgets, 
  onAdd, 
  onRemove, 
  onReorder 
}: WidgetSettingsProps) {
  const [open, setOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        title: 'Режим обновлен',
        description: 'Настройки виджета сохранены',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить настройки виджета',
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
        title: 'Виджет уже добавлен',
        description: `Метрика "${selectedMetric}" уже есть на дашборде`,
        variant: 'destructive',
      });
      return;
    }

    if (widgets.length >= 20) {
      toast({
        title: 'Достигнут лимит',
        description: 'Максимум 20 виджетов на дашборде',
        variant: 'destructive',
      });
      return;
    }

    onAdd(selectedMetric);
    setSelectedMetric('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Настроить виджеты
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Настройка виджетов</DialogTitle>
          <DialogDescription>
            Добавьте или удалите виджеты. Максимум 20 виджетов.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Widget Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium">Добавить виджет</h3>
            
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Метрика</label>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите метрику" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_METRICS.map((metric) => (
                      <SelectItem key={metric} value={metric}>
                        {metric}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-md">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Источник данных выбирается автоматически из всех подключенных устройств
                </span>
              </div>

              <Button 
                onClick={handleAdd} 
                disabled={!selectedMetric || widgets.length >= 20}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить виджет
              </Button>
            </div>

            {widgets.length >= 20 && (
              <p className="text-sm text-destructive">
                Достигнут максимум виджетов (20)
              </p>
            )}
          </div>

          {/* Current Widgets List */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">
              Текущие виджеты ({widgets.length})
            </h3>
            
            {widgets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет виджетов. Добавьте первый виджет выше.
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
                        Позиция: {index + 1}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Все источники
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
