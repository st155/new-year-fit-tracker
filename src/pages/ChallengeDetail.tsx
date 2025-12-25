import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChallengeDetail } from "@/hooks/useChallengeDetail";
import { useIsParticipant } from "@/hooks/useIsParticipant";
import { useDifficultyLevel } from "@/hooks/useDifficultyLevel";
import { ChallengeFeed } from "@/components/challenge/ChallengeFeed";
import { ChallengeChat } from "@/components/challenge/ChallengeChat";
import { ChallengeLeaderboard } from "@/components/challenge/ChallengeLeaderboard";
import { ChallengeProgressDashboard } from "@/components/challenges/ChallengeProgressDashboard";
import { ChallengeInfoBlock } from "@/components/challenges/ChallengeInfoBlock";
import { ChallengeStatsOverview } from "@/components/challenges/ChallengeStatsOverview";
import { DifficultySelectorDialog } from "@/components/challenge/DifficultySelectorDialog";
import { DifficultyBadge } from "@/components/challenge/DifficultyBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Trophy, Target, LogOut, Info, Calendar, Users, UserPlus, ArrowLeft, List, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { captureBaseline } from "@/lib/challenge-baseline";

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { challenge, isLoading } = useChallengeDetail(id);
  const { data: isParticipant = false, refetch: refetchParticipation } = useIsParticipant(id, user?.id);
  const { data: difficultyLevel = 0 } = useDifficultyLevel(id, user?.id);
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);

  // Fetch challenge disciplines for difficulty dialog
  const { data: disciplines = [] } = useQuery({
    queryKey: ["challenge-disciplines", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("challenge_disciplines")
        .select("discipline_name, benchmark_value, unit")
        .eq("challenge_id", id)
        .order("position");
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: async (difficulty: number = 0) => {
      if (!user || !id) throw new Error("Missing user or challenge ID");
      
      const { data, error } = await supabase.rpc('join_challenge', {
        p_challenge_id: id,
        p_difficulty_level: difficulty
      });

      if (error) throw error;
      
      console.log('✅ Joined challenge:', data);
      return data;
    },
    onSuccess: async (data) => {
      const result = data as any;
      const goalsCreated = result?.goals_created || 0;
      
      if (goalsCreated > 0) {
        toast.success(`Вы присоединились к челленджу! Создано целей: ${goalsCreated}`);
      } else {
        toast.success("Вы присоединились к челленджу!");
      }
      
      // Capture baseline metrics
      if (user && id) {
        await captureBaseline(user.id, id);
      }
      
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      refetchParticipation();
    },
    onError: (error: any) => {
      console.error('❌ [join_challenge] Failed:', {
        error: error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        challengeId: id,
        userId: user?.id
      });
      
      const errorMessage = error?.message || "Не удалось присоединиться к челленджу";
      toast.error(errorMessage, {
        description: import.meta.env.DEV ? `Error: ${error?.code || 'unknown'}` : undefined
      });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Missing user or challenge ID");
      
      const { data, error, count } = await supabase
        .from("challenge_participants")
        .delete({ count: 'exact' })
        .eq("challenge_id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error('❌ [leaveMutation] Delete failed:', error);
        throw error;
      }
      
      if (count === 0) {
        throw new Error("Не удалось найти участие в челлендже");
      }
      
      console.log('✅ [leaveMutation] Delete successful:', { count });
      return { count };
    },
    onSuccess: () => {
      toast.success("Вы вышли из челленджа");
      
      // Invalidate multiple related queries
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["is-participant"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      
      // Force refetch participation status
      refetchParticipation();
      
      // Navigate with a small delay to ensure queries are invalidated
      setTimeout(() => {
        navigate("/challenges");
      }, 100);
    },
    onError: (error: any) => {
      console.error('❌ [leaveMutation] Failed:', {
        error: error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      
      const errorMessage = error?.message || "Не удалось выйти из челленджа";
      toast.error(errorMessage, {
        description: import.meta.env.DEV ? `Error: ${error?.code || 'unknown'}` : 'Проверьте права доступа'
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Challenge not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysLeft = Math.ceil((new Date(challenge.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="container py-6 space-y-6">
      {/* Enhanced Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/challenges")}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к челленджам
        </Button>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 md:p-12">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
          <div className="relative z-10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-4xl md:text-5xl font-bold text-white">{challenge.title}</h1>
                  {isParticipant && (
                    <>
                      <Badge className="bg-success/20 text-success border-success/50">
                        ✓ Участвую
                      </Badge>
                      <DifficultyBadge level={difficultyLevel} />
                    </>
                  )}
                </div>
                <p className="text-white/90 text-lg max-w-2xl">{challenge.description}</p>
              </div>

              {!isParticipant ? (
                <Button
                  onClick={() => setShowDifficultyDialog(true)}
                  disabled={joinMutation.isPending}
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-white/90 shrink-0 font-semibold"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {joinMutation.isPending ? "Присоединение..." : "Участвовать"}
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20 shrink-0"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Выйти
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Выйти из челленджа?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Вы уверены, что хотите выйти из челленджа? Ваш прогресс и очки будут сохранены, но вы больше не будете участвовать в соревновании.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={() => leaveMutation.mutate()}>
                        Выйти
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Начало
                </div>
                <p className="text-sm font-bold text-white">
                  {formatDistanceToNow(new Date(challenge.start_date), { addSuffix: true, locale: enUS })}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                  <Trophy className="h-3.5 w-3.5" />
                  Осталось
                </div>
                <p className="text-sm font-bold text-white">
                  {daysLeft > 0 ? `${daysLeft} дней` : "Завершен"}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                  <Target className="h-3.5 w-3.5" />
                  Целей
                </div>
                <p className="text-2xl font-bold text-white">9</p>
              </div>
              {isParticipant && (
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/challenges/${id}/report${daysLeft > 0 ? '?preview=true' : ''}`)}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 h-auto flex flex-col items-start hover:bg-white/20"
                >
                  <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                    <FileText className="h-3.5 w-3.5" />
                    {daysLeft > 0 ? "Превью" : "Итоги"}
                  </div>
                  <p className="text-sm font-bold text-white">
                    {daysLeft > 0 ? "Отчёт" : "Смотреть"}
                  </p>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <ChallengeStatsOverview challengeId={id!} />

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="dashboard" className="gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">О челлендже</span>
          </TabsTrigger>
          <TabsTrigger value="feed" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Лента</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Чат</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Лидерборд</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {isParticipant ? (
            <ChallengeProgressDashboard 
              challengeId={id!} 
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["challenge-detail", id] })}
            />
          ) : (
            <ChallengeInfoBlock 
              challengeId={id!}
              onJoinClick={() => setShowDifficultyDialog(true)}
              isJoining={joinMutation.isPending}
            />
          )}
        </TabsContent>

        <TabsContent value="feed" className="mt-6">
          <ChallengeFeed challengeId={id!} />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ChallengeChat challengeId={id!} />
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <ChallengeLeaderboard challengeId={id!} />
        </TabsContent>
      </Tabs>

      <DifficultySelectorDialog
        open={showDifficultyDialog}
        onOpenChange={setShowDifficultyDialog}
        disciplines={disciplines}
        onConfirm={(level) => {
          joinMutation.mutate(level);
          setShowDifficultyDialog(false);
        }}
      />
    </div>
  );
}
