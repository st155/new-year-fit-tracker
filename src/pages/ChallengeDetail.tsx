import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChallengeDetail } from "@/hooks/useChallengeDetail";
import { ChallengeFeed } from "@/components/challenge/ChallengeFeed";
import { ChallengeChat } from "@/components/challenge/ChallengeChat";
import { ChallengeLeaderboard } from "@/components/challenge/ChallengeLeaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Trophy, Target, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { challenge, isLoading } = useChallengeDetail(id);
  const [isParticipant, setIsParticipant] = useState(false);

  // Check if user is participant
  useState(() => {
    if (user && id) {
      supabase
        .from("challenge_participants")
        .select("*")
        .eq("challenge_id", id)
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          setIsParticipant(!!data);
        });
    }
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Missing user or challenge ID");
      
      const { error } = await supabase
        .from("challenge_participants")
        .delete()
        .eq("challenge_id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Вы вышли из челленджа");
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", id] });
      setIsParticipant(false);
      navigate("/challenges");
    },
    onError: (error) => {
      toast.error("Не удалось выйти из челленджа");
      console.error(error);
    },
  });

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
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

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{challenge.title}</h1>
          <p className="text-muted-foreground">{challenge.description}</p>
        </div>
        {isParticipant && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Выйти из челленджа
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

      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feed">
            <Target className="h-4 w-4 mr-2" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="h-4 w-4 mr-2" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <ChallengeFeed challengeId={id!} />
        </TabsContent>

        <TabsContent value="chat">
          <ChallengeChat challengeId={id!} />
        </TabsContent>

        <TabsContent value="leaderboard">
          <ChallengeLeaderboard challengeId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
