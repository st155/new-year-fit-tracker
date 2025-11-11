import { Card } from "@tremor/react";
import { CheckCircle, Circle } from "lucide-react";
import { Badge } from "@tremor/react";

interface DayEntry {
  name: string;
  completed: boolean;
  isToday: boolean;
}

interface WeeklySplitCardProps {
  days: DayEntry[];
}

export function WeeklySplitCard({ days }: WeeklySplitCardProps) {
  return (
    <Card className="bg-neutral-900 border border-neutral-800">
      <h3 className="text-lg font-semibold mb-4">Выполнение недели</h3>
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
              <Badge color="cyan" size="sm">
                Сегодня
              </Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
