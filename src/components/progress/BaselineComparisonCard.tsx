import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface BaselineData {
  goalName: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  startDate: string;
  projectedCompletionDate: string | null;
  improvementPercent: number;
}

interface BaselineComparisonCardProps {
  data: BaselineData[];
}

export const BaselineComparisonCard = ({ data }: BaselineComparisonCardProps) => {
  const topImprovements = [...data]
    .sort((a, b) => b.improvementPercent - a.improvementPercent)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Сравнение с базой
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topImprovements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Нет данных о базовой линии
          </div>
        ) : (
          topImprovements.map((item) => (
            <div 
              key={item.goalName} 
              className="p-4 rounded-lg border bg-muted/30 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{item.goalName}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Начало {formatDistanceToNow(new Date(item.startDate), { addSuffix: true, locale: ru })}
                  </div>
                </div>
                <Badge 
                  variant={item.improvementPercent > 0 ? "default" : "secondary"}
                  className="ml-2"
                >
                  {item.improvementPercent > 0 ? '+' : ''}
                  {item.improvementPercent.toFixed(1)}%
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-center">
                  <div className="text-muted-foreground text-xs mb-1">Старт</div>
                  <div className="font-semibold">
                    {item.startValue} {item.unit}
                  </div>
                </div>
                
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                
                <div className="text-center">
                  <div className="text-muted-foreground text-xs mb-1">Текущее</div>
                  <div className="font-semibold text-primary">
                    {item.currentValue} {item.unit}
                  </div>
                </div>
                
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                
                <div className="text-center">
                  <div className="text-muted-foreground text-xs mb-1">Цель</div>
                  <div className="font-semibold">
                    {item.targetValue} {item.unit}
                  </div>
                </div>
              </div>

              {item.projectedCompletionDate && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  📅 Прогноз завершения: {new Date(item.projectedCompletionDate).toLocaleDateString('ru-RU')}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
