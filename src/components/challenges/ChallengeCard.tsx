import { motion } from 'framer-motion';
import { hoverLift } from '@/lib/animations-v3';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, Calendar, CheckCircle2, Clock, Target, UserPlus, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { ChallengePreviewStats } from "./ChallengePreviewStats";
import { ChallengeMiniProgress } from "./ChallengeMiniProgress";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  challenge_participants: any[];
  isParticipant?: boolean;
  isFeatured?: boolean;
  completedGoals?: number;
  totalGoals?: number;
}

interface ChallengeCardProps {
  challenge: Challenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const participantCount = challenge.challenge_participants?.length || 0;
  const endDate = new Date(challenge.end_date);
  const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isEnding = daysLeft <= 7 && daysLeft > 0;
  const totalGoals = challenge.totalGoals || 9;
  const completedGoals = challenge.completedGoals || 0;

  return (
    <motion.div whileHover={hoverLift.whileHover} className="pointer-events-auto">
      <Card className={`glass-card group overflow-hidden relative cursor-pointer ${
        challenge.isParticipant 
          ? "border-2 border-primary shadow-glow-primary" 
          : "border-primary/20"
      }`}>
        <Link
          to={`/challenges/${challenge.id}`}
          aria-label={`Open challenge: ${challenge.title}`}
          className="absolute inset-0 z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          tabIndex={0}
        />
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-primary transition-opacity pointer-events-none ${
        challenge.isParticipant 
          ? "opacity-5" 
          : "opacity-0 group-hover:opacity-5"
      }`} />
      
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg relative",
              challenge.isFeatured ? "bg-gradient-to-br from-yellow-500 to-orange-500" : "bg-gradient-primary"
            )}>
              <Trophy className="h-5 w-5 text-white" />
              {challenge.isFeatured && (
                <Star className="h-3 w-3 text-white absolute -top-1 -right-1 animate-pulse" />
              )}
            </div>
            <CardTitle className="text-xl group-hover:text-primary transition-colors">
              {challenge.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {challenge.isFeatured && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                Featured
              </Badge>
            )}
            {challenge.isParticipant ? (
              <Badge className="bg-success/20 text-success border-success/50 animate-pulse">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Участвую
              </Badge>
            ) : (
              <Badge variant="outline">
                Доступно
              </Badge>
            )}
          </div>
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
            <p className="text-lg font-bold text-secondary">{totalGoals}</p>
          </div>
        </div>

        {/* Progress Stats */}
        {challenge.isParticipant && (
          <div className="space-y-3">
            <ChallengeMiniProgress goals={totalGoals} completed={completedGoals} />
            <ChallengePreviewStats />
          </div>
        )}

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
          className={challenge.isParticipant 
            ? "w-full bg-gradient-primary hover:opacity-90" 
            : "w-full bg-gradient-primary hover:opacity-90 shadow-glow-primary"
          }
          size="lg"
          tabIndex={-1}
          aria-hidden="true"
        >
          <span className="flex items-center justify-center gap-2">
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
          </span>
        </Button>
      </CardContent>
    </Card>
    </motion.div>
  );
}
