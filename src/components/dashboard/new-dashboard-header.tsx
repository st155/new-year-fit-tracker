import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface NewDashboardHeaderProps {
  userName: string;
  userRole: string;
  challengeTitle?: string;
  challengeProgress?: number;
  daysLeft?: number;
}

export function NewDashboardHeader({ 
  userName, 
  userRole, 
  challengeTitle, 
  challengeProgress = 0, 
  daysLeft = 0 
}: NewDashboardHeaderProps) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleText = (role: string) => {
    return role === 'trainer' ? 'Тренер' : 'Участник';
  };

  // If no challenge, don't render anything
  if (!challengeTitle) {
    return null;
  }

  return (
    <div className="px-4 py-3">
      {/* Compact challenge info - single line */}
      <div className="bg-card/50 rounded-lg px-4 py-2.5 border border-border/50">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">🏆 {challengeTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-primary whitespace-nowrap">
              {t('dashboard.daysLeft', { count: daysLeft })}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(challengeProgress)}%
            </span>
          </div>
        </div>
        <Progress 
          value={challengeProgress} 
          className="h-1.5 bg-muted/30"
        />
      </div>
    </div>
  );
}