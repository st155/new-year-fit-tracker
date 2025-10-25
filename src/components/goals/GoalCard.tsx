import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Minus, Target, Dumbbell, Heart, Activity, Scale, Flame, Zap, Pencil, Lock, Trash2, Repeat } from "lucide-react";
import { useState } from "react";
import { QuickMeasurementDialog } from "./QuickMeasurementDialog";
import { GoalEditDialog } from "./GoalEditDialog";
import { HabitCreateDialog } from "../habits/HabitCreateDialog";
import { ChallengeGoal } from "@/hooks/useChallengeGoals";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

const goalTypeIcons: Record<string, any> = {
  strength: Dumbbell,
  cardio: Heart,
  endurance: Activity,
  body_composition: Scale,
  health: Heart,
};

const goalThemes: Record<string, { color: string; gradient: string }> = {
  strength: { color: 'hsl(var(--chart-1))', gradient: 'from-chart-1/20 to-chart-1/5' },
  cardio: { color: 'hsl(var(--chart-2))', gradient: 'from-chart-2/20 to-chart-2/5' },
  endurance: { color: 'hsl(var(--chart-3))', gradient: 'from-chart-3/20 to-chart-3/5' },
  body_composition: { color: 'hsl(var(--chart-4))', gradient: 'from-chart-4/20 to-chart-4/5' },
  health: { color: 'hsl(var(--chart-5))', gradient: 'from-chart-5/20 to-chart-5/5' },
};

const getGoalIcon = (goalName: string, goalType: string) => {
  const nameLower = goalName.toLowerCase();
  
  if (nameLower.includes('подтяг') || nameLower.includes('pullup')) return TrendingUp;
  if (nameLower.includes('жим') || nameLower.includes('bench')) return Dumbbell;
  if (nameLower.includes('вес') || nameLower.includes('weight')) return Scale;
  if (nameLower.includes('жир') || nameLower.includes('fat')) return Flame;
  if (nameLower.includes('vo2') || nameLower.includes('во2')) return Zap;
  if (nameLower.includes('бег') || nameLower.includes('run')) return Activity;
  if (nameLower.includes('планк') || nameLower.includes('plank')) return Activity;
  
  return goalTypeIcons[goalType] || Target;
};

const getSourceBadge = (source?: 'inbody' | 'withings' | 'manual') => {
  if (!source) return null;
  
  const badges = {
    inbody: { label: 'InBody', variant: 'default' as const },
    withings: { label: 'Withings', variant: 'secondary' as const },
    manual: { label: 'Ручное', variant: 'outline' as const },
  };
  
  return badges[source];
};

interface GoalCardProps {
  goal: ChallengeGoal;
  onMeasurementAdded: () => void;
  readonly?: boolean;
}

export function GoalCard({ goal, onMeasurementAdded, readonly = false }: GoalCardProps) {
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goal.id);

      if (error) throw error;

      toast.success('Цель успешно удалена');
      onMeasurementAdded(); // Refresh the list
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Ошибка при удалении цели');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };
  
  const hasTarget = goal.target_value !== null;
  const theme = goalThemes[goal.goal_type] || goalThemes.strength;
  const Icon = getGoalIcon(goal.goal_name, goal.goal_type);
  const sourceBadge = getSourceBadge(goal.source);

  const isLowerBetter = goal.goal_name.toLowerCase().includes('жир') || 
                        goal.goal_name.toLowerCase().includes('fat') ||
                        goal.goal_name.toLowerCase().includes('вес') && goal.goal_type === 'body_composition';

  const getTrendColor = () => {
    if (Math.abs(goal.trend_percentage) < 0.5) return 'hsl(var(--muted-foreground))';
    
    const isImproving = isLowerBetter ? goal.trend === 'down' : goal.trend === 'up';
    return isImproving ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  };

  return (
    <>
      <Card className={cn(
        "overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] group relative",
        readonly && "bg-muted/20 border-muted-foreground/20"
      )}>
        <div className={cn(
          "h-1 bg-gradient-to-r",
          readonly ? "from-muted-foreground/30 to-muted-foreground/10" : theme.gradient
        )} />
        
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-5 w-5 flex-shrink-0" style={{ color: theme.color }} />
                <h3 className="font-semibold truncate">{goal.goal_name}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {goal.is_personal ? (
                  <Badge variant="outline" className="text-xs">Личная</Badge>
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
                        <p className="text-xs">Цель челленджа - редактируется только тренером</p>
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
            </div>

            {!readonly && (
              <div className="flex gap-1">
                {goal.is_personal && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setHabitDialogOpen(true)}
                      title="Создать привычку из цели"
                    >
                      <Repeat className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {hasTarget && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setMeasurementOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Values */}
          <div className="mb-4">
            {!hasTarget ? (
              <div className="text-muted-foreground">
                <p className="text-sm mb-1">Цель не установлена</p>
                <p className="text-xs">Нажмите на карандаш, чтобы установить цель</p>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold" style={{ color: theme.color }}>
                    {goal.current_value.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">/ {goal.target_value}</span>
                  <span className="text-sm text-muted-foreground">{goal.target_unit}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {goal.progress_percentage.toFixed(0)}% выполнено
                </div>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {hasTarget && <Progress value={goal.progress_percentage} className="mb-4" />}

          {/* Sparkline & Trend */}
          {hasTarget && (
            <div className="flex items-center justify-between">
              {/* Mini sparkline */}
              <div className="flex items-end gap-[2px] h-8">
                {goal.measurements.slice(0, 7).reverse().map((m, i) => {
                  const max = Math.max(...goal.measurements.slice(0, 7).map(d => d.value));
                  const min = Math.min(...goal.measurements.slice(0, 7).map(d => d.value));
                  const range = max - min || 1;
                  const height = ((m.value - min) / range) * 100;
                  
                  return (
                    <div
                      key={i}
                      className="w-1 rounded-full opacity-60"
                      style={{
                        height: `${Math.max(height, 10)}%`,
                        backgroundColor: theme.color,
                      }}
                    />
                  );
                })}
              </div>

              {/* Trend */}
              {goal.trend !== 'stable' && (
                <div 
                  className="flex items-center gap-1 text-xs font-medium"
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
            </div>
          )}
        </CardContent>
      </Card>

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
                <AlertDialogTitle>Удалить цель?</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы уверены, что хотите удалить цель "{goal.goal_name}"? Это действие нельзя отменить, и все связанные измерения также будут удалены.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Удаление..." : "Удалить"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <HabitCreateDialog
            open={habitDialogOpen}
            onOpenChange={setHabitDialogOpen}
            linkedGoalId={goal.id}
            prefilledName={`Привычка: ${goal.goal_name}`}
          />
        </>
      )}
    </>
  );
}
