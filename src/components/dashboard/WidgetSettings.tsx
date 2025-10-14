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
import { Settings, Plus, Trash2, GripVertical } from 'lucide-react';
import { Widget } from '@/hooks/useWidgets';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WidgetSettingsProps {
  widgets: Widget[];
  onAdd: (metricName: string, source: string) => void;
  onRemove: (widgetId: string) => void;
  onReorder: (newOrder: Widget[]) => void;
}

const AVAILABLE_METRICS = [
  { name: 'Steps', sources: ['ultrahuman', 'garmin'] },
  { name: 'Day Strain', sources: ['whoop'] },
  { name: 'Workout Strain', sources: ['whoop'] },
  { name: 'Recovery Score', sources: ['whoop'] },
  { name: 'Sleep Duration', sources: ['whoop', 'garmin'] },
  { name: 'Sleep Performance', sources: ['whoop'] },
  { name: 'Sleep Efficiency', sources: ['whoop', 'garmin'] },
  { name: 'Weight', sources: ['withings'] },
  { name: 'Body Fat Percentage', sources: ['withings'] },
  { name: 'HRV (rMSSD)', sources: ['whoop'] },
  { name: 'Resting HR', sources: ['whoop'] },
  { name: 'Workout Calories', sources: ['whoop'] },
  { name: 'Average Heart Rate', sources: ['whoop', 'garmin'] },
  { name: 'Max Heart Rate', sources: ['whoop', 'garmin'] },
  { name: 'VO2Max', sources: ['garmin'] },
];

export function WidgetSettings({
  widgets,
  onAdd,
  onRemove,
}: WidgetSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  const handleAdd = () => {
    if (selectedMetric && selectedSource) {
      onAdd(selectedMetric, selectedSource);
      setSelectedMetric('');
      setSelectedSource('');
    }
  };

  const availableSources = AVAILABLE_METRICS.find(
    m => m.name === selectedMetric
  )?.sources || [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Метрика
                </label>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите метрику" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_METRICS.map(metric => (
                      <SelectItem key={metric.name} value={metric.name}>
                        {metric.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Источник
                </label>
                <Select 
                  value={selectedSource} 
                  onValueChange={setSelectedSource}
                  disabled={!selectedMetric}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите источник" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSources.map(source => (
                      <SelectItem key={source} value={source}>
                        {source.charAt(0).toUpperCase() + source.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleAdd} 
              disabled={!selectedMetric || !selectedSource || widgets.length >= 20}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Добавить виджет
            </Button>

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
                Нет виджетов
              </p>
            ) : (
              <div className="space-y-2">
                {widgets.map((widget, index) => (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div>
                        <p className="font-medium text-sm">{widget.metric_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {widget.source.charAt(0).toUpperCase() + widget.source.slice(1)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
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
