import { useState, useEffect } from "react";
import { AchievementCard } from "./AchievementCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Award } from "lucide-react";
import { ACHIEVEMENTS, type Achievement, type AchievementCategory } from "@/lib/achievements";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function AchievementsGallery() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');

  useEffect(() => {
    if (user) {
      loadAchievements();
    }
  }, [user]);

  const loadAchievements = async () => {
    if (!user) return;

    try {
      // Load unlocked achievements from DB
      const { data: unlockedData, error } = await supabase
        .from('user_achievements' as any)
        .select('achievement_id, unlocked_at, progress')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading achievements:', error);
        return;
      }

      if (unlockedData && Array.isArray(unlockedData)) {
        const updated = ACHIEVEMENTS.map(achievement => {
          const unlocked = (unlockedData as any[]).find((u: any) => u.achievement_id === achievement.id);
          if (unlocked) {
            return {
              ...achievement,
              unlocked: true,
              unlockedAt: unlocked.unlocked_at,
              progress: unlocked.progress || achievement.requirement
            };
          }
          return achievement;
        });
        setAchievements(updated);
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  const categories: Array<{ value: AchievementCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'streak', label: 'Streaks' },
    { value: 'milestone', label: 'Milestones' },
    { value: 'workout', label: 'Workouts' },
    { value: 'elite', label: 'Elite' }
  ];

  const filteredAchievements = activeCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === activeCategory);

  // Sort: unlocked first, then by rarity
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {unlockedCount} / {achievements.length} unlocked
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as AchievementCategory | 'all')}>
            <TabsList className="grid grid-cols-5 w-full mb-6">
              {categories.map(cat => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedAchievements.map(achievement => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
