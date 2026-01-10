import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTodayActivities, useToggleActivityCompletion } from "@/hooks/useWellnessActivities";
import { getActivityConfig, getActivityLabel } from "@/lib/wellness-activity-types";
import { CheckCircle, Circle, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function TodayActivitiesCard() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const { data: activities = [], isLoading } = useTodayActivities(user?.id);
  const toggleCompletion = useToggleActivityCompletion();

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleCompletion.mutate({ id, is_completed: !currentStatus });
  };

  if (isLoading) {
    return (
      <Card className="bg-neutral-900 border-neutral-800 animate-pulse">
        <CardContent className="pt-6">
          <div className="h-20 bg-neutral-800 rounded" />
        </CardContent>
      </Card>
    );
  }

  const completed = activities.filter(a => a.is_completed).length;
  const total = activities.length;

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            {t('todayActivities.title')}
          </span>
          {total > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {completed}/{total}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('todayActivities.empty')}
          </p>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => {
              const config = getActivityConfig(activity.activity_type);
              return (
                <Button
                  key={activity.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-auto py-2 px-3",
                    activity.is_completed && "opacity-60"
                  )}
                  onClick={() => handleToggle(activity.id, activity.is_completed)}
                  disabled={toggleCompletion.isPending}
                >
                  <div className="flex items-center gap-3 w-full">
                    {activity.is_completed ? (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <Circle className={cn("w-5 h-5 shrink-0", config.color)} />
                    )}
                    <span className="text-xl">{config.icon}</span>
                    <span className={cn(
                      "flex-1 text-left",
                      activity.is_completed && "line-through"
                    )}>
                      {activity.name || getActivityLabel(activity.activity_type)}
                    </span>
                    {activity.duration_minutes && (
                      <span className="text-xs text-muted-foreground">
                        {activity.duration_minutes} {t('units.min')}
                      </span>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
