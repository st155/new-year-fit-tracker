import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useQuickLogActivity } from "@/hooks/useWellnessActivities";
import { ACTIVITY_TYPES, ActivityType, getActivityConfig } from "@/lib/wellness-activity-types";
import { toast } from "sonner";
import { Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickActivityLogger() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [duration, setDuration] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const quickLog = useQuickLogActivity();

  const handleQuickLog = async (type: ActivityType) => {
    if (!user?.id) return;

    try {
      await quickLog.mutateAsync({
        user_id: user.id,
        activity_type: type,
        duration_minutes: duration ? parseInt(duration, 10) : undefined,
      });

      const config = getActivityConfig(type);
      toast.success(`${config.icon} ${config.label} записано!`);
      setSelectedType(null);
      setDuration('');
      setIsOpen(false);
    } catch (error: any) {
      toast.error('Ошибка записи', { description: error.message });
    }
  };

  const popularTypes: ActivityType[] = ['strength', 'massage', 'stretching', 'sauna', 'running', 'barochamber'];

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" />
          Быстрая запись
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {popularTypes.map((type) => {
            const config = getActivityConfig(type);
            return (
              <Popover 
                key={type}
                open={selectedType === type && isOpen}
                onOpenChange={(open) => {
                  setIsOpen(open);
                  if (open) setSelectedType(type);
                  else setSelectedType(null);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "border-neutral-700 hover:border-neutral-600",
                      quickLog.isPending && selectedType === type && "opacity-50"
                    )}
                    disabled={quickLog.isPending}
                  >
                    <span className="mr-1">{config.icon}</span>
                    {config.label}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 bg-neutral-900 border-neutral-700" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{config.icon}</span>
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Минут (опционально)"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="h-8 bg-neutral-800 border-neutral-700"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-green-500 to-cyan-500"
                      onClick={() => handleQuickLog(type)}
                      disabled={quickLog.isPending}
                    >
                      {quickLog.isPending ? 'Сохранение...' : 'Записать'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
