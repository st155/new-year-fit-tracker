import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Moon, Zap, Heart, Weight, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  metrics: string[];
}

const getMetricCategories = (t: (key: string) => string): MetricCategory[] => [
  {
    id: 'activity',
    name: t('metrics.category.activity'),
    icon: Activity,
    color: 'blue',
    metrics: ['Steps', 'Active Calories', 'Distance', 'Workout Time', 'Active Energy'],
  },
  {
    id: 'sleep',
    name: t('metrics.category.sleep'),
    icon: Moon,
    color: 'indigo',
    metrics: ['Sleep Duration', 'Sleep Efficiency', 'Sleep Performance', 'Deep Sleep Duration', 'REM Sleep Duration', 'Light Sleep Duration'],
  },
  {
    id: 'recovery',
    name: t('metrics.category.recovery'),
    icon: Zap,
    color: 'green',
    metrics: ['Recovery Score', 'HRV RMSSD', 'Body Battery', 'Stress Level', 'Readiness Score'],
  },
  {
    id: 'heart',
    name: t('metrics.category.heart'),
    icon: Heart,
    color: 'red',
    metrics: ['Average Heart Rate', 'Resting Heart Rate', 'Max Heart Rate', 'Heart Rate Variability'],
  },
  {
    id: 'body',
    name: t('metrics.category.body'),
    icon: Weight,
    color: 'amber',
    metrics: ['Weight', 'Body Fat Percentage', 'Muscle Mass', 'BMI', 'BMR'],
  },
];

interface MetricSelectorProps {
  selectedMetrics: string[];
  onMetricsChange: (metrics: string[]) => void;
  availableMetrics: string[];
}

export function MetricSelector({ selectedMetrics, onMetricsChange, availableMetrics }: MetricSelectorProps) {
  const { t } = useTranslation('trainerDashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const METRIC_CATEGORIES = getMetricCategories(t);

  const handleMetricToggle = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      onMetricsChange(selectedMetrics.filter(m => m !== metric));
    } else {
      onMetricsChange([...selectedMetrics, metric]);
    }
  };

  const handleCategoryToggle = (category: MetricCategory) => {
    const categoryMetrics = category.metrics.filter(m => availableMetrics.includes(m));
    const allSelected = categoryMetrics.every(m => selectedMetrics.includes(m));
    
    if (allSelected) {
      onMetricsChange(selectedMetrics.filter(m => !categoryMetrics.includes(m)));
    } else {
      const newMetrics = [...new Set([...selectedMetrics, ...categoryMetrics])];
      onMetricsChange(newMetrics);
    }
  };

  const handlePreset = (preset: string) => {
    switch (preset) {
      case 'all':
        onMetricsChange(availableMetrics);
        break;
      case 'clear':
        onMetricsChange([]);
        break;
      case 'cardio':
        onMetricsChange(availableMetrics.filter(m => 
          ['Average Heart Rate', 'Resting Heart Rate', 'HRV RMSSD', 'VO2 Max'].includes(m)
        ));
        break;
      case 'wellness':
        onMetricsChange(availableMetrics.filter(m => 
          ['Sleep Duration', 'Recovery Score', 'Stress Level', 'Body Battery'].includes(m)
        ));
        break;
    }
  };

  const filteredCategories = METRIC_CATEGORIES.map(category => ({
    ...category,
    metrics: category.metrics.filter(m => 
      availableMetrics.includes(m) && 
      m.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.metrics.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('metrics.title')}</CardTitle>
          <Badge variant="secondary">{t('metrics.selected', { count: selectedMetrics.length })}</Badge>
        </div>
        
        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('metrics.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Presets */}
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={() => handlePreset('all')}>
            {t('metrics.all')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePreset('cardio')}>
            {t('metrics.cardio')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePreset('wellness')}>
            Wellness
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePreset('clear')}>
            {t('metrics.clear')}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {filteredCategories.map(category => {
          const Icon = category.icon;
          const categoryMetrics = category.metrics.filter(m => availableMetrics.includes(m));
          const allSelected = categoryMetrics.every(m => selectedMetrics.includes(m));
          const someSelected = categoryMetrics.some(m => selectedMetrics.includes(m));
          
          return (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={allSelected}
                  onCheckedChange={() => handleCategoryToggle(category)}
                  className={cn(
                    "data-[state=checked]:bg-primary",
                    someSelected && !allSelected && "data-[state=checked]:bg-primary/50"
                  )}
                />
                <Label
                  htmlFor={`category-${category.id}`}
                  className="flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Icon className={cn("h-4 w-4", `text-${category.color}-500`)} />
                  {category.name}
                  <Badge variant="outline" className="ml-auto">
                    {categoryMetrics.length}
                  </Badge>
                </Label>
              </div>
              
              <div className="ml-6 space-y-1">
                {category.metrics.map(metric => (
                  <div key={metric} className="flex items-center gap-2">
                    <Checkbox
                      id={`metric-${metric}`}
                      checked={selectedMetrics.includes(metric)}
                      onCheckedChange={() => handleMetricToggle(metric)}
                    />
                    <Label
                      htmlFor={`metric-${metric}`}
                      className="text-sm cursor-pointer"
                    >
                      {metric}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('metrics.notFound')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
