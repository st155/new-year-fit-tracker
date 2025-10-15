import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Challenge {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  challenge_participants: any[];
  isParticipant?: boolean;
}

interface ChallengeCardProps {
  challenge: Challenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const participantCount = challenge.challenge_participants?.length || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {challenge.title}
          {challenge.isParticipant && (
            <Badge variant="default" className="ml-auto">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Participating
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {challenge.description}
        </p>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            {participantCount} participants
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(challenge.end_date).toLocaleDateString()}
          </div>
        </div>
        <Button asChild className="w-full" variant={challenge.isParticipant ? "outline" : "default"}>
          <Link to={`/challenges/${challenge.id}`}>
            {challenge.isParticipant ? "View Progress" : "View Challenge"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
