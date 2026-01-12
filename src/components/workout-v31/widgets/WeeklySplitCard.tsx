import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DayEntry {
  name: string;
  completed: boolean;
  isToday: boolean;
}

interface WeeklySplitCardProps {
  days: DayEntry[];
}

export function WeeklySplitCard({ days }: WeeklySplitCardProps) {
  const { t } = useTranslation('workouts');
  
  return (
    <Card className="bg-neutral-900 border border-neutral-800">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4">{t('weeklySplit.title')}</h3>
        <div className="space-y-3">
        {days.map((day, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {day.completed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5 text-neutral-600" />
              )}
              <span className={day.isToday ? "font-semibold text-foreground" : "text-muted-foreground"}>
                {day.name}
              </span>
            </div>
            {day.isToday && (
              <Badge variant="secondary">
                {t('weeklySplit.today')}
              </Badge>
            )}
          </div>
        ))}
      </div>
      </CardContent>
    </Card>
  );
}
