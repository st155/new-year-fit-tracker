import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabitsQuery } from '@/features/habits';
import { useHabitProgressQuery } from '@/features/habits/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Flame, TrendingUp, Calendar, Target, Download, FileText } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { HabitProgressChart } from '@/features/habits/components/legacy/HabitProgressChart';
import { HabitCalendarHeatmap } from '@/features/habits/components/legacy/HabitCalendarHeatmap';
import { HabitSocialSection } from '@/features/habits/components/detail/HabitSocialSection';
import { getHabitIcon, getHabitSentiment } from '@/lib/habit-utils';
import { toast } from 'sonner';
import { exportHabitToPDF } from '@/lib/exporters/pdf-exporter';

export default function HabitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: habits, isLoading } = useHabitsQuery({ enabled: !!user?.id });
  const [isExporting, setIsExporting] = useState(false);

  const habit = useMemo(() => {
    return habits?.find(h => h.id === id);
  }, [habits, id]);

  const dateRange = useMemo(() => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, 90)); // Last 90 days
    return { start, end };
  }, []);

  const { data: progressData, isLoading: isProgressLoading } = useHabitProgressQuery(
    id || '',
    dateRange
  );

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="container py-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Привычка не найдена</h1>
          <Button onClick={() => navigate('/habits-v3')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Вернуться к привычкам
          </Button>
        </div>
      </div>
    );
  }

  const sentiment = getHabitSentiment(habit);
  const IconComponent = getHabitIcon(habit);

  const stats = {
    current_streak: habit.currentStreak || 0,
    total_completions: habit.totalCompletions || 0,
    completion_rate: 0,
  };

  // Calculate longest streak from progress data
  const longestStreak = useMemo(() => {
    if (!progressData) return 0;
    let maxStreak = 0;
    let currentStreak = 0;
    
    progressData.forEach(day => {
      if (day.completed) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    
    return maxStreak;
  }, [progressData]);

  const handleExportCSV = () => {
    if (!progressData) return;
    
    // Create CSV content
    const headers = ['Дата', 'Выполнено', 'Серия'];
    const rows = progressData.map(day => [
      format(day.date, 'yyyy-MM-dd'),
      day.completed ? 'Да' : 'Нет',
      day.streak || 0
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `habit-${habit.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast.success('CSV экспортирован');
  };

  const handleExportPDF = async () => {
    if (!progressData) return;
    
    setIsExporting(true);
    try {
      await exportHabitToPDF({
        name: habit.name,
        description: habit.description || undefined,
        stats,
        progressData,
        longestStreak,
      });
      toast.success('PDF отчет создан');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Ошибка при создании PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/habits-v3')}
            className="glass-card border-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className={`neon-circle neon-circle-${sentiment} w-12 h-12`}>
              <IconComponent className={`h-6 w-6 text-habit-${sentiment}`} />
            </div>
            <div>
              <h1 className={`text-3xl font-bold text-glow text-habit-${sentiment}`}>
                {habit.name}
              </h1>
              {habit.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {habit.description}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="glass-card border-white/20"
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="glass-card border-white/20"
          >
            <FileText className="mr-2 h-4 w-4" />
            {isExporting ? 'Создание...' : 'PDF Отчет'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-habit-negative/20">
              <Flame className="h-5 w-5 text-habit-negative" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.current_streak}</div>
              <div className="text-xs text-muted-foreground">Текущая серия</div>
            </div>
          </div>
        </Card>

        <Card className="glass-card border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/20">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{longestStreak}</div>
              <div className="text-xs text-muted-foreground">Лучшая серия</div>
            </div>
          </div>
        </Card>

        <Card className="glass-card border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-success/20">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total_completions}</div>
              <div className="text-xs text-muted-foreground">Всего выполнений</div>
            </div>
          </div>
        </Card>

        <Card className="glass-card border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-habit-positive/20">
              <Calendar className="h-5 w-5 text-habit-positive" />
            </div>
            <div>
              <div className="text-2xl font-bold">{Math.round(stats.completion_rate)}%</div>
              <div className="text-xs text-muted-foreground">Процент выполнения</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Chart */}
      <Card className="glass-card border-white/10 p-6">
        <h2 className="text-xl font-bold mb-4">График прогресса (90 дней)</h2>
        {isProgressLoading ? (
          <Skeleton className="h-64" />
        ) : progressData && progressData.length > 0 ? (
          <HabitProgressChart
            habitId={habit.id}
            habitName={habit.name}
            habitType={habit.habitType || 'daily_check'}
            data={progressData}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Нет данных для отображения
          </div>
        )}
      </Card>

      {/* Calendar Heatmap */}
      <Card className="glass-card border-white/10 p-6">
        <HabitCalendarHeatmap userId={user?.id} habitIds={[habit.id]} />
      </Card>

      {/* Social Section */}
      <HabitSocialSection 
        habitId={habit.id}
        habitName={habit.name}
      />

      {/* History Table */}
      <Card className="glass-card border-white/10 p-6">
        <h2 className="text-xl font-bold mb-4">История выполнений</h2>
        {isProgressLoading ? (
          <Skeleton className="h-48" />
        ) : progressData && progressData.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {progressData
              .filter(day => day.completed)
              .reverse()
              .map((day, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg glass-card border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-habit-positive/20">
                      {format(day.date, 'd MMM yyyy', { locale: ru })}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(day.date, 'EEEE', { locale: ru })}
                    </span>
                  </div>
                  {day.streak && day.streak > 1 && (
                    <Badge variant="outline" className="border-habit-negative/50">
                      <Flame className="mr-1 h-3 w-3 text-habit-negative" />
                      {day.streak} дней подряд
                    </Badge>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            История пуста
          </div>
        )}
      </Card>
    </div>
  );
}
