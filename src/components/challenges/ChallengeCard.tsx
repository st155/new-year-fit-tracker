import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, Calendar, CheckCircle2, Clock, Target, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

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
  const endDate = new Date(challenge.end_date);
  const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isEnding = daysLeft <= 7 && daysLeft > 0;

  return (
    <Card className="glass-card border-primary/20 hover-lift group overflow-hidden relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
      
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-xl group-hover:text-primary transition-colors">
              {challenge.title}
            </CardTitle>
          </div>
          {challenge.isParticipant ? (
            <Badge className="bg-success/20 text-success border-success/50 shrink-0">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0">
              Доступно
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {challenge.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs">Participants</span>
            </div>
            <p className="text-lg font-bold text-primary">{participantCount}</p>
          </div>

          <div className="glass rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              <span className="text-xs">Goals</span>
            </div>
            <p className="text-lg font-bold text-secondary">9</p>
          </div>
        </div>

        {/* Time Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {daysLeft > 0 ? (
                <>Ends {formatDistanceToNow(endDate, { addSuffix: true, locale: enUS })}</>
              ) : (
                <>Ended</>
              )}
            </span>
          </div>
          {isEnding && (
            <Badge variant="destructive" className="text-xs py-0">
              Ending soon!
            </Badge>
          )}
        </div>

        {/* Participant Avatars Preview */}
        {participantCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {challenge.challenge_participants.slice(0, 3).map((_, i) => (
                <Avatar key={i} className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {String.fromCharCode(65 + i)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {participantCount > 3 && (
              <span className="text-xs text-muted-foreground">
                +{participantCount - 3} more
              </span>
            )}
          </div>
        )}

        <Button 
          asChild 
          className={challenge.isParticipant 
            ? "w-full bg-gradient-primary hover:opacity-90" 
            : "w-full bg-gradient-primary hover:opacity-90 shadow-glow-primary"
          }
          size="lg"
        >
          <Link to={`/challenges/${challenge.id}`} className="flex items-center justify-center gap-2">
            {challenge.isParticipant ? (
              <>
                <Trophy className="h-4 w-4" />
                View Progress
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Присоединиться к челленджу
              </>
            )}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
