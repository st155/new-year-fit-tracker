import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface FilterState {
  period: '7d' | '30d' | '90d' | 'custom';
  customStart?: Date;
  customEnd?: Date;
  sources: string[];
  metricTypes: string[];
  minConfidence: number;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
}

export function AdvancedFilters({ filters, onFiltersChange, onReset }: AdvancedFiltersProps) {
  const { t, i18n } = useTranslation('trainerDashboard');
  const [isOpen, setIsOpen] = useState(false);
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const SOURCE_OPTIONS = [
    { value: 'whoop', label: t('filters.sources.whoop') },
    { value: 'oura', label: t('filters.sources.oura') },
    { value: 'manual', label: t('filters.sources.manual') },
    { value: 'inbody', label: t('filters.sources.inbody') },
    { value: 'apple_health', label: t('filters.sources.appleHealth') },
  ];

  const METRIC_TYPE_OPTIONS = [
    { value: 'recovery', label: t('filters.metricTypes.recovery') },
    { value: 'sleep', label: t('filters.metricTypes.sleep') },
    { value: 'activity', label: t('filters.metricTypes.activity') },
    { value: 'body', label: t('filters.metricTypes.bodyComposition') },
  ];

  const handleSourceToggle = (source: string) => {
    const newSources = filters.sources.includes(source)
      ? filters.sources.filter(s => s !== source)
      : [...filters.sources, source];
    onFiltersChange({ ...filters, sources: newSources });
  };

  const handleMetricTypeToggle = (type: string) => {
    const newTypes = filters.metricTypes.includes(type)
      ? filters.metricTypes.filter(t => t !== type)
      : [...filters.metricTypes, type];
    onFiltersChange({ ...filters, metricTypes: newTypes });
  };

  const activeFilterCount = 
    (filters.period !== '30d' ? 1 : 0) +
    (filters.sources.length > 0 ? 1 : 0) +
    (filters.metricTypes.length > 0 ? 1 : 0) +
    (filters.minConfidence > 0 ? 1 : 0);

  return (
    <div className="mb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        {t('filters.title')}
        {activeFilterCount > 0 && (
          <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card className="mt-2">
          <CardContent className="p-4 space-y-4">
            {/* Period Selection */}
            <div className="space-y-2">
              <Label>{t('filters.period')}</Label>
              <Select
                value={filters.period}
                onValueChange={(value: any) => 
                  onFiltersChange({ ...filters, period: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">{t('filters.last7days')}</SelectItem>
                  <SelectItem value="30d">{t('filters.last30days')}</SelectItem>
                  <SelectItem value="90d">{t('filters.last90days')}</SelectItem>
                  <SelectItem value="custom">{t('filters.customRange')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {filters.period === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>{t('filters.startDate')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.customStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.customStart ? format(filters.customStart, "PPP", { locale: dateLocale }) : t('filters.pickDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.customStart}
                        onSelect={(date) => 
                          onFiltersChange({ ...filters, customStart: date })
                        }
                        locale={dateLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>{t('filters.endDate')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.customEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.customEnd ? format(filters.customEnd, "PPP", { locale: dateLocale }) : t('filters.pickDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.customEnd}
                        onSelect={(date) => 
                          onFiltersChange({ ...filters, customEnd: date })
                        }
                        locale={dateLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Data Sources */}
            <div className="space-y-2">
              <Label>{t('filters.dataSources')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {SOURCE_OPTIONS.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`source-${option.value}`}
                      checked={filters.sources.includes(option.value)}
                      onCheckedChange={() => handleSourceToggle(option.value)}
                    />
                    <label
                      htmlFor={`source-${option.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Metric Types */}
            <div className="space-y-2">
              <Label>{t('filters.metricTypesLabel')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {METRIC_TYPE_OPTIONS.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${option.value}`}
                      checked={filters.metricTypes.includes(option.value)}
                      onCheckedChange={() => handleMetricTypeToggle(option.value)}
                    />
                    <label
                      htmlFor={`type-${option.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Threshold */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>{t('filters.minConfidence')}</Label>
                <span className="text-sm text-muted-foreground">{filters.minConfidence}%</span>
              </div>
              <Slider
                value={[filters.minConfidence]}
                onValueChange={([value]) => 
                  onFiltersChange({ ...filters, minConfidence: value })
                }
                max={100}
                step={10}
                className="w-full"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                {t('filters.reset')}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                {t('filters.apply')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
