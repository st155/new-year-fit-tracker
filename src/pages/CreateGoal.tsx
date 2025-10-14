import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Target, ArrowLeft, Save, Users, UserCheck, Copy } from "lucide-react";
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
import { useTranslation } from "@/lib/translations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { completeOnboardingStep, ONBOARDING_STEPS } from "@/lib/onboarding-utils";

const CreateGoalPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [creationMode, setCreationMode] = useState<'custom' | 'copy' | 'trainer'>('custom');
  const [users, setUsers] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  
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

  // Загружаем список пользователей и тренеров
  useEffect(() => {
    const fetchUsersAndTrainers = async () => {
      setLoadingUsers(true);
      try {
        // Получаем участников челленджей
        const { data: participants } = await supabase
          .from('challenge_participants')
          .select(`
            user_id,
            profiles:user_id (
              user_id,
              username,
              full_name,
              avatar_url
            )
          `)
          .neq('user_id', user!.id);

        if (participants) {
          const uniqueUsers = Array.from(
            new Map(participants.map(p => [p.user_id, p.profiles])).values()
          ).filter(Boolean);
          setUsers(uniqueUsers as any[]);
        }

        // Получаем тренеров
        const { data: trainerData } = await supabase
          .from('trainer_clients')
          .select(`
            trainer_id,
            profiles:trainer_id (
              user_id,
              username,
              full_name,
              avatar_url,
              trainer_role
            )
          `)
          .eq('client_id', user!.id)
          .eq('active', true);

        if (trainerData) {
          const uniqueTrainers = Array.from(
            new Map(trainerData.map(t => [t.trainer_id, t.profiles])).values()
          ).filter(Boolean);
          setTrainers(uniqueTrainers as any[]);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsersAndTrainers();
  }, [user]);

  const copyUserGoals = async () => {
    if (!selectedUserId) {
      toast({
        title: t('createGoalPage.toasts.errorTitle'),
        description: t('createGoalPage.toasts.selectUser'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: userGoals, error: fetchError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', selectedUserId)
        .eq('is_personal', true);

      if (fetchError) throw fetchError;

      if (!userGoals || userGoals.length === 0) {
        toast({
          title: t('createGoalPage.toasts.errorTitle'),
          description: t('createGoalPage.toasts.noUserGoals'),
        });
        return;
      }

      const goalsToInsert = userGoals.map(goal => ({
        user_id: user!.id,
        goal_name: goal.goal_name,
        goal_type: goal.goal_type,
        target_value: goal.target_value,
        target_unit: goal.target_unit,
        is_personal: true
      }));

      const { error: insertError } = await supabase
        .from('goals')
        .insert(goalsToInsert);

      if (insertError) throw insertError;

      toast({
        title: t('createGoalPage.toasts.successTitle'),
        description: t('createGoalPage.toasts.copiedGoals', { count: userGoals.length }),
      });

      // Mark onboarding step as completed
      completeOnboardingStep(user!.id, ONBOARDING_STEPS.CREATE_GOALS);

      navigate('/progress');
    } catch (error) {
      console.error('Error copying goals:', error);
      toast({
        title: t('createGoalPage.toasts.errorTitle'),
        description: t('createGoalPage.toasts.errorCopying'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrainerGoals = async () => {
    if (!selectedTrainerId) {
      toast({
        title: t('createGoalPage.toasts.errorTitle'),
        description: t('createGoalPage.toasts.selectTrainer'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: trainerGoals, error: fetchError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', selectedTrainerId)
        .eq('is_personal', false);

      if (fetchError) throw fetchError;

      if (!trainerGoals || trainerGoals.length === 0) {
        toast({
          title: t('createGoalPage.toasts.errorTitle'),
          description: t('createGoalPage.toasts.noTrainerGoals'),
        });
        return;
      }

      const goalsToInsert = trainerGoals.map(goal => ({
        user_id: user!.id,
        goal_name: goal.goal_name,
        goal_type: goal.goal_type,
        target_value: goal.target_value,
        target_unit: goal.target_unit,
        is_personal: true
      }));

      const { error: insertError } = await supabase
        .from('goals')
        .insert(goalsToInsert);

      if (insertError) throw insertError;

      toast({
        title: t('createGoalPage.toasts.successTitle'),
        description: t('createGoalPage.toasts.receivedGoals', { count: trainerGoals.length }),
      });

      // Mark onboarding step as completed
      completeOnboardingStep(user!.id, ONBOARDING_STEPS.CREATE_GOALS);

      navigate('/progress');
    } catch (error) {
      console.error('Error getting trainer goals:', error);
      toast({
        title: t('createGoalPage.toasts.errorTitle'),
        description: t('createGoalPage.toasts.errorReceiving'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async () => {
    if (!goalForm.goal_name || !goalForm.target_value || !goalForm.target_unit) {
      toast({
        title: t('createGoalPage.toasts.errorTitle'),
        description: t('createGoalPage.toasts.errorRequired'),
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
        title: t('createGoalPage.toasts.successTitle'),
        description: t('createGoalPage.toasts.successCreated'),
      });

      // Mark onboarding step as completed
      completeOnboardingStep(user!.id, ONBOARDING_STEPS.CREATE_GOALS);

      navigate('/progress');
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: t('createGoalPage.toasts.errorTitle'),
        description: t('createGoalPage.toasts.errorCreate'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedGoalType = goalTypes.find(type => type.value === goalForm.goal_type);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4">
        {/* Compact Header */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/progress')}
            className="mb-2 -ml-2 h-8 px-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('createGoalPage.backToProgress')}
          </Button>
          
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t('createGoalPage.title')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('createGoalPage.subtitle')}
          </p>
        </div>

        <FitnessCard className="p-4 animate-fade-in">
          {/* Табы для выбора способа создания */}
          <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as any)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="custom" className="text-xs">
                {t('createGoalPage.tabs.custom')}
              </TabsTrigger>
              <TabsTrigger value="copy" className="text-xs">
                {t('createGoalPage.tabs.copy')}
              </TabsTrigger>
              <TabsTrigger value="trainer" className="text-xs">
                {t('createGoalPage.tabs.trainer')}
              </TabsTrigger>
            </TabsList>

            {/* Создать свою цель */}
            <TabsContent value="custom" className="space-y-4 mt-3">
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
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
            </TabsContent>

            {/* Скопировать цели другого пользователя */}
            <TabsContent value="copy" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {t('createGoalPage.copyTab.title')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('createGoalPage.copyTab.description')}
                </p>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : users.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {t('createGoalPage.copyTab.noUsers')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {users.map((userProfile: any) => (
                    <Card
                      key={userProfile.user_id}
                      className={`cursor-pointer transition-all duration-200 hover:scale-102 ${
                        selectedUserId === userProfile.user_id
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedUserId(userProfile.user_id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={userProfile.avatar_url} />
                            <AvatarFallback>
                              {(userProfile.username || userProfile.full_name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">
                              {userProfile.full_name || userProfile.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{userProfile.username}
                            </p>
                          </div>
                          {selectedUserId === userProfile.user_id && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
                  onClick={copyUserGoals}
                  disabled={loading || !selectedUserId}
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('createGoalPage.actions.creating')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      {t('createGoalPage.copyTab.copyButton')}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Получить цели от тренера */}
            <TabsContent value="trainer" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  {t('createGoalPage.trainerTab.title')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('createGoalPage.trainerTab.description')}
                </p>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : trainers.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {t('createGoalPage.trainerTab.noTrainers')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {trainers.map((trainerProfile: any) => (
                    <Card
                      key={trainerProfile.user_id}
                      className={`cursor-pointer transition-all duration-200 hover:scale-102 ${
                        selectedTrainerId === trainerProfile.user_id
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedTrainerId(trainerProfile.user_id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={trainerProfile.avatar_url} />
                            <AvatarFallback>
                              {(trainerProfile.username || trainerProfile.full_name || 'T').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">
                              {trainerProfile.full_name || trainerProfile.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{trainerProfile.username}
                            </p>
                          </div>
                          <Badge variant="secondary">{t('common.trainer')}</Badge>
                          {selectedTrainerId === trainerProfile.user_id && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
                  onClick={getTrainerGoals}
                  disabled={loading || !selectedTrainerId}
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('createGoalPage.actions.creating')}
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      {t('createGoalPage.trainerTab.getButton')}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </FitnessCard>
      </div>
    </div>
  );
};

export default CreateGoalPage;
