import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { hoverLift } from '@/lib/animations-v3';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, TrendingUp, TrendingDown, Pencil, Lock, Trash2, Repeat 
} from "lucide-react";
import { useState, useMemo } from "react";
import { QuickMeasurementDialog } from "../dialogs/QuickMeasurementDialog";
import { GoalEditDialog } from "../dialogs/GoalEditDialog";
import { HabitCreateDialog } from "@/features/habits/components/legacy/HabitCreateDialog";
import type { ChallengeGoal } from "../../types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGoalMutations } from "../../hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { 
  goalThemes, 
  getGoalIcon, 
  getSourceBadge,
  isLowerBetterGoal 
} from "@/lib/goalUtils";
import { useTranslation } from "react-i18next";

interface EnhancedGoalCardProps {
  goal: ChallengeGoal;
  onMeasurementAdded: () => void;
  readonly?: boolean;
}

export function EnhancedGoalCard({ goal, onMeasurementAdded, readonly = false }: EnhancedGoalCardProps) {
  const { t, i18n } = useTranslation('goals');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const { deleteGoal } = useGoalMutations();

  const handleDelete = () => {
    deleteGoal.mutate(goal.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        onMeasurementAdded();
      },
    });
  };
  
  const hasTarget = goal.target_value !== null;
  const theme = goalThemes[goal.goal_type] || goalThemes.strength;
  const Icon = getGoalIcon(goal.goal_name, goal.goal_type);
  const sourceBadge = getSourceBadge(goal.source);

  const isLowerBetter = isLowerBetterGoal(goal.goal_name);

  const getTrendColor = () => {
    if (Math.abs(goal.trend_percentage) < 0.5) return 'hsl(var(--muted-foreground))';
    
    const isImproving = isLowerBetter ? goal.trend === 'down' : goal.trend === 'up';
    return isImproving ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  };

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!goal.measurements || goal.measurements.length === 0) return [];
    
    return goal.measurements
      .slice(0, 30)
      .reverse()
      .map(m => ({
        date: m.measurement_date,
        value: m.value,
        formattedDate: format(new Date(m.measurement_date), 'dd MMM', { locale: dateLocale })
      }));
  }, [goal.measurements, dateLocale]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (!goal.measurements || goal.measurements.length === 0) {
      return {
        min: goal.current_value,
        max: goal.current_value,
        avg: goal.current_value,
        baseline: goal.baseline_value || goal.current_value,
      };
    }

    const values = goal.measurements.map(m => m.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      baseline: goal.baseline_value || values[values.length - 1],
    };
  }, [goal.measurements, goal.current_value, goal.baseline_value]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.formattedDate}</p>
        <p className="text-sm font-semibold">
          {payload[0].value.toFixed(1)} {goal.target_unit}
        </p>
      </div>
    );
  };

  return (
    <>
      <motion.div {...hoverLift}>
      <Card className={cn(
        "overflow-hidden hover:shadow-lg transition-all group relative h-full",
        readonly && "bg-muted/20 border-muted-foreground/20"
      )}>
        {/* Color bar */}
        <div className={cn(
          "h-1 bg-gradient-to-r",
          readonly ? "from-muted-foreground/30 to-muted-foreground/10" : theme.gradient
        )} />
        
        <CardContent className="p-6 flex flex-col h-full">
          {/* Header with action buttons */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 flex-shrink-0" style={{ color: theme.color }} />
              <h3 className="font-semibold">{goal.goal_name}</h3>
            </div>

            {!readonly && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {goal.is_personal && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setHabitDialogOpen(true)}
                          >
                            <Repeat className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('card.createHabit')}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:text-destructive"
                            onClick={() => setDeleteDialogOpen(true)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('card.delete')}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditOpen(true)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('card.edit')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {hasTarget && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setMeasurementOpen(true)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('card.addMeasurement')}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {goal.is_personal ? (
              <Badge variant="outline" className="text-xs">{t('card.personal')}</Badge>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs gap-1 bg-muted-foreground/20 border-muted-foreground/30">
                      <Lock className="h-3 w-3" />
                      {goal.challenge_title}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{t('card.challengeTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {sourceBadge && (
              <Badge variant={sourceBadge.variant} className="text-xs">
                {sourceBadge.label}
              </Badge>
            )}
          </div>

          {!hasTarget ? (
            <div className="text-muted-foreground flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm mb-1">{t('card.noTarget')}</p>
                <p className="text-xs">{t('card.noTargetHint')}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Current Value */}
              <div className="mb-3">
                <div className="text-3xl font-bold" style={{ color: theme.color }}>
                  {goal.target_reps && (goal.target_unit?.toLowerCase() === 'кг' || goal.target_unit?.toLowerCase() === 'kg')
                    ? `${goal.current_value.toFixed(1)} ${t('units.kg')}${goal.target_reps === 1 ? '' : ` × ${goal.target_reps}`}`
                    : `${goal.current_value.toFixed(1)} ${goal.target_unit}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('card.target')}: {goal.target_reps && (goal.target_unit?.toLowerCase() === 'кг' || goal.target_unit?.toLowerCase() === 'kg')
                    ? (goal.target_reps === 1 
                        ? `${goal.target_value} ${t('units.kg')} (1RM)` 
                        : `${goal.target_value} ${t('units.kg')} × ${goal.target_reps}`)
                    : `${goal.target_value} ${goal.target_unit}`}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <Progress value={goal.progress_percentage} autoColor className="h-2 mb-1" />
                <div className="text-xs text-muted-foreground">
                  {t('card.completed', { percent: goal.progress_percentage.toFixed(0) })}
                </div>
              </div>

              {/* Chart */}
              {chartData.length > 1 && (
                <div className="mb-4 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                      <XAxis 
                        dataKey="formattedDate" 
                        tick={false}
                        axisLine={false}
                      />
                      <YAxis hide domain={['auto', 'auto']} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={theme.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: theme.color }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-2 text-xs mt-auto pt-3 border-t border-border">
                <div>
                  <div className="text-muted-foreground mb-0.5">{t('card.baseline')}</div>
                  <div className="font-semibold">{stats.baseline.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">{t('card.current')}</div>
                  <div className="font-semibold" style={{ color: theme.color }}>
                    {goal.current_value.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">{t('card.goal')}</div>
                  <div className="font-semibold">{goal.target_value.toFixed(1)}</div>
                </div>
              </div>

              {/* Trend indicator */}
              {goal.trend !== 'stable' && (
                <div 
                  className="flex items-center gap-1 text-xs font-medium mt-2 justify-end"
                  style={{ color: getTrendColor() }}
                >
                  {goal.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(goal.trend_percentage).toFixed(1)}%</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {!readonly && (
        <>
          {hasTarget && (
            <QuickMeasurementDialog
              goal={{
                id: goal.id,
                goal_name: goal.goal_name,
                goal_type: goal.goal_type,
                target_value: goal.target_value!,
                target_unit: goal.target_unit,
              }}
              isOpen={measurementOpen}
              onOpenChange={setMeasurementOpen}
              onMeasurementAdded={() => {
                setMeasurementOpen(false);
                onMeasurementAdded();
              }}
            />
          )}

          <GoalEditDialog
            goal={{
              id: goal.id,
              goal_name: goal.goal_name,
              goal_type: goal.goal_type,
              target_value: goal.target_value,
              target_unit: goal.target_unit,
              is_personal: goal.is_personal,
              challenge_id: goal.challenge_id,
            }}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSave={() => {
              setEditOpen(false);
              onMeasurementAdded();
            }}
          />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('card.deleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('card.deleteDescription', { name: goal.goal_name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteGoal.isPending}>{t('edit.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteGoal.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteGoal.isPending ? t('card.deleting') : t('card.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <HabitCreateDialog
            open={habitDialogOpen}
            onOpenChange={setHabitDialogOpen}
            linkedGoalId={goal.id}
            prefilledName={t('card.habitPrefix', { name: goal.goal_name })}
          />
        </>
      )}
    </>
  );
}
