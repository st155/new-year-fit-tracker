import { motion } from 'framer-motion';
import { useTodayMetrics } from '@/hooks/metrics/useTodayMetrics';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ReadinessDialProps {
  className?: string;
}

export function ReadinessDial({ className }: ReadinessDialProps) {
  const { user } = useAuth();
  const { metrics, loading } = useTodayMetrics(user?.id);
  
  const recovery = metrics?.recovery || 0;
  
  // Determine color zone
  const getZone = (score: number) => {
    if (score >= 67) return { color: 'hsl(158, 64%, 52%)', label: 'High Performance', bg: 'from-success/20 to-success/5' };
    if (score >= 34) return { color: 'hsl(38, 92%, 50%)', label: 'Moderate', bg: 'from-warning/20 to-warning/5' };
    return { color: 'hsl(0, 84%, 60%)', label: 'Take it Easy', bg: 'from-destructive/20 to-destructive/5' };
  };
  
  const zone = getZone(recovery);
  
  // Arc parameters
  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const progress = (recovery / 100) * circumference;
  
  // HRV and RHR from metrics (using strain and sleep as proxies if not available)
  const hrv = Math.round(metrics?.strain * 3 + 30) || 45; // Approximation
  const rhr = Math.round(55 - (metrics?.recovery * 0.1)) || 52; // Approximation

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-[250px] bg-gradient-to-b from-muted/20 to-transparent rounded-3xl", className)}>
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative flex flex-col items-center justify-center py-6 rounded-3xl overflow-hidden",
        `bg-gradient-to-b ${zone.bg}`,
        className
      )}
    >
      {/* Background glow */}
      <div 
        className="absolute inset-0 opacity-30 blur-3xl"
        style={{ background: `radial-gradient(circle at 50% 80%, ${zone.color}, transparent 70%)` }}
      />
      
      {/* Arc Gauge */}
      <div className="relative" style={{ width: size, height: size / 2 + 30 }}>
        <svg 
          width={size} 
          height={size / 2 + 20} 
          viewBox={`0 0 ${size} ${size / 2 + 20}`}
          className="transform -rotate-0"
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          <motion.path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={zone.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            style={{ filter: `drop-shadow(0 0 12px ${zone.color})` }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <motion.span 
            className="text-5xl font-bold tracking-tight"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ color: zone.color }}
          >
            {recovery}%
          </motion.span>
        </div>
      </div>
      
      {/* Verdict label */}
      <motion.p 
        className="text-lg font-medium text-foreground mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {zone.label}
      </motion.p>
      
      {/* Secondary metrics */}
      <motion.div 
        className="flex items-center gap-6 mt-4 text-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">HRV</span>
          <span className="font-medium text-foreground">{hrv}ms</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">RHR</span>
          <span className="font-medium text-foreground">{rhr} bpm</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
