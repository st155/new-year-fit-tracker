import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTrainerChallenges } from "@/hooks/useTrainerChallenges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChallengeParticipantsList } from "./ChallengeParticipantsList";
import { CreateChallengeDialog } from "./CreateChallengeDialog";
import { CreateChallengeDialogAI } from "./CreateChallengeDialogAI";
import { EditChallengeDialog } from "./EditChallengeDialog";
import { TemplateManager } from "./templates/TemplateManager";
import { SaveAsTemplateDialog } from "./templates/SaveAsTemplateDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trophy, Users, Target, Calendar, Plus, Edit, CheckCircle, Sparkles, FileText, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

export function TrainerChallengesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { challenges, isLoading, refetch } = useTrainerChallenges(user?.id);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createAIDialogOpen, setCreateAIDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [challengeToEdit, setChallengeToEdit] = useState<any>(null);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [challengeToSaveAsTemplate, setChallengeToSaveAsTemplate] = useState<any>(null);

  // Real-time updates for challenge participants с правильной очисткой
  useEffect(() => {
    if (!selectedChallenge) return;
    
    // Создаем канал для real-time подписки
    const channel = supabase
      .channel(`challenge-participants-${selectedChallenge}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_participants',
          filter: `challenge_id=eq.${selectedChallenge}`
        },
        () => {
          console.log("Challenge participants updated");
          sonnerToast.info("Список участников обновлен");
          refetch();
        }
      )
      .subscribe();

    // Обязательная очистка при размонтировании
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChallenge, refetch]);

  const handleCompleteChallenge = async (challengeId: string) => {
    try {
      const { error } = await supabase
        .from("challenges")
        .update({ is_active: false })
        .eq("id", challengeId);

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Челлендж завершен",
      });

      refetch();
    } catch (error: any) {
      console.error("Error completing challenge:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось завершить челлендж",
        variant: "destructive",
      });
    }
  };

  const handleEditChallenge = (challenge: any) => {
    setChallengeToEdit(challenge);
    setEditDialogOpen(true);
  };

  const handleSaveAsTemplate = (challenge: any) => {
    setChallengeToSaveAsTemplate(challenge);
    setSaveTemplateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const activeChallenges = challenges.filter((c) => c.is_active);
  const completedChallenges = challenges.filter((c) => !c.is_active);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Мои челленджи</h2>
          <p className="text-muted-foreground">
            Управляйте челленджами и участниками
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplateManagerOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Classic
          </Button>
          <Button onClick={() => setCreateAIDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Mode
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные челленджи</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeChallenges.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего участников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {challenges.reduce((sum, c) => sum + c.participants.length, 0)}
            </div>
          </CardContent>
        </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Всего дисциплин</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {challenges.reduce((sum, c) => sum + ((c as any).totalDisciplines || 0), 0)}
                    </div>
                  </CardContent>
                </Card>
      </div>

      {/* Список челленджей */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Активные ({activeChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Завершенные ({completedChallenges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeChallenges.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Нет активных челленджей</p>
            </Card>
          ) : (
            activeChallenges.map((challenge) => (
              <Card key={challenge.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{challenge.title}</CardTitle>
                        <Badge variant="outline">
                          {challenge.is_active ? "Активен" : "Завершен"}
                        </Badge>
                      </div>
                      <CardDescription className="mt-2">
                        {challenge.description}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditChallenge(challenge)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Challenge
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSaveAsTemplate(challenge)}>
                            <Save className="h-4 w-4 mr-2" />
                            Save as Template
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompleteChallenge(challenge.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(challenge.start_date).toLocaleDateString("ru-RU")} -{" "}
                      {new Date(challenge.end_date).toLocaleDateString("ru-RU")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {challenge.participants.length} участников
                    </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {(challenge as any).totalDisciplines || 0} дисциплин
                        </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedChallenge === challenge.id ? (
                    <>
                      <div className="flex justify-end mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedChallenge(null)}
                        >
                          Скрыть участников
                        </Button>
                      </div>
                      <ChallengeParticipantsList
                        challengeId={challenge.id}
                        challengeName={challenge.title}
                        participants={challenge.participants}
                        onRefresh={refetch}
                      />
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedChallenge(challenge.id)}
                    >
                      Показать участников
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedChallenges.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Нет завершенных челленджей</p>
            </Card>
          ) : (
            completedChallenges.map((challenge) => (
              <Card key={challenge.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{challenge.title}</CardTitle>
                        <Badge variant="secondary">Завершен</Badge>
                      </div>
                      <CardDescription className="mt-2">
                        {challenge.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {challenge.participants.length} участников
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <CreateChallengeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />

      <CreateChallengeDialogAI
        open={createAIDialogOpen}
        onOpenChange={setCreateAIDialogOpen}
        trainerId={user?.id || ''}
        onSuccess={refetch}
      />

      <EditChallengeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        challenge={challengeToEdit}
        onSuccess={refetch}
      />

      <TemplateManager
        open={templateManagerOpen}
        onOpenChange={setTemplateManagerOpen}
        onSuccess={refetch}
      />

      {challengeToSaveAsTemplate && (
        <SaveAsTemplateDialog
          open={saveTemplateDialogOpen}
          onOpenChange={setSaveTemplateDialogOpen}
          challengeId={challengeToSaveAsTemplate.id}
          challengeTitle={challengeToSaveAsTemplate.title}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
