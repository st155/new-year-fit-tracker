import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Eye, EyeOff, GripVertical, Maximize2, Minimize2 } from 'lucide-react';
import { ProgressWidget } from '@/pages/ProgressNew';
import { cn } from '@/lib/utils';

interface ProgressWidgetSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: ProgressWidget[];
  allGoals: any[];
  onUpdate: (widgets: ProgressWidget[]) => void;
}

export function ProgressWidgetSettings({
  open,
  onOpenChange,
  widgets,
  allGoals,
  onUpdate,
}: ProgressWidgetSettingsProps) {
  const [localWidgets, setLocalWidgets] = useState<ProgressWidget[]>(widgets);

  const handleToggleVisibility = (widgetId: string) => {
    const updated = localWidgets.map(w =>
      w.id === widgetId ? { ...w, is_visible: !w.is_visible } : w
    );
    setLocalWidgets(updated);
  };

  const handleSave = () => {
    onUpdate(localWidgets);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalWidgets(widgets);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle>Настройка виджетов прогресса</DialogTitle>
          <DialogDescription>
            Управляйте отображением целей на странице прогресса
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Widgets List */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">
              Виджеты ({localWidgets.filter(w => w.is_visible).length} из {localWidgets.length} видны)
            </h3>
            
            {localWidgets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Нет целей для отображения. Создайте цели в разделе "Цели".
              </p>
            ) : (
              <div className="space-y-2">
                {localWidgets
                  .sort((a, b) => a.position - b.position)
                  .map((widget, index) => {
                    const goalName = widget.goal_name.toLowerCase();
                    let colorClass = 'border-slate-500';
                    
                    if (goalName.includes('вес') || goalName.includes('weight')) colorClass = 'border-green-500';
                    if (goalName.includes('жир') || goalName.includes('fat')) colorClass = 'border-orange-500';
                    if (goalName.includes('подтяг') || goalName.includes('pull')) colorClass = 'border-purple-500';
                    if (goalName.includes('отжим') || goalName.includes('push')) colorClass = 'border-yellow-500';
                    if (goalName.includes('жим') || goalName.includes('bench')) colorClass = 'border-red-500';
                    if (goalName.includes('планк') || goalName.includes('plank')) colorClass = 'border-indigo-500';
                    if (goalName.includes('выпад') || goalName.includes('lunge')) colorClass = 'border-lime-500';
                    if (goalName.includes('vo2')) colorClass = 'border-blue-500';
                    if (goalName.includes('бег') || goalName.includes('run')) colorClass = 'border-cyan-500';

                    return (
                      <div
                        key={widget.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border-2 transition-all",
                          widget.is_visible ? colorClass : "border-muted opacity-50",
                          widget.is_visible ? "bg-card" : "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{widget.goal_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground">
                                Цель: {widget.target_value} {widget.target_unit}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {widget.goal_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleVisibility(widget.id)}
                            className="h-8 w-8 p-0"
                          >
                            {widget.is_visible ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              Сохранить изменения
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
