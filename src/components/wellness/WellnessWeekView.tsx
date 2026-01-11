import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useWeeklyActivities, useToggleActivityCompletion, WellnessActivity } from "@/hooks/useWellnessActivities";
import { getActivityConfig, getActivityLabel } from "@/lib/wellness-activity-types";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";
import { CheckCircle, Circle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface WellnessWeekViewProps {
  compact?: boolean;
}

export function WellnessWeekView({ compact = false }: WellnessWeekViewProps) {
  const { user } = useAuth();
  const { data: activities = [], isLoading } = useWeeklyActivities(user?.id);
  const toggleCompletion = useToggleActivityCompletion();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getActivitiesForDay = (date: Date): WellnessActivity[] => {
    return activities.filter(a => 
      a.scheduled_date && isSameDay(new Date(a.scheduled_date), date)
    );
  };

  const handleToggle = (activity: WellnessActivity) => {
    toggleCompletion.mutate({
      id: activity.id,
      is_completed: !activity.is_completed,
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-neutral-900 border-neutral-800 animate-pulse">
        <CardContent className="pt-6">
          <div className="h-32 bg-neutral-800 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="pt-6 text-center py-8">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Нет запланированных активностей
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Неделя wellness</h3>
          <div className="space-y-3">
            {days.map((day) => {
              const dayActivities = getActivitiesForDay(day);
              const isCurrentDay = isToday(day);
              const allCompleted = dayActivities.length > 0 && dayActivities.every(a => a.is_completed);

              return (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    "flex items-center justify-between",
                    isCurrentDay && "font-semibold"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {allCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : dayActivities.length > 0 ? (
                      <Circle className="w-5 h-5 text-cyan-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-neutral-600" />
                    )}
                    <span className={isCurrentDay ? "text-foreground" : "text-muted-foreground"}>
                      {format(day, 'EEE', { locale: getDateLocale() })}
                    </span>
                    <div className="flex gap-1">
                      {dayActivities.map((activity) => {
                        const config = getActivityConfig(activity.activity_type);
                        return (
                          <span 
                            key={activity.id}
                            className={cn(
                              "text-sm",
                              activity.is_completed && "opacity-50"
                            )}
                          >
                            {config.icon}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {isCurrentDay && (
                    <Badge variant="secondary">Сегодня</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          Расписание недели
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayActivities = getActivitiesForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "p-2 rounded-lg text-center",
                  isCurrentDay ? "bg-cyan-500/20 border border-cyan-500/30" : "bg-neutral-800"
                )}
              >
                <div className={cn(
                  "text-xs mb-1",
                  isCurrentDay ? "text-cyan-400 font-medium" : "text-muted-foreground"
                )}>
                  {format(day, 'EEE', { locale: getDateLocale() })}
                </div>
                <div className="text-sm font-medium mb-2">
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayActivities.length === 0 ? (
                    <div className="text-xs text-muted-foreground">—</div>
                  ) : (
                    dayActivities.map((activity) => {
                      const config = getActivityConfig(activity.activity_type);
                      return (
                        <button
                          key={activity.id}
                          onClick={() => handleToggle(activity)}
                          disabled={toggleCompletion.isPending}
                          className={cn(
                            "block w-full text-center text-lg transition-opacity",
                            activity.is_completed ? "opacity-50" : "hover:scale-110",
                            toggleCompletion.isPending && "cursor-wait"
                          )}
                          title={`${getActivityLabel(activity.activity_type)}${activity.is_completed ? ' ✓' : ''}`}
                        >
                          {config.icon}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
