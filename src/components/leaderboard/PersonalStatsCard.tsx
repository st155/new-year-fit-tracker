import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Flame, Activity } from "lucide-react";
import { UserLevel } from "./UserLevel";
import { formatPoints } from "@/lib/challenge-scoring-v3";
import type { LeaderboardEntry } from "@/lib/challenge-scoring-v3";

interface PersonalStatsCardProps {
  userEntry?: LeaderboardEntry;
  leaderboard: LeaderboardEntry[];
}

export function PersonalStatsCard({ userEntry, leaderboard }: PersonalStatsCardProps) {
  if (!userEntry) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Join a challenge to see your stats</p>
        </CardContent>
      </Card>
    );
  }

  const leader = leaderboard[0];
  const pointsBehind = leader ? leader.totalPoints - userEntry.totalPoints : 0;

  return (
    <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Your Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rank and Points */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">#{userEntry.rank}</span>
              <span className="text-muted-foreground">rank</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{formatPoints(userEntry.totalPoints)}</span>
              <span className="text-muted-foreground">points</span>
            </div>
            {pointsBehind > 0 && userEntry.rank > 1 && (
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {formatPoints(pointsBehind)} behind leader
              </Badge>
            )}
          </div>

          {/* Level Progress */}
          <div>
            <UserLevel totalPoints={userEntry.totalPoints} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
              <Flame className="h-4 w-4" />
              <span className="text-2xl font-bold">{userEntry.streakDays}</span>
            </div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{userEntry.avgRecovery}%</div>
            <div className="text-xs text-muted-foreground">Avg Recovery</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">{userEntry.avgSleep}h</div>
            <div className="text-xs text-muted-foreground">Avg Sleep</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{userEntry.activeDays}</div>
            <div className="text-xs text-muted-foreground">Active Days</div>
          </div>
        </div>

        {/* Badges */}
        {userEntry.badges.length > 0 && (
          <div className="pt-4 border-t">
            <div className="text-sm font-medium mb-2">Your Badges</div>
            <div className="flex gap-2 flex-wrap">
              {userEntry.badges.map(badge => (
                <Badge key={badge.id} variant="secondary" className="gap-1">
                  {badge.icon} {badge.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
