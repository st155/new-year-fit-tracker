import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  user_id: string;
  points: number;
  posts_count: number;
  comments_count: number;
  likes_received: number;
  streak_days: number;
  profiles?: {
    username: string;
    full_name?: string;
    avatar_url?: string;
    trainer_role?: boolean;
  };
}

interface ParticipantPodiumProps {
  topThree: LeaderboardEntry[];
}

export function ParticipantPodium({ topThree }: ParticipantPodiumProps) {
  if (topThree.length === 0) return null;

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 0: return "h-40";
      case 1: return "h-32";
      case 2: return "h-24";
      default: return "h-24";
    }
  };

  const getPodiumGradient = (position: number) => {
    switch (position) {
      case 0: return "from-gold/20 to-gold/5";
      case 1: return "from-silver/20 to-silver/5";
      case 2: return "from-bronze/20 to-bronze/5";
      default: return "from-muted/20 to-muted/5";
    }
  };

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 0: return <Trophy className="h-8 w-8 text-gold" />;
      case 1: return <Medal className="h-8 w-8 text-silver" />;
      case 2: return <Award className="h-8 w-8 text-bronze" />;
      default: return null;
    }
  };

  const getMedalGlow = (position: number) => {
    switch (position) {
      case 0: return "shadow-[0_0_30px_hsl(var(--gold)/0.4)]";
      case 1: return "shadow-[0_0_30px_hsl(var(--silver)/0.3)]";
      case 2: return "shadow-[0_0_30px_hsl(var(--bronze)/0.3)]";
      default: return "";
    }
  };

  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
  const originalIndices = [1, 0, 2];

  return (
    <div className="w-full">
      <div className="flex items-end justify-center gap-4 mb-8">
        {podiumOrder.map((participant, visualIndex) => {
          if (!participant) return null;
          const originalIndex = originalIndices[visualIndex];
          
          return (
            <div key={participant.user_id} className={cn("flex flex-col items-center gap-3 hover-lift", visualIndex === 1 ? "scale-110" : "")}>
              <div className={cn("animate-bounce-in", getMedalGlow(originalIndex))}>{getMedalIcon(originalIndex)}</div>
              <div className="relative">
                <Avatar className={cn("h-20 w-20 border-4", originalIndex === 0 && "border-gold", originalIndex === 1 && "border-silver", originalIndex === 2 && "border-bronze", getMedalGlow(originalIndex))}>
                  <AvatarImage src={participant.profiles?.avatar_url} />
                  <AvatarFallback className={cn("text-xl font-bold", originalIndex === 0 && "bg-gold/20 text-gold", originalIndex === 1 && "bg-silver/20 text-silver", originalIndex === 2 && "bg-bronze/20 text-bronze")}>
                    {participant.profiles?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {participant.profiles?.trainer_role && <Badge className="absolute -top-2 -right-2 bg-gradient-primary text-white text-xs px-1.5 py-0.5">Trainer</Badge>}
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground">{participant.profiles?.full_name || participant.profiles?.username}</p>
                <p className="text-sm text-muted-foreground">@{participant.profiles?.username}</p>
              </div>
              <div className={cn("w-32 rounded-t-xl bg-gradient-to-b border-t-2 flex flex-col items-center justify-center gap-2 transition-all", getPodiumHeight(originalIndex), getPodiumGradient(originalIndex), originalIndex === 0 && "border-gold", originalIndex === 1 && "border-silver", originalIndex === 2 && "border-bronze")}>
                <div className="flex items-center gap-1">
                  <Star className={cn("h-5 w-5", originalIndex === 0 && "text-gold", originalIndex === 1 && "text-silver", originalIndex === 2 && "text-bronze")} />
                  <span className="text-2xl font-bold">{participant.points}</span>
                </div>
                {participant.streak_days > 0 && <div className="flex items-center gap-1 text-sm"><Flame className="h-4 w-4 text-orange-500" /><span>{participant.streak_days} days</span></div>}
                <div className={cn("text-6xl font-bold opacity-20", originalIndex === 0 && "text-gold", originalIndex === 1 && "text-silver", originalIndex === 2 && "text-bronze")}>{originalIndex + 1}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}