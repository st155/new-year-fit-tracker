import { useAuth } from "@/hooks/useAuth";
import { useChallenges } from "@/hooks/useChallenges";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy, Target, Users, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Challenges() {
  const { user } = useAuth();
  const { challenges, isLoading } = useChallenges(user?.id);

  const activeCount = challenges?.length || 0;
  const participatingCount = challenges?.filter(c => c.isParticipant).length || 0;

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 md:p-12">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">Challenges</h1>
              <p className="text-white/90 text-lg">Push your limits and achieve greatness</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Target className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">{activeCount}</p>
                  <p className="text-sm text-white/80">Active Challenges</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">{participatingCount}</p>
                  <p className="text-sm text-white/80">Your Challenges</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">9</p>
                  <p className="text-sm text-white/80">Goals per Challenge</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Challenges Grid */}
      {!challenges || challenges.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title="No active challenges"
          description="Check back later for new challenges or create your own"
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Available Challenges</h2>
            <p className="text-muted-foreground">Choose a challenge and start your journey</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-fade-in">
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
