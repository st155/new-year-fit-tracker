import { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Activity, Scale } from 'lucide-react';
import { useTodayMetrics } from '@/hooks/metrics/useTodayMetrics';
import { useUserWeeklySleep } from '@/hooks/useUserWeeklySleep';
import { useUserWeeklySteps } from '@/hooks/useUserWeeklySteps';
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
  
  const totalSlides = 3;
  
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);

  const sleepValues = weeklySleep.map(d => d.value);
  const stepsValues = weeklySteps.map(d => d.value);
  
  // Calculate sleep efficiency approximation
  const sleepEfficiency = metrics?.sleepHours ? Math.min(95, Math.round(85 + (metrics.sleepHours - 6) * 2)) : 0;

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
    
    // Body Slide
    <Slide key="body">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="h-4 w-4 text-warning" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Body</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl font-bold text-foreground">
            78.5
            <span className="text-lg font-normal text-muted-foreground ml-1">kg</span>
          </p>
          <p className="text-sm text-success mt-1">
            ↓ 0.3 kg this week
          </p>
        </div>
        <div className="w-24 h-12">
          <Sparklines data={[79.2, 79.0, 78.8, 78.7, 78.6, 78.5, 78.5]} width={100} height={40} margin={2}>
            <SparklinesLine color="hsl(38, 92%, 50%)" style={{ strokeWidth: 2 }} />
          </Sparklines>
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
