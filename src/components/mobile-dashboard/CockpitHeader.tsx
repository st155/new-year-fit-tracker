import { Bell, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfileQuery } from '@/hooks/core/useProfileQuery';
import { Link } from 'react-router-dom';

export function CockpitHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfileQuery(user?.id);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const avatarUrl = profile?.avatar_url;
  const initials = firstName.charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between px-4 py-3 h-14">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={firstName} />}
          <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">
          {getGreeting()}, <span className="text-foreground font-medium">{firstName}</span>
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" asChild>
          <Link to="/settings">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
