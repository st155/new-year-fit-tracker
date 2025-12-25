import { motion } from "framer-motion";
import { Target, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { GoalReport } from "@/hooks/useChallengeReport";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";

interface GoalsProgressSectionProps {
  goals: GoalReport[];
  goalsAchieved: number;
}

export function GoalsProgressSection({ goals, goalsAchieved }: GoalsProgressSectionProps) {
  const getTrendIcon = (trend: GoalReport['trend']) => {
    switch (trend) {
      case 'improved':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declined':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return "—";
    return `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Прогресс по целям
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              {goalsAchieved} / {goals.length} достигнуто
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Цели не были установлены для этого челленджа
            </div>
          ) : (
            goals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  goal.achieved 
                    ? "bg-success/5 border-success/30" 
                    : "bg-muted/30 border-border"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      {goal.achieved ? (
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium">{goal.name}</span>
                      {getTrendIcon(goal.trend)}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Старт</div>
                        <div className="font-medium">{formatValue(goal.baseline, goal.unit)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Текущее</div>
                        <div className={cn(
                          "font-medium",
                          goal.trend === 'improved' && "text-success",
                          goal.trend === 'declined' && "text-destructive"
                        )}>
                          {formatValue(goal.current, goal.unit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Цель</div>
                        <div className="font-medium text-primary">{formatValue(goal.target, goal.unit)}</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Прогресс</span>
                        <span className="font-medium">{Math.round(goal.progress)}%</span>
                      </div>
                      <Progress 
                        value={Math.min(100, goal.progress)} 
                        className="h-2"
                      />
                    </div>
                  </div>

                  {/* Mini chart */}
                  {goal.measurements.length >= 2 && (
                    <div className="w-24 h-16 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={goal.measurements}>
                          <YAxis domain={['dataMin', 'dataMax']} hide />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={goal.trend === 'improved' ? 'hsl(var(--success))' : goal.trend === 'declined' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
