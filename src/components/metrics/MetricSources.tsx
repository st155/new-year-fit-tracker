import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MetricSourcesProps {
  sources: string[];
}

const getSourceDisplayName = (source: string, t: ReturnType<typeof useTranslation>['t']): string => {
  const key = source.toLowerCase();
  const staticNames: Record<string, string> = {
    whoop: 'Whoop',
    ultrahuman: 'Ultrahuman',
    garmin: 'Garmin',
    withings: 'Withings',
    google: 'Google Fit',
  };
  
  if (key === 'manual') {
    return t('metricDetail:history.sources.manual', 'Manual entry');
  }
  
  return staticNames[key] || source;
};

const getSourceColor = (source: string): string => {
  const colorMap: Record<string, string> = {
    whoop: 'bg-red-500/10 text-red-500 border-red-500/20',
    ultrahuman: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    garmin: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    withings: 'bg-green-500/10 text-green-500 border-green-500/20',
    google: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    manual: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  };
  return colorMap[source.toLowerCase()] || 'bg-muted text-muted-foreground';
};

export function MetricSources({ sources }: MetricSourcesProps) {
  const { t } = useTranslation('common');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('dataSource.metrics', 'Data Sources')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('integrations.noData')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sources.map((source) => (
              <Badge
                key={source}
                variant="outline"
                className={getSourceColor(source)}
              >
                {getSourceDisplayName(source, t)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
