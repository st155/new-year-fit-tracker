import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { formatDistanceToNow } from "date-fns";

interface RecentAchievement {
  userId: string;
  username: string;
  avatarUrl?: string;
  achievementId: string;
  unlockedAt: string;
}

export function FeaturedAchievements() {
  const [recentAchievements, setRecentAchievements] = useState<RecentAchievement[]>([]);

  useEffect(() => {
    loadRecentAchievements();
  }, []);

  const loadRecentAchievements = async () => {
    const { data } = await supabase
      .from('user_achievements')
      .select(`
        user_id,
        achievement_id,
        unlocked_at,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        )
      `)
      .order('unlocked_at', { ascending: false })
      .limit(5);

    if (data) {
      const formatted = data.map((item: any) => ({
        userId: item.user_id,
        username: item.profiles?.username || item.profiles?.full_name || 'Anonymous',
        avatarUrl: item.profiles?.avatar_url,
        achievementId: item.achievement_id,
        unlockedAt: item.unlocked_at
      }));
      setRecentAchievements(formatted);
    }
  };

  if (recentAchievements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Recent Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentAchievements.map((item, index) => {
          const achievement = ACHIEVEMENTS.find(a => a.id === item.achievementId);
          if (!achievement) return null;

          return (
            <div 
              key={`${item.userId}-${item.achievementId}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={item.avatarUrl} />
                <AvatarFallback>{item.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{item.username}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{achievement.icon}</span>
                  <span className="truncate">{achievement.title}</span>
                </div>
              </div>

              <div className="text-right">
                <Badge variant="outline" className="text-xs">
                  {achievement.rarity}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(item.unlockedAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
