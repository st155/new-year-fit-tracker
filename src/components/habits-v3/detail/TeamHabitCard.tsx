import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TeamHabitCardProps {
  team: {
    id: string;
    name: string;
    description: string | null;
    member_count: number;
    is_member: boolean;
    avg_streak: number;
  };
}

export function TeamHabitCard({ team }: TeamHabitCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1 truncate">{team.name}</h4>
          {team.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {team.description}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-xs">
              <Users className="h-3 w-3" />
              {team.member_count}
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Flame className="h-3 w-3 text-orange-500" />
              ~{team.avg_streak} дней
            </Badge>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/habits-v3?tab=social')}
        >
          Открыть
        </Button>
      </div>
    </Card>
  );
}
