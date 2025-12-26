import { Bell, Settings, Plug } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfileQuery } from '@/hooks/core/useProfileQuery';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function CockpitHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfileQuery(user?.id);
  
  // Fetch active integrations count
  const { data: integrationData } = useQuery({
    queryKey: ['header-integrations-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return { count: 0, needsSync: false };
      
      const { data } = await supabase
        .from('terra_tokens')
        .select('provider, is_active, last_sync_date')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!data || data.length === 0) return { count: 0, needsSync: false };

      const now = new Date();
      const needsSync = data.some(t => {
        if (!t.last_sync_date) return true;
        const hoursSinceSync = (now.getTime() - new Date(t.last_sync_date).getTime()) / (1000 * 60 * 60);
        return hoursSinceSync > 24;
      });

      return { count: data.length, needsSync };
    },
    enabled: !!user?.id,
    staleTime: 60000
  });
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const avatarUrl = profile?.avatar_url;
  const initials = firstName.charAt(0).toUpperCase();

  const integrationCount = integrationData?.count || 0;
  const needsSync = integrationData?.needsSync || false;

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
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 text-muted-foreground hover:text-foreground relative" 
          asChild
          aria-label="Integrations"
        >
          <Link to="/fitness-data?tab=connections">
            <Plug className="h-5 w-5" />
            {integrationCount > 0 ? (
              <span className={cn(
                "absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-medium flex items-center justify-center text-white",
                needsSync ? "bg-amber-500" : "bg-emerald-500"
              )}>
                {integrationCount}
              </span>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            )}
          </Link>
        </Button>
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
