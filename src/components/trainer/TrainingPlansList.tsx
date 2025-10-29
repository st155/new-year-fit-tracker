import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dumbbell, Plus } from 'lucide-react';
import { TrainingPlanBuilder } from './TrainingPlanBuilder';
import { TrainingPlanCard } from './TrainingPlanCard';

interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  created_at: string;
  assigned_count: number;
  workout_count?: number;
}

interface TrainingPlansListProps {
  initialPlanId?: string | null;
}

export const TrainingPlansList = ({ initialPlanId }: TrainingPlansListProps) => {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadPlans = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          assigned_training_plans (count),
          training_plan_workouts (count)
        `)
        .eq('trainer_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const plansWithCount = data.map(plan => ({
        ...plan,
        assigned_count: plan.assigned_training_plans?.[0]?.count || 0,
        workout_count: plan.training_plan_workouts?.[0]?.count || 0
      }));

      setPlans(plansWithCount);
    } catch (error: any) {
      console.error('Error loading plans:', error);
      
      // Log error for diagnostics
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from('error_logs').insert({
          user_id: user.id,
          error_type: 'training_plans_load',
          error_message: error?.message || 'Failed to load training plans',
          source: 'TrainingPlansList',
          stack_trace: error?.stack,
          error_details: { error }
        });
      }
      
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить планы',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('trainer_clients')
        .select(`
          client_id,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name
          )
        `)
        .eq('trainer_id', user.user.id)
        .eq('active', true);

      if (error) throw error;

      setClients(data.map((c: any) => c.profiles));
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  useEffect(() => {
    loadPlans();
    loadClients();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Тренировочные планы</h3>
          <Button onClick={() => setShowBuilder(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать план
          </Button>
        </div>

        {plans.length === 0 ? (
          <Card className="p-8 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Нет тренировочных планов</h3>
            <p className="text-muted-foreground mb-4">
              Создайте первый план для ваших клиентов
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать план
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map(plan => (
              <TrainingPlanCard
                key={plan.id}
                plan={plan}
                onClick={() => navigate(`/training-plans/${plan.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <TrainingPlanBuilder
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        onSuccess={() => {
          loadPlans();
          setShowBuilder(false);
        }}
        clients={clients}
      />
    </>
  );
};
