import { Home, BarChart3, Trophy, Activity, Zap, Link2, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomNavigationIconProps {
  type: 'home' | 'stats' | 'challenges' | 'activity' | 'integrations' | 'connections' | 'settings' | 'trainer';
  isActive?: boolean;
  className?: string;
}

const iconConfig = {
  home: { icon: Home, color: 'text-muted-foreground', activeColor: 'text-primary' },
  stats: { icon: BarChart3, color: 'text-muted-foreground', activeColor: 'text-primary' },
  challenges: { icon: Trophy, color: 'text-muted-foreground', activeColor: 'text-primary' },
  activity: { icon: Activity, color: 'text-muted-foreground', activeColor: 'text-primary' },
  integrations: { icon: Zap, color: 'text-muted-foreground', activeColor: 'text-primary' },
  connections: { icon: Link2, color: 'text-muted-foreground', activeColor: 'text-primary' },
  settings: { icon: Settings, color: 'text-muted-foreground', activeColor: 'text-primary' },
  trainer: { icon: Users, color: 'text-muted-foreground', activeColor: 'text-primary' },
};

export function CustomNavigationIcon({ type, isActive = false, className }: CustomNavigationIconProps) {
  const config = iconConfig[type];
  const IconComponent = config.icon;
  
  return (
    <div className={cn(
      "relative flex items-center justify-center transition-all duration-200",
      className
    )}>
      <IconComponent 
        className={cn(
          "h-6 w-6 transition-all duration-200",
          isActive ? config.activeColor : config.color,
          isActive && "scale-110 drop-shadow-[0_0_8px_hsl(var(--primary))]"
        )}
        strokeWidth={1.5}
      />
    </div>
  );
}