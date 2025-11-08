import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CategoryInfo } from "./LeaderboardCategoryLeaders";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  steps_last_7d?: number;
  avg_sleep_last_7d?: number | null;
  avgSleepEfficiency?: number;
  avg_strain_last_7d?: number | null;
  avg_recovery_last_7d?: number | null;
  weekly_consistency?: number;
  totalPoints: number;
}

interface CategoryLeaderboardDialogProps {
  open: boolean;
  onClose: () => void;
  category: CategoryInfo | null;
  leaderboard: LeaderboardEntry[];
}

interface RankedEntry extends LeaderboardEntry {
  rank: number;
  value: number;
  secondaryValue?: number;
  differenceFromLeader: number;
}

const getMedalEmoji = (rank: number) => {
  switch (rank) {
    case 1: return "🥇";
    case 2: return "🥈";
    case 3: return "🥉";
    default: return null;
  }
};

const getMedalIcon = (rank: number) => {
  switch (rank) {
    case 1: return Trophy;
    case 2: return Medal;
    case 3: return Award;
    default: return null;
  }
};

const getMedalGradient = (rank: number) => {
  switch (rank) {
    case 1: return "from-yellow-400/20 to-yellow-600/20 border-yellow-500/30";
    case 2: return "from-gray-300/20 to-gray-500/20 border-gray-400/30";
    case 3: return "from-orange-400/20 to-orange-600/20 border-orange-500/30";
    default: return "from-background/50 to-background/50 border-border";
  }
};

export function CategoryLeaderboardDialog({ 
  open, 
  onClose, 
  category, 
  leaderboard 
}: CategoryLeaderboardDialogProps) {
  if (!category) return null;

  // Filter and sort leaderboard by the selected metric
  const rankedEntries: RankedEntry[] = leaderboard
    .map(entry => {
      const primaryValue = (entry[category.metricKey] as number) || 0;
      const secondaryValue = category.secondaryMetricKey 
        ? (entry[category.secondaryMetricKey] as number) || 0 
        : undefined;
      
      return {
        ...entry,
        value: primaryValue,
        secondaryValue,
        rank: 0,
        differenceFromLeader: 0
      };
    })
    .filter(entry => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      differenceFromLeader: index === 0 ? 0 : entry.value - leaderboard
        .map(e => (e[category.metricKey] as number) || 0)
        .reduce((max, val) => Math.max(max, val), 0)
    }));

  const leaderValue = rankedEntries[0]?.value || 0;
  const Icon = category.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className={cn("p-2 rounded-lg bg-primary/10", category.color)}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold">{category.title}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {category.description}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-2">
            {rankedEntries.map((entry) => {
              const displayName = entry.fullName || entry.username;
              const MedalIcon = getMedalIcon(entry.rank);
              const difference = entry.value - leaderValue;
              const diffPercent = leaderValue > 0 
                ? ((difference / leaderValue) * 100).toFixed(1)
                : "0.0";

              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-md",
                    "bg-gradient-to-r",
                    getMedalGradient(entry.rank)
                  )}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12 h-12 shrink-0">
                    {MedalIcon ? (
                      <div className={cn(
                        "w-full h-full rounded-full flex items-center justify-center",
                        entry.rank === 1 && "bg-gradient-to-br from-yellow-400 to-yellow-600 animate-pulse",
                        entry.rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-500",
                        entry.rank === 3 && "bg-gradient-to-br from-orange-400 to-orange-600"
                      )}>
                        <MedalIcon className="h-6 w-6 text-white" />
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-muted-foreground">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className={cn(
                    "h-14 w-14 border-2",
                    entry.rank === 1 && "border-yellow-500",
                    entry.rank === 2 && "border-gray-400",
                    entry.rank === 3 && "border-orange-500",
                    entry.rank > 3 && "border-primary/20"
                  )}>
                    <AvatarImage src={entry.avatarUrl || undefined} />
                    <AvatarFallback className="text-sm font-semibold">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name and Stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base truncate">{displayName}</p>
                      {entry.rank <= 3 && (
                        <span className="text-xl">{getMedalEmoji(entry.rank)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{entry.totalPoints.toLocaleString()} pts</span>
                      {entry.rank > 1 && (
                        <span className="text-red-500">
                          {diffPercent}% from leader
                        </span>
                      )}
                      {entry.rank === 1 && (
                        <Badge variant="secondary" className="text-xs">Leader</Badge>
                      )}
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right">
                    <div className={cn("text-2xl font-bold", category.color)}>
                      {category.formatValue(entry.value)}
                    </div>
                    {entry.secondaryValue !== undefined && category.secondaryFormatValue && (
                      <div className="text-xs text-muted-foreground">
                        {category.secondaryFormatValue(entry.secondaryValue)} {category.secondaryLabel}
                      </div>
                    )}
                    {entry.rank > 1 && (
                      <div className="text-xs text-muted-foreground">
                        {difference > 0 ? '+' : ''}{category.formatValue(Math.abs(difference))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {rankedEntries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No data available for this category</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with stats */}
        {rankedEntries.length > 0 && (
          <div className="p-4 border-t border-border/50 bg-muted/30">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-muted-foreground">Participants</p>
                <p className="font-bold text-lg">{rankedEntries.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Leader</p>
                <p className={cn("font-bold text-lg", category.color)}>
                  {category.formatValue(leaderValue)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Average</p>
                <p className="font-bold text-lg">
                  {category.formatValue(
                    rankedEntries.reduce((sum, e) => sum + e.value, 0) / rankedEntries.length
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
