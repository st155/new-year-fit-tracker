import { useAuth } from "@/hooks/useAuth";
import { useChallenges } from "@/hooks/useChallenges";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Challenges() {
  const { user } = useAuth();
  const { challenges, isLoading } = useChallenges(user?.id);

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Challenges</h1>
        <p className="text-muted-foreground">Join challenges and compete with others</p>
      </div>

      {!challenges || challenges.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title="No active challenges"
          description="Check back later for new challenges or create your own"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}
    </div>
  );
}
