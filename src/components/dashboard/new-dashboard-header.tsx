import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

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

  return (
    <div className="px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <Avatar className="h-16 w-16 border-4 border-accent shadow-glow">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-accent/20 text-accent text-lg font-bold">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Hi, {userName}!
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="secondary" className="bg-muted/50">
              {getRoleText(userRole)}
            </Badge>
            {challengeTitle && (
              <span>🏆 {challengeTitle}</span>
            )}
          </div>
        </div>
      </div>

      {challengeTitle && (
        <div className="bg-card/50 rounded-lg p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-lg font-bold text-primary">
                {daysLeft} DAYS LEFT
              </span>
              <div className="text-sm text-muted-foreground mt-1">
                {Math.round(challengeProgress)}% COMPLETED
              </div>
            </div>
          </div>
          <Progress 
            value={challengeProgress} 
            className="h-2 bg-muted/30"
          />
        </div>
      )}
    </div>
  );
}