import { motion } from "framer-motion";
import { Target, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { GoalReport } from "@/features/challenges/types";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

interface GoalsProgressSectionProps {
  goals: GoalReport[];
  goalsAchieved: number;
}

export function GoalsProgressSection({ goals, goalsAchieved }: GoalsProgressSectionProps) {
  const { t } = useTranslation('challenges');

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
              {t('report.goalsProgress')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {t('report.achieved', { achieved: goalsAchieved, total: goals.length })}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('report.noGoals')}
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
                      {goal.progress > 100 && (
                        <Badge variant="default" className="text-xs bg-success/80 text-success-foreground">
                          {t('report.overachieved')}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">{t('report.start')}</div>
                        <div className="font-medium">{formatValue(goal.baseline, goal.unit)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">{t('report.current')}</div>
                        <div className={cn(
                          "font-medium",
                          goal.trend === 'improved' && "text-success",
                          goal.trend === 'declined' && "text-destructive"
                        )}>
                          {formatValue(goal.current, goal.unit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">{t('report.target')}</div>
                        <div className="font-medium text-primary">{formatValue(goal.target, goal.unit)}</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t('report.progress')}</span>
                        <span className={cn(
                          "font-medium",
                          goal.progress > 100 && "text-success"
                        )}>
                          {Math.round(goal.progress)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, goal.progress)} 
                        className={cn("h-2", goal.progress > 100 && "[&>div]:bg-success")}
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