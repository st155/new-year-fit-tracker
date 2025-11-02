import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { MetricRecord } from '@/hooks/useMetricDetail';

interface MetricHistoryProps {
  records: MetricRecord[];
  metricName: string;
}

const getSourceDisplayName = (source: string): string => {
  const nameMap: Record<string, string> = {
    whoop: 'Whoop',
    ultrahuman: 'Ultrahuman',
    garmin: 'Garmin',
    withings: 'Withings',
    manual: 'Ручной ввод',
  };
  return nameMap[source.toLowerCase()] || source;
};

const formatValue = (value: number, metricName: string): string => {
  if (metricName.toLowerCase().includes('sleep') && metricName.toLowerCase().includes('duration')) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  
  if (metricName === 'Steps') {
    return Math.round(value).toLocaleString();
  }
  
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
};

export function MetricHistory({ records, metricName }: MetricHistoryProps) {
  // Show only last 30 records in table
  const displayRecords = records.slice(0, 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle>История записей</CardTitle>
      </CardHeader>
      <CardContent>
        {displayRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет записей для отображения
          </p>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Значение</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead className="text-right">Качество</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(record.measurement_date), 'd MMM yyyy', { locale: ru })}
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
