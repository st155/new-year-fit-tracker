import { Home, TrendingUp, Trophy, Activity, Zap, Layers, Settings, Users, Dumbbell, Rss, Target, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomNavigationIconProps {
  type: 'home' | 'stats' | 'challenges' | 'activity' | 'integrations' | 'connections' | 'settings' | 'trainer' | 'data' | 'feed' | 'goals' | 'body';
  isActive?: boolean;
  className?: string;
}

const iconConfig = {
  home: { 
    icon: Home, 
    gradient: 'from-blue-400 to-cyan-500',
    glow: 'drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(56,189,248,0.8)]'
  },
  stats: { 
    icon: TrendingUp, 
    gradient: 'from-green-400 to-emerald-500',
    glow: 'drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]'
  },
  challenges: { 
    icon: Trophy, 
    gradient: 'from-yellow-400 to-orange-500',
    glow: 'drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]'
  },
  activity: { 
    icon: Rss, 
    gradient: 'from-orange-400 to-red-500',
    glow: 'drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(251,146,60,0.8)]'
  },
  feed: { 
    icon: Rss, 
    gradient: 'from-orange-400 to-red-500',
    glow: 'drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(251,146,60,0.8)]'
  },
  data: { 
    icon: Dumbbell, 
    gradient: 'from-purple-400 to-violet-500',
    glow: 'drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]'
  },
  integrations: { 
    icon: Layers, 
    gradient: 'from-pink-400 to-rose-500',
    glow: 'drop-shadow-[0_0_12px_rgba(244,114,182,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(244,114,182,0.8)]'
  },
  connections: { 
    icon: Zap, 
    gradient: 'from-indigo-400 to-purple-500',
    glow: 'drop-shadow-[0_0_12px_rgba(129,140,248,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(129,140,248,0.8)]'
  },
  settings: { 
    icon: Settings, 
    gradient: 'from-gray-400 to-slate-500',
    glow: 'drop-shadow-[0_0_12px_rgba(148,163,184,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(148,163,184,0.8)]'
  },
  trainer: { 
    icon: Users, 
    gradient: 'from-teal-400 to-cyan-500',
    glow: 'drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(45,212,191,0.8)]'
  },
  goals: { 
    icon: Target, 
    gradient: 'from-red-400 to-pink-500',
    glow: 'drop-shadow-[0_0_12px_rgba(248,113,113,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(248,113,113,0.8)]'
  },
  body: { 
    icon: Scale, 
    gradient: 'from-fuchsia-400 to-violet-500',
    glow: 'drop-shadow-[0_0_12px_rgba(232,121,249,0.6)]',
    activeGlow: 'drop-shadow-[0_0_20px_rgba(232,121,249,0.8)]'
  },
};

export function CustomNavigationIcon({ type, isActive = false, className }: CustomNavigationIconProps) {
  const config = iconConfig[type];
  const IconComponent = config.icon;
  
  // Map gradient classes to actual color values for styling
  const gradientColors: Record<string, { from: string; to: string }> = {
    'from-blue-400 to-cyan-500': { from: '#60a5fa', to: '#06b6d4' },
    'from-green-400 to-emerald-500': { from: '#4ade80', to: '#10b981' },
    'from-yellow-400 to-orange-500': { from: '#facc15', to: '#f97316' },
    'from-orange-400 to-red-500': { from: '#fb923c', to: '#ef4444' },
    'from-purple-400 to-violet-500': { from: '#c084fc', to: '#8b5cf6' },
    'from-pink-400 to-rose-500': { from: '#f472b6', to: '#f43f5e' },
    'from-indigo-400 to-purple-500': { from: '#818cf8', to: '#a855f7' },
    'from-gray-400 to-slate-500': { from: '#94a3b8', to: '#64748b' },
    'from-teal-400 to-cyan-500': { from: '#2dd4bf', to: '#06b6d4' },
    'from-red-400 to-pink-500': { from: '#f87171', to: '#ec4899' },
    'from-fuchsia-400 to-violet-500': { from: '#e879f9', to: '#8b5cf6' },
  };
  
  const colors = gradientColors[config.gradient];
  const iconColor = isActive ? colors.from : colors.to;
  
  return (
    <div className={cn(
      "relative flex items-center justify-center transition-all duration-300",
      className
    )}>
      <div className={cn(
        "relative p-2 rounded-xl transition-all duration-300",
        isActive && "scale-110"
      )}>
        {/* Gradient background when active */}
        {isActive && (
          <div className={cn(
            "absolute inset-0 rounded-xl bg-gradient-to-br opacity-20 blur-sm",
            config.gradient
          )} />
        )}
        
        {/* Icon */}
        <IconComponent 
          className={cn(
            "h-6 w-6 transition-all duration-300 relative z-10",
            !isActive && "opacity-60"
          )}
          strokeWidth={isActive ? 2.5 : 1.5}
          style={{
            color: iconColor,
            filter: isActive 
              ? `drop-shadow(0 0 8px ${iconColor}80) drop-shadow(0 0 12px ${iconColor}60)` 
              : `drop-shadow(0 0 4px ${iconColor}40)`
          }}
        />
      </div>
    </div>
  );
}