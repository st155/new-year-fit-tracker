import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface TimeRangeSelectorProps {
  timeRange: { start: Date; end: Date };
  onTimeRangeChange: (range: { start: Date; end: Date }) => void;
}

const QUICK_RANGES = [
  { label: '7 дней', days: 7 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
  { label: '6 месяцев', days: 180 },
  { label: '1 год', days: 365 },
];

export function TimeRangeSelector({ timeRange, onTimeRangeChange }: TimeRangeSelectorProps) {
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
            {format(timeRange.start, 'dd MMM', { locale: ru })} - {format(timeRange.end, 'dd MMM', { locale: ru })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: timeRange.start, to: timeRange.end }}
            onSelect={handleCustomRange}
            numberOfMonths={2}
            locale={ru}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
