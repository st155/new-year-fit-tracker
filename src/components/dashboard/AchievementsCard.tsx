import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Trophy, Lock, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ACHIEVEMENTS, 
  type Achievement, 
  type AchievementCategory,
  getRarityColor, 
  getRarityBadgeVariant,
  getCategoryName 
} from '@/lib/achievements';
import { toast } from 'sonner';

interface AchievementsCardProps {
  className?: string;
}

export function AchievementsCard({ className }: AchievementsCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

  useEffect(() => {
    if (user) {
      loadAchievements();
    }
  }, [user]);

  const loadAchievements = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Загружаем данные пользователя для проверки достижений
      const [
        { data: measurements },
        { data: workouts },
        { data: bodyComp },
        { data: metricValues }
      ] = await Promise.all([
        supabase
          .from('measurements')
          .select('measurement_date')
          .eq('user_id', user.id)
          .order('measurement_date', { ascending: false }),
        supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('body_composition')
          .select('*')
          .eq('user_id', user.id)
          .order('measurement_date', { ascending: false }),
        supabase
          .from('metric_values')
          .select('value, user_metrics!inner(metric_name)')
          .eq('user_id', user.id)
      ]);

      // Вычисляем прогресс для каждого достижения
      const updatedAchievements = ACHIEVEMENTS.map(achievement => {
        let progress = 0;
        let unlocked = false;

        switch (achievement.id) {
          case 'streak_7':
          case 'streak_30':
          case 'streak_100':
            // Считаем streak из measurements
            const dates = measurements?.map(m => m.measurement_date) || [];
            progress = calculateCurrentStreak(dates);
            unlocked = progress >= achievement.requirement;
            break;

          case 'weight_lost_5':
          case 'weight_lost_10':
            // Вес потерян
            const weights = bodyComp?.map(b => b.weight).filter(Boolean) || [];
            if (weights.length >= 2) {
              const weightLost = Math.max(0, (weights[weights.length - 1] || 0) - (weights[0] || 0));
              progress = Math.abs(weightLost);
              unlocked = progress >= achievement.requirement;
            }
            break;

          case 'bodyfat_15':
          case 'bodyfat_10':
            // Процент жира
            const latestBodyFat = bodyComp?.[0]?.body_fat_percentage;
            if (latestBodyFat) {
              progress = achievement.requirement - latestBodyFat;
              unlocked = latestBodyFat <= achievement.requirement;
            }
            break;

          case 'workouts_10':
          case 'workouts_50':
          case 'workouts_100':
            // Количество тренировок
            progress = workouts?.length || 0;
            unlocked = progress >= achievement.requirement;
            break;

          case 'calories_10k':
            // Калории
            const totalCalories = workouts?.reduce((sum, w) => sum + (w.calories_burned || 0), 0) || 0;
            progress = totalCalories;
            unlocked = progress >= achievement.requirement;
            break;

          case 'pullups_20':
            // Подтягивания
            const pullupMetrics = metricValues?.filter(
              (m: any) => m.user_metrics.metric_name.toLowerCase().includes('подтягивания')
            ) || [];
            const maxPullups = Math.max(0, ...pullupMetrics.map((m: any) => Number(m.value)));
            progress = maxPullups;
            unlocked = progress >= achievement.requirement;
            break;

          case 'vo2max_50':
            // VO2Max
            const vo2maxMetrics = metricValues?.filter(
              (m: any) => m.user_metrics.metric_name === 'VO2Max'
            ) || [];
            const maxVO2 = Math.max(0, ...vo2maxMetrics.map((m: any) => Number(m.value)));
            progress = maxVO2;
            unlocked = progress >= achievement.requirement;
            break;

          case 'recovery_perfect_week':
            // Неделя идеального восстановления
            const recoveryMetrics = metricValues?.filter(
              (m: any) => m.user_metrics.metric_name === 'Recovery Score'
            ).slice(0, 7) || [];
            const perfectDays = recoveryMetrics.filter((m: any) => Number(m.value) >= 90).length;
            progress = perfectDays;
            unlocked = progress >= achievement.requirement;
            break;
        }

        return {
          ...achievement,
          progress: Math.min(progress, achievement.requirement),
          unlocked
        };
      });

      setAchievements(updatedAchievements);

      // Проверяем новые достижения и показываем уведомление
      const newlyUnlocked = updatedAchievements.filter(a => a.unlocked && !a.unlockedAt);
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach(a => {
          toast.success(`Достижение получено: ${a.icon} ${a.title}`, {
            description: a.description,
            duration: 5000,
          });
        });
      }

    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentStreak = (dates: string[]): number => {
    if (!dates || dates.length === 0) return 0;

    const sortedDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      date.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (date.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = (unlockedCount / totalCount) * 100;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Достижения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Достижения
            </CardTitle>
            <CardDescription>
              {unlockedCount} из {totalCount} разблокировано
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-500">{completionPercentage.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Завершено</div>
          </div>
        </div>
        <Progress value={completionPercentage} className="mt-4" />
      </CardHeader>
      <CardContent>
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="all" className="text-xs">Все</TabsTrigger>
            <TabsTrigger value="streak" className="text-xs">Серии</TabsTrigger>
            <TabsTrigger value="milestone" className="text-xs">Вехи</TabsTrigger>
            <TabsTrigger value="workout" className="text-xs">Спорт</TabsTrigger>
            <TabsTrigger value="elite" className="text-xs">Элита</TabsTrigger>
            <TabsTrigger value="social" className="text-xs">Соц.</TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-3">
            {filteredAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`relative p-4 rounded-lg border transition-all duration-300 ${
                  achievement.unlocked
                    ? 'border-primary/50 bg-primary/5 hover:border-primary'
                    : 'border-border/50 bg-muted/30 hover:border-border'
                }`}
                style={achievement.unlocked ? {
                  boxShadow: `0 0 20px ${achievement.glowColor}`
                } : {}}
              >
                <div className="flex items-start gap-4">
                  {/* Иконка */}
                  <div 
                    className={`text-4xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}
                    style={achievement.unlocked ? {
                      filter: `drop-shadow(0 0 8px ${achievement.color})`
                    } : {}}
                  >
                    {achievement.unlocked ? achievement.icon : <Lock className="h-10 w-10 text-muted-foreground" />}
                  </div>

                  {/* Информация */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold ${achievement.unlocked ? '' : 'text-muted-foreground'}`}>
                          {achievement.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {achievement.description}
                        </p>
                      </div>
                      <Badge variant={getRarityBadgeVariant(achievement.rarity)} className="shrink-0">
                        {achievement.rarity === 'common' && 'Обычное'}
                        {achievement.rarity === 'rare' && 'Редкое'}
                        {achievement.rarity === 'epic' && 'Эпичное'}
                        {achievement.rarity === 'legendary' && '⭐ Легендарное'}
                      </Badge>
                    </div>

                    {/* Прогресс */}
                    {!achievement.unlocked && achievement.progress !== undefined && (
                      <div className="space-y-1 mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Прогресс</span>
                          <span>{achievement.progress} / {achievement.requirement}</span>
                        </div>
                        <Progress 
                          value={(achievement.progress / achievement.requirement) * 100} 
                          className="h-1.5"
                        />
                      </div>
                    )}

                    {achievement.unlocked && (
                      <div className="flex items-center gap-2 mt-2">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <span className="text-xs font-medium text-yellow-500">Разблокировано</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredAchievements.length === 0 && (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Нет достижений в этой категории
                </p>
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
