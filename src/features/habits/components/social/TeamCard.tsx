import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Lock, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { HabitTeam } from '@/hooks/useHabitTeams';

interface TeamCardProps {
  team: HabitTeam;
  onJoin?: () => void;
  onView?: () => void;
  isJoined?: boolean;
}

export function TeamCard({ team, onJoin, onView, isJoined }: TeamCardProps) {
  const { t } = useTranslation('habits');

  return (
    <Card className="p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-base truncate">{team.name}</h3>
            {team.is_public ? (
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
          
          {team.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {team.description}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {team.member_count || 0} / {team.member_limit}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isJoined ? (
            <Button size="sm" variant="outline" onClick={onView}>
              {t('team.open')}
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={onJoin}
              disabled={(team.member_count || 0) >= team.member_limit}
            >
              {t('team.join')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
