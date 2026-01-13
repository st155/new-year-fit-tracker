import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Target, Trophy, Plus, RefreshCw, Search, Filter } from "lucide-react";
import { FAB } from '@/components/ui/fab';
import { useAuth } from "@/hooks/useAuth";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations-v3";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateV3 } from "@/components/ui/empty-state";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/primitive";
import { MobileGoalsHub } from "@/components/mobile-goals";

// New imports from features/goals
import { useChallengeGoalsQuery } from "@/features/goals/hooks";
import { 
  EnhancedGoalCard, 
  GoalCreateDialog, 
  FirstMeasurementDialog,
  QuickMeasurementDialog 
} from "@/features/goals/components";

type FilterType = 'all' | 'personal' | 'challenges';

export default function Goals() {
  const { t } = useTranslation('goals');
  const isMobile = useIsMobile();
  
  // Render mobile version
  if (isMobile) {
    return <MobileGoalsHub />;
  }
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: goals, isLoading, refetch } = useChallengeGoalsQuery(user?.id);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showFirstMeasurement, setShowFirstMeasurement] = useState(false);
  const [goalsNeedingBaseline, setGoalsNeedingBaseline] = useState<any[]>([]);
  const [quickMeasurementGoal, setQuickMeasurementGoal] = useState<any>(null);
  
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

      const goalIds = challengeGoals.map(g => g.id);

      // Проверяем 3 источника данных параллельно
      const [baselinesResult, measurementsResult, currentValuesResult] = await Promise.all([
        supabase
          .from('goal_baselines')
          .select('goal_id')
          .eq('user_id', user.id)
          .in('goal_id', goalIds),
        
        supabase
          .from('measurements')
          .select('goal_id')
          .eq('user_id', user.id)
          .in('goal_id', goalIds),
        
        supabase
          .from('goal_current_values')
          .select('goal_id, current_value')
          .in('goal_id', goalIds)
      ]);

      // Собираем ID целей, которые УЖЕ имеют данные
      const goalsWithData = new Set<string>();
      
      // 1. Из goal_baselines
      baselinesResult.data?.forEach(b => goalsWithData.add(b.goal_id));
      
      // 2. Из measurements
      measurementsResult.data?.forEach(m => goalsWithData.add(m.goal_id));
      
      // 3. Из unified_metrics (через goal_current_values)
      currentValuesResult.data?.forEach(cv => {
        if (cv.current_value && cv.current_value > 0) {
          goalsWithData.add(cv.goal_id);
        }
      });

      // Фильтруем цели, которые РЕАЛЬНО не имеют никаких данных
      const needsBaseline = challengeGoals.filter(g => !goalsWithData.has(g.id));

      // Логирование для отладки
      if (import.meta.env.DEV) {
        console.log('🔍 [FirstMeasurementDialog] Check results:', {
          totalChallengeGoals: challengeGoals.length,
          goalsWithBaselines: baselinesResult.data?.length || 0,
          goalsWithMeasurements: measurementsResult.data?.length || 0,
          goalsWithUnifiedMetrics: currentValuesResult.data?.filter(cv => cv.current_value > 0).length || 0,
          goalsWithAnyData: goalsWithData.size,
          needsBaseline: needsBaseline.length,
          needsBaselineNames: needsBaseline.map(g => g.goal_name)
        });
      }

      // Показываем диалог ТОЛЬКО если есть цели без данных
      if (needsBaseline.length > 0) {
        setGoalsNeedingBaseline(needsBaseline);
        setShowFirstMeasurement(true);
      } else {
        setShowFirstMeasurement(false);
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
        {import.meta.env.DEV && (
          <div className="bg-muted/50 border border-warning/30 rounded-lg p-3 text-xs">
            <p className="text-muted-foreground">🔍 Dev: Loading goals for user {user?.id}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <AnimatedPage className="container py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={() => refetch()} className="touch-friendly">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="flex-1 sm:flex-initial touch-friendly">
            <Plus className="h-4 w-4 mr-2" />
            {t('newGoal')}
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
            {t('filters.all')} ({allGoals.length})
          </Button>
          <Button 
            variant={filter === 'personal' ? 'default' : 'outline'}
            onClick={() => handleFilterChange('personal')}
            className={cn(filter === 'personal' && "bg-gradient-primary", "w-full sm:w-auto touch-friendly")}
          >
            <Target className="h-4 w-4 mr-2" />
            {t('filters.personal')} ({personalGoals.length})
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
            {t('filters.challenges')} ({challengeGoals.length})
          </Button>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search')}
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
            {t('challengeInfo')}
          </p>
        </div>
      )}

      {/* Dev Diagnostics */}
      {import.meta.env.DEV && (
        <div className="bg-muted/50 border border-info/30 rounded-lg p-4 text-xs space-y-2">
          <p className="font-semibold text-info">🔍 Dev Diagnostics:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• User ID: {user?.id || 'Not authenticated'}</li>
            <li>• Total goals: {allGoals.length}</li>
            <li>• Personal goals: {personalGoals.length}</li>
            <li>• Challenge goals: {challengeGoals.length}</li>
            <li>• Filtered goals: {filteredGoals.length}</li>
            <li>• Search query: {searchQuery || 'none'}</li>
            <li>• Current filter: {filter}</li>
          </ul>
        </div>
      )}

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyStateV3
          variant={
            searchQuery.trim() 
              ? 'search' 
              : filter === 'personal' 
                ? 'goals' 
                : filter === 'challenges'
                  ? 'challenges'
                  : 'goals'
          }
          title={
            searchQuery.trim() 
              ? t('empty.noResults')
              : filter === 'personal' 
                ? t('empty.noPersonal')
                : filter === 'challenges'
                  ? t('empty.noChallenges')
                  : t('empty.noGoals')
          }
          description={
            searchQuery.trim()
              ? t('empty.searchHint')
              : filter === 'personal'
                ? t('empty.personalHint')
                : filter === 'challenges'
                  ? t('empty.challengeHint')
                  : t('empty.defaultHint')
          }
          illustration="animated-icon"
          action={
            !searchQuery.trim() && filter === 'challenges'
              ? {
                  label: t('actions.findChallenges'),
                  onClick: () => navigate('/challenges'),
                  icon: Trophy
                }
              : !searchQuery.trim() && filter !== 'challenges'
                ? {
                    label: t('actions.createGoal'),
                    onClick: () => setCreateDialogOpen(true),
                    icon: Plus
                  }
              : undefined
          }
          secondaryAction={
            !searchQuery.trim() && filter === 'all'
              ? {
                  label: t('actions.viewChallenges'),
                  onClick: () => navigate('/challenges')
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

      {/* FAB for quick actions */}
      <FAB
        actions={[
          {
            label: t('actions.createGoal'),
            icon: Plus,
            onClick: () => setCreateDialogOpen(true),
            color: 'text-primary'
          },
          {
            label: t('actions.addMeasurement'),
            icon: Target,
            onClick: () => {
              const firstGoal = filteredGoals[0];
              if (firstGoal) {
                setQuickMeasurementGoal(firstGoal);
              }
            },
            color: 'text-secondary'
          }
        ]}
      />

      {/* Quick measurement dialog */}
      {quickMeasurementGoal && (
        <QuickMeasurementDialog
          goal={quickMeasurementGoal}
          isOpen={!!quickMeasurementGoal}
          onOpenChange={(open) => !open && setQuickMeasurementGoal(null)}
          onMeasurementAdded={() => {
            setQuickMeasurementGoal(null);
            refetch();
          }}
        />
      )}
    </AnimatedPage>
  );
}
