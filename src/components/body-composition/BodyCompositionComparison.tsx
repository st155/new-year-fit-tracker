import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface BodyCompositionComparisonProps {
  userId?: string;
}

export function BodyCompositionComparison({ userId }: BodyCompositionComparisonProps) {
  const { t } = useTranslation('bodyComposition');
  const { data: comparisons, isLoading } = useQuery({
    queryKey: ['body-composition-comparison', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get user's challenges
      const { data: participations } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', userId);

      if (!participations?.length) return [];

      const challengeIds = participations.map(p => p.challenge_id);

      // Get all participants in these challenges
      const { data: allParticipants } = await supabase
        .from('challenge_participants')
        .select('user_id')
        .in('challenge_id', challengeIds);

      if (!allParticipants?.length) return [];

      const userIds = [...new Set(allParticipants.map(p => p.user_id))];

      // Get latest body composition for each user
      const { data: compositions } = await supabase
        .from('body_composition')
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .in('user_id', userIds)
        .order('measurement_date', { ascending: false });

      if (!compositions) return [];

      // Get only the latest measurement for each user
      const latestByUser = compositions.reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id] || new Date(curr.measurement_date) > new Date(acc[curr.user_id].measurement_date)) {
          acc[curr.user_id] = curr;
        }
        return acc;
      }, {});

      return Object.values(latestByUser).sort((a: any, b: any) => a.body_fat_percentage - b.body_fat_percentage);
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">{t('loading', 'Loading...')}</p>
        </CardContent>
      </Card>
    );
  }

  if (!comparisons?.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            {t('noComparison', 'No comparison data available. Join a challenge to compare with others!')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('leaderboard', 'Challenge Leaderboard')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('rankedByFat', 'Ranked by body fat percentage')}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {comparisons.map((comp: any, index: number) => {
            const profile = comp.profiles;
            const isCurrentUser = comp.user_id === userId;

            return (
              <div
                key={comp.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isCurrentUser ? 'bg-primary/5 border-primary' : 'bg-card'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-muted-foreground w-8">
                    #{index + 1}
                  </div>
                  <Avatar>
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback>
                      {profile?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {profile?.full_name || profile?.username || t('user', 'User')}
                      {isCurrentUser && <Badge variant="secondary">{t('you', 'You')}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(comp.measurement_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-2xl font-bold">
                    {comp.body_fat_percentage}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {comp.weight} {t('common:units.kg', 'kg')} • {comp.muscle_mass} {t('common:units.kg', 'kg')} {t('muscle', 'muscle')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
