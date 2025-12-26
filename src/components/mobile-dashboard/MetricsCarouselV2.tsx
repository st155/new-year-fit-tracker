import { motion } from 'framer-motion';
import { Moon, Activity, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useTodayMetrics } from '@/hooks/metrics/useTodayMetrics';
import { useUserWeeklySleep } from '@/hooks/useUserWeeklySleep';
import { useAggregatedBodyMetrics } from '@/hooks/useAggregatedBodyMetrics';
import { useAuth } from '@/hooks/useAuth';
import { ActivityRings } from './ActivityRings';
import { cn } from '@/lib/utils';
import { Sparklines, SparklinesLine } from 'react-sparklines';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

function MetricCard({ children, className }: CardProps) {
  return (
    <div className={cn(
      "p-3 rounded-xl bg-card/50 border border-border/50",
      className
    )}>
      {children}
    </div>
  );
}

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export function MetricsCarouselV2() {
  const { user } = useAuth();
  const { metrics } = useTodayMetrics(user?.id);
  const { data: weeklySleep = [] } = useUserWeeklySleep(user?.id);
  const { weight, bodyFat } = useAggregatedBodyMetrics(user?.id);

  const sleepValues = weeklySleep.map(d => d.value);
  
  // Calculate sleep efficiency approximation
  const sleepEfficiency = metrics?.sleepHours ? Math.min(95, Math.round(85 + (metrics.sleepHours - 6) * 2)) : 0;

  // Weight data with trend
  const currentWeight = weight?.value || 0;
  const weightTrend = weight?.trend || 0;
  const weightSparkline = weight?.sparklineData?.map(d => d.value) || [];
  
  // Determine trend color and icon
  const getTrendDisplay = () => {
    if (!weightTrend || Math.abs(weightTrend) < 0.1) {
      return { icon: <Minus className="h-3 w-3" />, color: 'text-muted-foreground', text: 'stable' };
    }
    if (weightTrend < 0) {
      return { icon: <TrendingDown className="h-3 w-3" />, color: 'text-success', text: `${weightTrend.toFixed(1)} kg` };
    }
    return { icon: <TrendingUp className="h-3 w-3" />, color: 'text-warning', text: `+${weightTrend.toFixed(1)} kg` };
  };
  
  const trendDisplay = getTrendDisplay();

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } }
      }}
      className="px-4 space-y-3"
    >
      {/* Sleep Card */}
      <motion.div variants={fadeInUp}>
        <MetricCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sleep</span>
            </div>
            <div className="w-20 h-8">
              {sleepValues.length > 0 && (
                <Sparklines data={sleepValues} width={80} height={32} margin={2}>
                  <SparklinesLine color="hsl(180, 100%, 50%)" style={{ strokeWidth: 2 }} />
                </Sparklines>
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <p className="text-3xl font-bold text-foreground">
              {metrics?.sleepHours?.toFixed(1) || '0'}
              <span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Efficiency <span className="text-foreground font-medium">{sleepEfficiency}%</span>
            </p>
          </div>
        </MetricCard>
      </motion.div>
      
      {/* Activity Card */}
      <motion.div variants={fadeInUp}>
        <MetricCard>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-success" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Activity</span>
          </div>
          <ActivityRings 
            steps={metrics?.steps || 0}
            strain={metrics?.strain || 0}
            calories={Math.round((metrics?.steps || 0) * 0.04)}
          />
        </MetricCard>
      </motion.div>
      
      {/* Body Card */}
      <motion.div variants={fadeInUp}>
        <MetricCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Body</span>
            </div>
            <div className="w-20 h-8">
              {weightSparkline.length > 0 ? (
                <Sparklines data={weightSparkline} width={80} height={32} margin={2}>
                  <SparklinesLine color="hsl(38, 92%, 50%)" style={{ strokeWidth: 2 }} />
                </Sparklines>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  No trend
                </div>
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <p className="text-3xl font-bold text-foreground">
              {currentWeight ? currentWeight.toFixed(1) : '--'}
              <span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
            </p>
            {currentWeight > 0 && (
              <div className={cn("flex items-center gap-1 text-sm", trendDisplay.color)}>
                {trendDisplay.icon}
                <span>{trendDisplay.text}</span>
              </div>
            )}
            {bodyFat?.value && (
              <p className="text-xs text-muted-foreground">
                Fat: <span className="text-foreground">{bodyFat.value.toFixed(1)}%</span>
              </p>
            )}
          </div>
        </MetricCard>
      </motion.div>
    </motion.div>
  );
}
