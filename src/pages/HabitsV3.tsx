import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartView } from '@/components/habits-v3/layouts';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useToast } from '@/hooks/use-toast';

export default function HabitsV3() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { habits, isLoading, refetch } = useHabits(user?.id || '');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleHabitComplete = async (habitId: string) => {
    // TODO: Implement habit completion logic
    toast({
      title: "Привычка выполнена!",
      description: "Отличная работа! Продолжайте в том же духе.",
    });
    await refetch();
  };

  const handleHabitTap = (habitId: string) => {
    navigate(`/habits/${habitId}`);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold">Привычки 3.0</h1>
          </div>
          <Button onClick={() => navigate('/habits/new')} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Добавить
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="smart" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="smart" className="text-xs sm:text-sm">
              🧠 Умный вид
            </TabsTrigger>
            <TabsTrigger value="compact" className="text-xs sm:text-sm">
              📋 Список
            </TabsTrigger>
            <TabsTrigger value="focus" className="text-xs sm:text-sm hidden lg:block">
              🎯 Фокус
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs sm:text-sm hidden lg:block">
              ⏰ Таймлайн
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm hidden lg:block">
              📊 Аналитика
            </TabsTrigger>
          </TabsList>

          <TabsContent value="smart">
            <SmartView
              habits={habits}
              onHabitComplete={handleHabitComplete}
              onHabitTap={handleHabitTap}
            />
          </TabsContent>

          <TabsContent value="compact">
            <div className="glass-card p-6 text-center text-muted-foreground">
              📋 Компактный вид в разработке
            </div>
          </TabsContent>

          <TabsContent value="focus">
            <div className="glass-card p-6 text-center text-muted-foreground">
              🎯 Режим фокуса в разработке
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <div className="glass-card p-6 text-center text-muted-foreground">
              ⏰ Временная шкала в разработке
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="glass-card p-6 text-center text-muted-foreground">
              📊 Аналитика в разработке
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PullToRefresh>
  );
}
