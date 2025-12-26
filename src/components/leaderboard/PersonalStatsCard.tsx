import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Flame, Activity, Zap, Info } from "lucide-react";
import { UserLevel } from "./UserLevel";
import { BalanceIndicator } from "./BalanceIndicator";
import { PointsBreakdownDialog } from "./PointsBreakdownDialog";
import { formatPoints, type LeaderboardEntry } from "@/features/challenges/utils";
import { useState } from "react";

interface PersonalStatsCardProps {
  userEntry?: LeaderboardEntry;
  leaderboard: LeaderboardEntry[];
}

export function PersonalStatsCard({ userEntry, leaderboard }: PersonalStatsCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

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
        <div className="space-y-4">
          {/* Rank and Total Points */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">#{userEntry.rank}</span>
                <span className="text-muted-foreground">rank</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{formatPoints(userEntry.totalPoints)}</span>
                <span className="text-muted-foreground">/ 1000 points</span>
              </div>
              {pointsBehind > 0 && userEntry.rank > 1 && (
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {formatPoints(pointsBehind)} behind leader
                </Badge>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowBreakdown(true)}
              className="gap-2"
            >
              <Info className="h-4 w-4" />
              Details
            </Button>
          </div>

          {/* Points Breakdown */}
          {userEntry.pointsBreakdown && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-1 text-blue-500 mb-1">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-medium">Performance</span>
                </div>
                <div className="text-xl font-bold">{userEntry.performancePoints || 0}</div>
                <div className="text-xs text-muted-foreground">/ 400</div>
              </div>
              
              <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                <div className="flex items-center gap-1 text-pink-500 mb-1">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-medium">Recovery</span>
                </div>
                <div className="text-xl font-bold">{userEntry.recoveryPoints || 0}</div>
                <div className="text-xs text-muted-foreground">/ 400</div>
              </div>
              
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-1 text-yellow-500 mb-1">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-medium">Synergy</span>
                </div>
                <div className="text-xl font-bold">{userEntry.synergyPoints || 0}</div>
                <div className="text-xs text-muted-foreground">/ 200</div>
              </div>
            </div>
          )}

          {/* Balance Indicator */}
          <BalanceIndicator 
            strain={userEntry.avg_strain_last_7d || 0}
            recovery={userEntry.avg_recovery_last_7d || 0}
          />
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

      {/* Breakdown Dialog */}
      {userEntry.pointsBreakdown && (
        <PointsBreakdownDialog
          open={showBreakdown}
          onOpenChange={setShowBreakdown}
          breakdown={userEntry.pointsBreakdown}
          totalPoints={userEntry.totalPoints}
        />
      )}
    </Card>
  );
}
