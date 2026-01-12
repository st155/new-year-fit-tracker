import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface HabitHistoryProps {
  measurements?: Array<{
    measurement_date: string;
    value: number;
    notes?: string;
  }>;
  attempts?: Array<{
    start_date: string;
    end_date?: string;
    days_lasted?: number;
    reset_reason?: string;
  }>;
  windows?: Array<{
    eating_start: string;
    eating_end?: string;
    fasting_duration?: number;
  }>;
  type: 'measurements' | 'attempts' | 'windows';
  maxItems?: number;
}

export function HabitHistory({ 
  measurements, 
  attempts, 
  windows, 
  type,
  maxItems = 5 
}: HabitHistoryProps) {
  const { t } = useTranslation(['habits', 'units']);
  
  if (type === 'measurements' && measurements) {
    const recentMeasurements = measurements.slice(0, maxItems);
    
    if (recentMeasurements.length === 0) {
      return (
        <div className="text-xs text-muted-foreground text-center py-2">
          {t('history.noRecords')}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {recentMeasurements.map((m, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between text-xs py-1 px-2 rounded glass-card hover:bg-white/5 transition-colors"
          >
            <span className="text-muted-foreground">
              {format(new Date(m.measurement_date), 'dd MMM')}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{m.value}</span>
              {m.notes && (
                <span className="text-muted-foreground truncate max-w-[80px]">
                  {m.notes}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'attempts' && attempts) {
    const recentAttempts = attempts.slice(0, maxItems);
    
    if (recentAttempts.length === 0) {
      return (
        <div className="text-xs text-muted-foreground text-center py-2">
          {t('history.noAttempts')}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {recentAttempts.map((a, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between text-xs py-1 px-2 rounded glass-card hover:bg-white/5 transition-colors"
          >
            <span className="text-muted-foreground">
              {format(new Date(a.start_date), 'dd MMM')}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {t('history.daysCount', { count: a.days_lasted || 0 })}
              </span>
              {a.reset_reason && (
                <span className="text-muted-foreground text-xs truncate max-w-[80px]">
                  ({a.reset_reason})
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'windows' && windows) {
    const recentWindows = windows.slice(0, maxItems);
    
    if (recentWindows.length === 0) {
      return (
        <div className="text-xs text-muted-foreground text-center py-2">
          {t('history.noFastingWindows')}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {recentWindows.map((w, idx) => {
          const duration = w.fasting_duration || 0;
          const hours = Math.floor(duration / 60);
          const minutes = duration % 60;
          
          return (
            <div 
              key={idx}
              className="flex items-center justify-between text-xs py-1 px-2 rounded glass-card hover:bg-white/5 transition-colors"
            >
              <span className="text-muted-foreground">
                {format(new Date(w.eating_start), 'dd MMM HH:mm')}
              </span>
              <span className="font-medium text-foreground">
                {t('units:duration.hoursMinutes', { hours, minutes })}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
