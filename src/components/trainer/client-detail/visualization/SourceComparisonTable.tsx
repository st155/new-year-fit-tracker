import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatSourceName } from '@/hooks/useClientDetailData';
import { format, parseISO } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface SourceData {
  source: string;
  value: number;
  date: string;
  confidence: number;
  color: string;
}

interface SourceComparison {
  metricName: string;
  sources: SourceData[];
}

interface SourceComparisonTableProps {
  comparisons: SourceComparison[];
}

export function SourceComparisonTable({ comparisons }: SourceComparisonTableProps) {
  const { t, i18n } = useTranslation('trainerDashboard');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  if (comparisons.length === 0 || comparisons.every(c => c.sources.length === 0)) {
    return null;
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge variant="default" className="bg-green-500">{t('visualization.confidenceHigh')}</Badge>;
    } else if (confidence >= 60) {
      return <Badge variant="default" className="bg-yellow-500">{t('visualization.confidenceMedium')}</Badge>;
    } else {
      return <Badge variant="default" className="bg-red-500">{t('visualization.confidenceLow')}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('visualization.sourceComparison')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {comparisons.map(comparison => {
            if (comparison.sources.length <= 1) return null;

            const values = comparison.sources.map(s => s.value);
            const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
            const maxDiff = Math.max(...values) - Math.min(...values);
            const diffPercent = avg > 0 ? (maxDiff / avg) * 100 : 0;

            return (
              <div key={comparison.metricName}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{comparison.metricName}</h4>
                  {diffPercent > 10 && (
                    <Badge variant="outline" className="text-orange-500">
                      {t('visualization.discrepancy')} {diffPercent.toFixed(1)}%
                    </Badge>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('visualization.source')}</TableHead>
                      <TableHead>{t('visualization.value')}</TableHead>
                      <TableHead>{t('visualization.date')}</TableHead>
                      <TableHead>{t('visualization.reliability')}</TableHead>
                      <TableHead>{t('visualization.deviation')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.sources.map(source => {
                      const deviation = avg > 0 ? ((source.value - avg) / avg) * 100 : 0;
                      
                      return (
                        <TableRow key={source.source}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: source.color }}
                              />
                              {formatSourceName(source.source)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {source.value.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(parseISO(source.date), 'dd MMM yyyy', { locale: dateLocale })}
                          </TableCell>
                          <TableCell>
                            {getConfidenceBadge(source.confidence)}
                          </TableCell>
                          <TableCell>
                            <span className={deviation > 10 ? 'text-orange-500' : deviation < -10 ? 'text-blue-500' : 'text-muted-foreground'}>
                              {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
