import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatSourceName } from '@/hooks/useClientDetailData';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

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
  if (comparisons.length === 0 || comparisons.every(c => c.sources.length === 0)) {
    return null;
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge variant="default" className="bg-green-500">Высокая</Badge>;
    } else if (confidence >= 60) {
      return <Badge variant="default" className="bg-yellow-500">Средняя</Badge>;
    } else {
      return <Badge variant="default" className="bg-red-500">Низкая</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Сравнение источников данных</CardTitle>
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
                      Расхождение {diffPercent.toFixed(1)}%
                    </Badge>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Источник</TableHead>
                      <TableHead>Значение</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Надежность</TableHead>
                      <TableHead>Отклонение</TableHead>
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
                            {format(parseISO(source.date), 'dd MMM yyyy', { locale: ru })}
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
