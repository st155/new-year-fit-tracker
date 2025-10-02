import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, ArrowLeft, Plus, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FitnessCard } from "@/components/ui/fitness-card";


const CreateGoalPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [goalForm, setGoalForm] = useState({
    goal_name: '',
    goal_type: 'strength',
    target_value: '',
    target_unit: '',
    notes: ''
  });

  const goalTypes = [
    { 
      value: 'strength', 
      label: 'Strength Exercises', 
      color: 'bg-primary/10 text-primary border-primary/20', 
      description: 'Pull-ups, push-ups, squats, bench press',
      examples: ['Pull-ups - 50 reps', 'Push-ups - 100 reps', 'Squats - 200 reps']
    },
    { 
      value: 'cardio', 
      label: 'Cardio', 
      color: 'bg-accent/10 text-accent border-accent/20', 
      description: 'Running, cycling, swimming, walking',
      examples: ['Running - 10 km', 'Cycling - 50 km', 'Swimming - 2 km']
    },
    { 
      value: 'endurance', 
      label: 'Endurance', 
      color: 'bg-success/10 text-success border-success/20', 
      description: 'Workout duration, number of rounds',
      examples: ['Workout - 90 min', 'Rounds - 20 rounds', 'Plank - 10 min']
    },
    { 
      value: 'body_composition', 
      label: 'Body Composition', 
      color: 'bg-secondary/10 text-secondary-foreground border-secondary/20', 
      description: 'Weight, body fat %, body measurements',
      examples: ['Weight - 70 kg', 'Body fat - 15 %', 'Waist - 80 cm']
    }
  ];

  const createGoal = async () => {
    if (!goalForm.goal_name || !goalForm.target_value || !goalForm.target_unit) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Получаем активный челлендж пользователя
      const { data: challengeData } = await supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          challenges (
            id,
            title,
            is_active
          )
        `)
        .eq('user_id', user!.id);

      let challengeId = null;
      if (challengeData && challengeData.length > 0) {
        const activeChallenge = challengeData.find(p => 
          p.challenges && (p.challenges as any).is_active
        );
        challengeId = activeChallenge?.challenge_id;
      }

      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user!.id,
          challenge_id: challengeId,
          goal_name: goalForm.goal_name,
          goal_type: goalForm.goal_type,
          target_value: parseFloat(goalForm.target_value),
          target_unit: goalForm.target_unit,
          is_personal: true
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Goal created successfully",
      });

      navigate('/progress');
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedGoalType = goalTypes.find(type => type.value === goalForm.goal_type);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        {/* Заголовок */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/progress')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Progress
          </Button>
          
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Create New Goal
          </h1>
          <p className="text-muted-foreground mt-2">
            Set a personal goal to track your progress
          </p>
        </div>

        <FitnessCard className="p-6 animate-fade-in">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Goal Information
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="goal_name">Goal Name *</Label>
                <Input
                  id="goal_name"
                  placeholder="Example: Pull-ups"
                  value={goalForm.goal_name}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, goal_name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="goal_type">Goal Type *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {goalTypes.map((type) => (
                    <Card
                      key={type.value}
                      className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                        goalForm.goal_type === type.value
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setGoalForm(prev => ({ ...prev, goal_type: type.value }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={type.color}>
                            {type.label}
                          </Badge>
                          {goalForm.goal_type === type.value && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {type.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target_value">Target Value *</Label>
                  <Input
                    id="target_value"
                    type="number"
                    step="0.1"
                    placeholder="10"
                    value={goalForm.target_value}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="target_unit">Unit of Measurement *</Label>
                  <Input
                    id="target_unit"
                    placeholder="kg, reps, km, min"
                    value={goalForm.target_unit}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, target_unit: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Description (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add description or notes to the goal..."
                  value={goalForm.notes}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {selectedGoalType && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{goalForm.goal_name || 'Goal Name'}</span>
                    <Badge className={selectedGoalType.color}>
                      {selectedGoalType.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Target: {goalForm.target_value || '0'} {goalForm.target_unit || 'units'}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/progress')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={createGoal}
                disabled={loading}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Goal
                  </>
                )}
              </Button>
            </div>
          </div>
        </FitnessCard>
      </div>
    </div>
  );
};

export default CreateGoalPage;