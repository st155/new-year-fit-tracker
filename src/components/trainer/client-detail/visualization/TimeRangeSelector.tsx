import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { useTranslation } from 'react-i18next';

interface TimeRangeSelectorProps {
  timeRange: { start: Date; end: Date };
  onTimeRangeChange: (range: { start: Date; end: Date }) => void;
}

export function TimeRangeSelector({ timeRange, onTimeRangeChange }: TimeRangeSelectorProps) {
  const { t, i18n } = useTranslation('trainerDashboard');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const QUICK_RANGES = [
    { label: t('visualization.days7'), days: 7 },
    { label: t('visualization.days30'), days: 30 },
    { label: t('visualization.days90'), days: 90 },
    { label: t('visualization.months6'), days: 180 },
    { label: t('visualization.year1'), days: 365 },
  ];

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    onTimeRangeChange({ start, end });
  };

  const handleCustomRange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onTimeRangeChange({ start: range.from, end: range.to });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUICK_RANGES.map(range => (
        <Button
          key={range.days}
          variant="outline"
          size="sm"
          onClick={() => handleQuickRange(range.days)}
          className={cn(
            "transition-colors",
            Math.abs(timeRange.start.getTime() - subDays(new Date(), range.days).getTime()) < 86400000 &&
            "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {range.label}
        </Button>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {format(timeRange.start, 'dd MMM', { locale: dateLocale })} - {format(timeRange.end, 'dd MMM', { locale: dateLocale })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: timeRange.start, to: timeRange.end }}
            onSelect={handleCustomRange}
            numberOfMonths={2}
            locale={dateLocale}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
