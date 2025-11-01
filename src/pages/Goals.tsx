import { useState, useEffect } from "react";
import { Target, Trophy, Plus, RefreshCw, Search, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useChallengeGoals } from "@/hooks/useChallengeGoals";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EnhancedGoalCard } from "@/components/goals/EnhancedGoalCard";
import { GoalCreateDialog } from "@/components/goals/GoalCreateDialog";
import { FirstMeasurementDialog } from "@/components/goals/FirstMeasurementDialog";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type FilterType = 'all' | 'personal' | 'challenges';

export default function Goals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: goals, isLoading, refetch } = useChallengeGoals(user?.id);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showFirstMeasurement, setShowFirstMeasurement] = useState(false);
  const [goalsNeedingBaseline, setGoalsNeedingBaseline] = useState<any[]>([]);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");

  // Check for goals without baselines
  useEffect(() => {
    const checkBaselines = async () => {
      if (!user || !goals || goals.length === 0) return;

      const challengeGoals = goals.filter(g => !g.is_personal && g.challenge_id);
      if (challengeGoals.length === 0) return;

      const { data: baselines } = await supabase
        .from('goal_baselines')
        .select('goal_id')
        .eq('user_id', user.id);

      const baselineGoalIds = new Set(baselines?.map(b => b.goal_id) || []);
      const needsBaseline = challengeGoals.filter(g => !baselineGoalIds.has(g.id));

      if (needsBaseline.length > 0) {
        setGoalsNeedingBaseline(needsBaseline);
        setShowFirstMeasurement(true);
      }
    };

    checkBaselines();
  }, [user, goals]);
  
  const personalGoals = goals?.filter(g => g.is_personal) || [];
  const challengeGoals = goals?.filter(g => !g.is_personal) || [];
  const allGoals = [...personalGoals, ...challengeGoals];

  // Apply filters
  let filteredGoals = allGoals;
  
  if (filter === 'personal') {
    filteredGoals = personalGoals;
  } else if (filter === 'challenges') {
    filteredGoals = challengeGoals;
  }
  
  // Apply search
  if (searchQuery.trim()) {
    filteredGoals = filteredGoals.filter(goal =>
      goal.goal_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setSearchParams({ filter: newFilter });
  };
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <AnimatedPage className="container py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Track your personal and challenge goals</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={() => refetch()} className="touch-friendly">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="flex-1 sm:flex-initial touch-friendly">
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => handleFilterChange('all')}
            className={cn(filter === 'all' && "bg-gradient-primary", "w-full sm:w-auto touch-friendly")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Все ({allGoals.length})
          </Button>
          <Button 
            variant={filter === 'personal' ? 'default' : 'outline'}
            onClick={() => handleFilterChange('personal')}
            className={cn(filter === 'personal' && "bg-gradient-primary", "w-full sm:w-auto touch-friendly")}
          >
            <Target className="h-4 w-4 mr-2" />
            Личные ({personalGoals.length})
          </Button>
          <Button 
            variant={filter === 'challenges' ? 'default' : 'outline'}
            onClick={() => handleFilterChange('challenges')}
            className={cn(
              filter === 'challenges' && "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/20 border-muted-foreground/40",
              "w-full sm:w-auto touch-friendly"
            )}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Челленджи ({challengeGoals.length})
          </Button>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск целей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Info banner for challenge goals */}
      {(filter === 'challenges' || filter === 'all') && challengeGoals.length > 0 && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <Trophy className="h-4 w-4 inline mr-2" />
            Дисциплины челленджа определяются тренером и залочены для редактирования. 
            Отслеживайте прогресс по каждой дисциплине в разделе <strong>Challenge Progress</strong>.
          </p>
        </div>
      )}

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={filter === 'personal' ? <Target className="h-12 w-12" /> : <Trophy className="h-12 w-12" />}
          title={
            searchQuery.trim() 
              ? "Ничего не найдено" 
              : filter === 'personal' 
                ? "No personal goals yet" 
                : filter === 'challenges'
                  ? "Нет целей челленджа"
                  : "No goals yet"
          }
          description={
            searchQuery.trim()
              ? "Попробуйте изменить поисковый запрос"
              : filter === 'personal'
                ? "Create your first goal to start tracking your progress"
                : filter === 'challenges'
                  ? "Присоединитесь к челленджу, чтобы получить цели автоматически"
                  : "Create your first goal or join a challenge"
          }
          action={
            !searchQuery.trim() && filter === 'challenges'
              ? {
                  label: "Найти челленджи",
                  onClick: () => navigate('/challenges')
                }
              : !searchQuery.trim() && filter !== 'challenges'
                ? {
                    label: "Create Goal",
                    onClick: () => setCreateDialogOpen(true)
                  }
              : undefined
          }
        />
      ) : (
        <motion.div 
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {filteredGoals.map((goal) => (
            <motion.div key={goal.id} variants={staggerItem}>
              <EnhancedGoalCard 
                goal={goal} 
                onMeasurementAdded={() => refetch()}
                readonly={!goal.is_personal}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <GoalCreateDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onGoalCreated={() => refetch()}
      />

      <FirstMeasurementDialog
        goals={goalsNeedingBaseline}
        open={showFirstMeasurement}
        onClose={() => setShowFirstMeasurement(false)}
        onComplete={() => {
          refetch();
          setGoalsNeedingBaseline([]);
        }}
      />
    </AnimatedPage>
  );
}
