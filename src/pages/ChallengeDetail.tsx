import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChallengeDetail } from "@/hooks/useChallengeDetail";
import { ChallengeFeed } from "@/components/challenge/ChallengeFeed";
import { ChallengeChat } from "@/components/challenge/ChallengeChat";
import { ChallengeLeaderboard } from "@/components/challenge/ChallengeLeaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Trophy, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { challenge, isLoading } = useChallengeDetail(id);

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
      <div>
        <h1 className="text-3xl font-bold">{challenge.title}</h1>
        <p className="text-muted-foreground">{challenge.description}</p>
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
