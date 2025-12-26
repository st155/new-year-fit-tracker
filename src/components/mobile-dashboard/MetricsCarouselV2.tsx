import { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Activity, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useTodayMetrics } from '@/hooks/metrics/useTodayMetrics';
import { useUserWeeklySleep } from '@/hooks/useUserWeeklySleep';
import { useUserWeeklySteps } from '@/hooks/useUserWeeklySteps';
import { useAggregatedBodyMetrics } from '@/hooks/useAggregatedBodyMetrics';
import { useAuth } from '@/hooks/useAuth';
import { ActivityRings } from './ActivityRings';
import { cn } from '@/lib/utils';
import { Sparklines, SparklinesLine } from 'react-sparklines';

interface SlideProps {
  children: React.ReactNode;
  className?: string;
}

function Slide({ children, className }: SlideProps) {
  return (
    <div className={cn(
      "w-full flex-shrink-0 p-4 rounded-2xl bg-card/50 border border-border/50",
      className
    )}>
      {children}
    </div>
  );
}

export function MetricsCarouselV2() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { user } = useAuth();
  const { metrics } = useTodayMetrics(user?.id);
  const { data: weeklySleep = [] } = useUserWeeklySleep(user?.id);
  const { data: weeklySteps = [] } = useUserWeeklySteps(user?.id);
  const { weight, bodyFat } = useAggregatedBodyMetrics();
  
  const totalSlides = 3;

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

  const slides = [
    // Sleep Slide
    <Slide key="sleep">
      <div className="flex items-center gap-2 mb-3">
        <Moon className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sleep</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl font-bold text-foreground">
            {metrics?.sleepHours?.toFixed(1) || '0'}
            <span className="text-lg font-normal text-muted-foreground ml-1">hrs</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Efficiency <span className="text-foreground font-medium">{sleepEfficiency}%</span>
          </p>
        </div>
        <div className="w-24 h-12">
          {sleepValues.length > 0 && (
            <Sparklines data={sleepValues} width={100} height={40} margin={2}>
              <SparklinesLine color="hsl(180, 100%, 50%)" style={{ strokeWidth: 2 }} />
            </Sparklines>
          )}
        </div>
      </div>
    </Slide>,
    
    // Activity Slide
    <Slide key="activity">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-success" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Activity</span>
      </div>
      <ActivityRings 
        steps={metrics?.steps || 0}
        strain={metrics?.strain || 0}
        calories={Math.round((metrics?.steps || 0) * 0.04)}
      />
    </Slide>,
    
    // Body Slide with real data and trend
    <Slide key="body">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="h-4 w-4 text-warning" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Body</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl font-bold text-foreground">
            {currentWeight ? currentWeight.toFixed(1) : '--'}
            <span className="text-lg font-normal text-muted-foreground ml-1">kg</span>
          </p>
          {currentWeight > 0 && (
            <div className={cn("flex items-center gap-1 text-sm mt-1", trendDisplay.color)}>
              {trendDisplay.icon}
              <span>{trendDisplay.text}</span>
              <span className="text-muted-foreground ml-1">this week</span>
            </div>
          )}
          {bodyFat?.value && (
            <p className="text-xs text-muted-foreground mt-1">
              Body fat: <span className="text-foreground">{bodyFat.value.toFixed(1)}%</span>
            </p>
          )}
        </div>
        <div className="w-24 h-12">
          {weightSparkline.length > 0 ? (
            <Sparklines data={weightSparkline} width={100} height={40} margin={2}>
              <SparklinesLine color="hsl(38, 92%, 50%)" style={{ strokeWidth: 2 }} />
            </Sparklines>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              No trend
            </div>
          )}
        </div>
      </div>
    </Slide>,
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className="relative px-4"
    >
      {/* Carousel container */}
      <div className="overflow-hidden rounded-2xl">
        <motion.div 
          className="flex"
          animate={{ x: `-${currentSlide * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {slides.map((slide, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {slide}
            </div>
          ))}
        </motion.div>
      </div>
      
      {/* Navigation dots */}
      <div className="flex justify-center gap-2 mt-3">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-200",
              index === currentSlide 
                ? "bg-primary w-4" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>
      
      {/* Swipe hint on first view */}
      <p className="text-center text-xs text-muted-foreground/50 mt-2">
        Swipe to see more
      </p>
    </motion.div>
  );
}
