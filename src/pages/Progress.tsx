import { useAuth } from '@/hooks/useAuth';
import { useChallengeGoals } from '@/hooks/useChallengeGoals';
import { ChallengeGoalCard } from '@/components/progress/ChallengeGoalCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trophy } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useNavigate } from 'react-router-dom';

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: goals, isLoading, refetch } = useChallengeGoals(user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Прогресс</h1>
            <p className="text-muted-foreground mt-1">
              Ваши цели из челленджей
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </Button>
        </div>

        {/* Goals Grid */}
        {!goals || goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <EmptyState
              icon={<Trophy className="h-12 w-12" />}
              title="Вы пока не участвуете в челленджах"
              description="Присоединитесь к челленджу, чтобы отслеживать свой прогресс"
            />
            <Button 
              onClick={() => navigate('/challenges')}
              className="mt-6"
            >
              Присоединиться к челленджу
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {goals.map((goal) => (
              <ChallengeGoalCard
                key={goal.id}
                goal={goal}
                onMeasurementAdded={() => refetch()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
