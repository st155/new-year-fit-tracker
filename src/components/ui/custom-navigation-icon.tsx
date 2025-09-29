import { Home, BarChart3, Trophy, Activity, Zap, Link2, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomNavigationIconProps {
  type: 'home' | 'stats' | 'challenges' | 'activity' | 'integrations' | 'connections' | 'settings' | 'trainer';
  isActive?: boolean;
  className?: string;
}

const iconConfig = {
  home: { icon: Home, color: 'text-orange-400', activeColor: 'text-orange-500' },
  stats: { icon: BarChart3, color: 'text-emerald-400', activeColor: 'text-emerald-500' },
  challenges: { icon: Trophy, color: 'text-cyan-400', activeColor: 'text-cyan-500' },
  activity: { icon: Activity, color: 'text-amber-400', activeColor: 'text-amber-500' },
  integrations: { icon: Zap, color: 'text-blue-400', activeColor: 'text-blue-500' },
  connections: { icon: Link2, color: 'text-purple-400', activeColor: 'text-purple-500' },
  settings: { icon: Settings, color: 'text-gray-400', activeColor: 'text-gray-500' },
  trainer: { icon: Users, color: 'text-rose-400', activeColor: 'text-rose-500' },
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
          "h-6 w-6 transition-colors duration-200",
          isActive ? config.activeColor : config.color,
          isActive && "scale-110"
        )}
        strokeWidth={1.5}
      />
      {isActive && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-current rounded-full opacity-60" />
      )}
    </div>
  );
}