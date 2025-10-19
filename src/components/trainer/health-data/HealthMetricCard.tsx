import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { formatSourceName } from "@/hooks/useClientDetailData";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface HealthMetricCardProps {
  title: string;
  icon: string;
  value: number | string;
  unit: string;
  source?: string;
  data?: Array<{ date: string; value: number }>;
  trend?: {
    min: number;
    max: number;
    avg: number;
  };
}

export function HealthMetricCard({ title, icon, value, unit, source, data, trend }: HealthMetricCardProps) {
  const hasData = value !== undefined && value !== null && value !== 0;
  
  if (!hasData) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span>{icon}</span>
            <span>{title}</span>
          </CardTitle>
          {source && (
            <Badge variant="secondary" className="text-xs">
              {formatSourceName(source)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-2xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value} {unit}
          </div>
          
          {data && data.length > 0 && (
            <div className="h-[60px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded px-2 py-1 text-xs shadow-lg">
                      <div className="font-medium text-primary">
                        {format(parseISO(data.date), 'd MMM yyyy', { locale: ru })}
                      </div>
                      <div className="text-muted-foreground">
                        {payload[0].value} {unit}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {trend && (
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <div className="font-medium">Мин</div>
                <div>{trend.min.toLocaleString()} {unit}</div>
              </div>
              <div>
                <div className="font-medium">Сред</div>
                <div>{trend.avg.toLocaleString()} {unit}</div>
              </div>
              <div>
                <div className="font-medium">Макс</div>
                <div>{trend.max.toLocaleString()} {unit}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
