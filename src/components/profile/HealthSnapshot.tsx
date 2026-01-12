import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Moon, Footprints, Scale, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { getDateLocale, getIntlLocale } from '@/lib/date-locale';
import { useTranslation } from 'react-i18next';
import type { HealthMetric } from '@/hooks/profile/useProfileSummary';

interface HealthSnapshotProps {
  metrics: HealthMetric[];
  isLoading?: boolean;
}

const getMetricConfig = (t: (key: string, options?: any) => string): Record<string, { icon: React.ReactNode; color: string; format: (v: number) => string }> => ({
  'Weight': {
    icon: <Scale className="h-4 w-4" />,
    color: 'text-blue-500',
    format: (v) => `${v.toFixed(1)} kg`
  },
  'Resting Heart Rate': {
    icon: <Heart className="h-4 w-4" />,
    color: 'text-red-500',
    format: (v) => `${Math.round(v)} bpm`
  },
  'Sleep Duration': {
    icon: <Moon className="h-4 w-4" />,
    color: 'text-purple-500',
    format: (v) => t('profile:health.sleepHours', { value: v.toFixed(1) })
  },
  'Recovery Score': {
    icon: <Zap className="h-4 w-4" />,
    color: 'text-green-500',
    format: (v) => `${Math.round(v)}%`
  },
  'Day Strain': {
    icon: <Activity className="h-4 w-4" />,
    color: 'text-orange-500',
    format: (v) => v.toFixed(1)
  },
  'Steps': {
    icon: <Footprints className="h-4 w-4" />,
    color: 'text-cyan-500',
    format: (v) => v.toLocaleString(getIntlLocale())
  },
  'HRV': {
    icon: <Heart className="h-4 w-4" />,
    color: 'text-pink-500',
    format: (v) => `${Math.round(v)} ms`
  }
});

const priorityOrder = ['Weight', 'Resting Heart Rate', 'Sleep Duration', 'Recovery Score', 'Day Strain', 'Steps', 'HRV'];

function formatDateLabel(dateStr: string, t: (key: string) => string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return t('common:time.today');
  if (isYesterday(date)) return t('common:time.yesterday');
  return format(date, 'd MMM', { locale: getDateLocale() });
}

function getSourceBadge(source: string): string {
  const sourceMap: Record<string, string> = {
    'WHOOP': 'WHOOP',
    'OURA': 'Oura',
    'GARMIN': 'Garmin',
    'WITHINGS': 'Withings',
    'GOOGLE': 'Google Fit',
    'ULTRAHUMAN': 'Ultrahuman',
    'APPLE': 'Apple Health'
  };
  return sourceMap[source.toUpperCase()] || source;
}

export function HealthSnapshot({ metrics, isLoading }: HealthSnapshotProps) {
  const { t } = useTranslation(['profile', 'common']);

  if (isLoading) {
    return (
      <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-green-500" />
            {t('profile:health.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-green-500" />
            {t('profile:health.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Heart className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('profile:health.noData')}</p>
            <p className="text-xs mt-1">{t('profile:health.connectTracker')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort metrics by priority
  const sortedMetrics = [...metrics].sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.name);
    const bIndex = priorityOrder.indexOf(b.name);
    return (aIndex === -1 ? 100 : aIndex) - (bIndex === -1 ? 100 : bIndex);
  }).slice(0, 5);

  // Get unique sources
  const sources = [...new Set(metrics.map(m => m.source))];

  return (
    <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-green-500" />
            {t('profile:health.title')}
          </CardTitle>
          <div className="flex gap-1">
            {sources.slice(0, 3).map(source => (
              <Badge 
                key={source} 
                variant="outline" 
                className="text-xs px-2 py-0 h-5 bg-background/50"
              >
                {getSourceBadge(source)}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedMetrics.map((metric, index) => {
          const metricConfig = getMetricConfig(t);
          const config = metricConfig[metric.name] || {
            icon: <Activity className="h-4 w-4" />,
            color: 'text-muted-foreground',
            format: (v: number) => v.toString()
          };

          return (
            <motion.div
              key={metric.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className={`${config.color}`}>
                  {config.icon}
                </div>
                <span className="text-sm font-medium">{metric.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{config.format(metric.value)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateLabel(metric.date, t)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
