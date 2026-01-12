import { Clock, TrendingUp, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getIntlLocale } from '@/lib/date-locale';

interface FastingWindow {
  id: string;
  eating_end: string | null;
  fasting_duration: number | null;
  created_at: string;
}

interface FastingHistoryProps {
  windows: FastingWindow[];
  className?: string;
}

export function FastingHistory({ windows, className }: FastingHistoryProps) {
  const { t } = useTranslation(['habits', 'units']);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return t('units:duration.minutesOnly', { minutes: mins });
    return t('units:duration.hoursMinutes', { hours, minutes: mins });
  };

  const bestFasting = Math.max(...windows.map(w => w.fasting_duration || 0));
  const averageFasting = Math.round(
    windows.reduce((acc, w) => acc + (w.fasting_duration || 0), 0) / windows.length
  );

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">{t('fasting.average')}</span>
          </div>
          <div className="text-lg font-bold text-primary">
            {formatDuration(averageFasting)}
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">{t('fasting.record')}</span>
          </div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {formatDuration(bestFasting)}
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t('fasting.recentWindows')}
        </p>
        <div className="space-y-2">
          {windows.map((window, index) => {
            const isBest = window.fasting_duration === bestFasting;
            const duration = window.fasting_duration || 0;
            const maxDuration = Math.max(...windows.map(w => w.fasting_duration || 0));
            const barWidth = (duration / maxDuration) * 100;

            return (
              <div
                key={window.id}
                className={cn(
                  "relative p-3 rounded-lg transition-all duration-300",
                  "bg-gradient-to-r from-muted/50 to-transparent",
                  "border border-border/50 hover:border-border",
                  "hover:shadow-md hover:scale-[1.01]",
                  isBest && "border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-transparent"
                )}
              >
                {/* Progress bar background */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-lg transition-all duration-500",
                    isBest
                      ? "bg-gradient-to-r from-amber-500/20 to-transparent"
                      : "bg-gradient-to-r from-primary/10 to-transparent"
                  )}
                  style={{ width: `${barWidth}%` }}
                />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isBest && (
                      <Award className="h-4 w-4 text-amber-500 animate-pulse" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(window.eating_end!).toLocaleDateString(getIntlLocale(), {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className={cn(
                    "font-semibold",
                    isBest ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                  )}>
                    {formatDuration(duration)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
