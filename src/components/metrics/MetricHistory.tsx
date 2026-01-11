import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import type { MetricRecord } from '@/hooks/useMetricDetail';

interface MetricHistoryProps {
  records: MetricRecord[];
  metricName: string;
}

export function MetricHistory({ records, metricName }: MetricHistoryProps) {
  const { t, i18n } = useTranslation('metricDetail');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const getSourceDisplayName = (source: string): string => {
    const key = `history.sources.${source.toLowerCase()}`;
    const translated = t(key);
    // If no translation found, return capitalized source name
    return translated !== key ? translated : source.charAt(0).toUpperCase() + source.slice(1);
  };

  const formatValue = (value: number, name: string): string => {
    if (name.toLowerCase().includes('sleep') && name.toLowerCase().includes('duration')) {
      const hours = Math.floor(value);
      const minutes = Math.round((value - hours) * 60);
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    
    if (name === 'Steps') {
      return Math.round(value).toLocaleString();
    }
    
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };

  // Show only last 30 records in table
  const displayRecords = records.slice(0, 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('history.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {displayRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('history.empty')}
          </p>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('history.date')}</TableHead>
                  <TableHead>{t('history.value')}</TableHead>
                  <TableHead>{t('history.source')}</TableHead>
                  <TableHead className="text-right">{t('history.quality')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(record.measurement_date), 'd MMM yyyy', { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      {formatValue(record.value, metricName)} {record.unit}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getSourceDisplayName(record.source)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {record.confidence_score !== undefined ? (
                        <Badge
                          variant={
                            record.confidence_score >= 80
                              ? 'default'
                              : record.confidence_score >= 60
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {Math.round(record.confidence_score)}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
