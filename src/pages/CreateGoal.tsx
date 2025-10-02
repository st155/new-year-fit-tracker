import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, ArrowLeft, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FitnessCard } from "@/components/ui/fitness-card";
import { useTranslation } from "react-i18next";
const CreateGoalPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  
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
      label: t('createGoalPage.goalTypes.strength.label'),
      color: 'bg-primary/10 text-primary border-primary/20',
      description: t('createGoalPage.goalTypes.strength.desc'),
      examples: []
    },
    {
      value: 'cardio',
      label: t('createGoalPage.goalTypes.cardio.label'),
      color: 'bg-accent/10 text-accent border-accent/20',
      description: t('createGoalPage.goalTypes.cardio.desc'),
      examples: []
    },
    {
      value: 'endurance',
      label: t('createGoalPage.goalTypes.endurance.label'),
      color: 'bg-success/10 text-success border-success/20',
      description: t('createGoalPage.goalTypes.endurance.desc'),
      examples: []
    },
    {
      value: 'body_composition',
      label: t('createGoalPage.goalTypes.bodyComposition.label'),
      color: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
      description: t('createGoalPage.goalTypes.bodyComposition.desc'),
      examples: []
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
            {t('createGoalPage.backToProgress')}
          </Button>
          
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t('createGoalPage.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('createGoalPage.subtitle')}
          </p>
        </div>

        <FitnessCard className="p-6 animate-fade-in">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {t('createGoalPage.sectionInfo')}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="goal_name">{t('createGoalPage.fields.goalName')}</Label>
                <Input
                  id="goal_name"
                  placeholder={t('createGoalPage.fields.goalNamePlaceholder')}
                  value={goalForm.goal_name}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, goal_name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="goal_type">{t('createGoalPage.fields.goalType')}</Label>
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
                  <Label htmlFor="target_value">{t('createGoalPage.fields.targetValue')}</Label>
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
                  <Label htmlFor="target_unit">{t('createGoalPage.fields.unit')}</Label>
                  <Input
                    id="target_unit"
                    placeholder={t('createGoalPage.fields.unitPlaceholder')}
                    value={goalForm.target_unit}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, target_unit: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">{t('createGoalPage.fields.description')}</Label>
                <Textarea
                  id="notes"
                  placeholder={t('createGoalPage.fields.descriptionPlaceholder')}
                  value={goalForm.notes}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {selectedGoalType && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">{t('createGoalPage.preview.title')}</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{goalForm.goal_name || t('createGoalPage.preview.defaultGoalName')}</span>
                    <Badge className={selectedGoalType.color}>
                      {selectedGoalType.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('createGoalPage.preview.targetPrefix')} {goalForm.target_value || '0'} {goalForm.target_unit || 'units'}
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
                {t('createGoalPage.actions.cancel')}
              </Button>
              <Button
                onClick={createGoal}
                disabled={loading}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('createGoalPage.actions.creating')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('createGoalPage.actions.create')}
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