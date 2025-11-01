import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, Heart, TrendingUp, Weight, Activity, Target } from 'lucide-react';
import { GoalCard } from './GoalCard';
import { QuickMeasurementDialog } from './QuickMeasurementDialog';
import { GoalEditDialog } from './GoalEditDialog';
import { cn } from '@/lib/utils';

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  current_value: number;
  progress_percentage: number;
  last_measurement_date: string | null;
  measurements_count: number;
}

interface GroupedGoalsViewProps {
  goals: Goal[];
  clientId: string;
  onRefresh: () => void;
}

export function GroupedGoalsView({ goals, clientId, onRefresh }: GroupedGoalsViewProps) {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const groupedGoals = useMemo(() => {
    const groups: Record<string, Goal[]> = {
      strength: [],
      cardio: [],
      endurance: [],
      body_composition: [],
      flexibility: [],
      other: []
    };

    goals.forEach(goal => {
      const type = goal.goal_type || 'other';
      if (groups[type]) {
        groups[type].push(goal);
      } else {
        groups.other.push(goal);
      }
    });

    return groups;
  }, [goals]);

  const typeLabels: Record<string, { label: string; icon: JSX.Element; color: string }> = {
    strength: { 
      label: 'Сила', 
      icon: <Dumbbell className="h-5 w-5" />,
      color: 'bg-red-500/10 text-red-600'
    },
    cardio: { 
      label: 'Кардио', 
      icon: <Heart className="h-5 w-5" />,
      color: 'bg-pink-500/10 text-pink-600'
    },
    endurance: { 
      label: 'Выносливость', 
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-blue-500/10 text-blue-600'
    },
    body_composition: { 
      label: 'Состав тела', 
      icon: <Weight className="h-5 w-5" />,
      color: 'bg-green-500/10 text-green-600'
    },
    flexibility: { 
      label: 'Гибкость', 
      icon: <Activity className="h-5 w-5" />,
      color: 'bg-purple-500/10 text-purple-600'
    },
    other: { 
      label: 'Другое', 
      icon: <Target className="h-5 w-5" />,
      color: 'bg-gray-500/10 text-gray-600'
    }
  };

  const handleAddMeasurement = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowMeasurement(true);
  };

  const handleEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowEdit(true);
  };

  return (
    <>
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex md:grid md:grid-cols-6">
          <TabsTrigger value="all">Все ({goals.length})</TabsTrigger>
          {Object.entries(typeLabels).map(([type, { label }]) => {
            const count = groupedGoals[type]?.length || 0;
            if (count === 0) return null;
            return (
              <TabsTrigger key={type} value={type}>
                {label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map(goal => (
              <GoalCard 
                key={goal.id} 
                goal={goal}
                onAddMeasurement={() => handleAddMeasurement(goal)}
                onEdit={() => handleEdit(goal)}
              />
            ))}
          </div>
        </TabsContent>

        {Object.entries(groupedGoals).map(([type, typeGoals]) => {
          if (typeGoals.length === 0) return null;
          const typeConfig = typeLabels[type];
          
          if (!typeConfig) {
            console.warn(`⚠️ Unknown goal type: ${type}`);
            return null;
          }
          
          return (
            <TabsContent key={type} value={type} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={cn("p-2 rounded-lg", typeConfig.color)}>
                  {typeConfig.icon}
                </div>
                <h3 className="text-lg font-semibold">{typeConfig.label}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {typeGoals.map(goal => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal}
                    onAddMeasurement={() => handleAddMeasurement(goal)}
                    onEdit={() => handleEdit(goal)}
                  />
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {selectedGoal && (
        <>
          <QuickMeasurementDialog
            goal={selectedGoal}
            clientId={clientId}
            open={showMeasurement}
            onOpenChange={setShowMeasurement}
            onSuccess={() => {
              onRefresh();
              setShowMeasurement(false);
            }}
          />
          
          <GoalEditDialog
            goal={selectedGoal}
            open={showEdit}
            onOpenChange={setShowEdit}
            onSuccess={() => {
              onRefresh();
              setShowEdit(false);
            }}
          />
        </>
      )}
    </>
  );
}
