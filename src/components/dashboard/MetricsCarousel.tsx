import { useState } from 'react';
import { Heart, Scale, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { HighlightCard } from './HighlightCard';
import { MetricCard } from '@/components/metrics';
import { createMetricConfig, MetricKey } from '@/lib/metric-config';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MappedMetric {
  value: string | number | null;
  change?: string | number;
  source?: string;
  sources?: string[];
}

interface MetricsCarouselProps {
  mappedMetrics: Record<string, MappedMetric>;
  selectedMetrics: MetricKey[];
  onMetricClick?: (route: string) => void;
}

// Group metrics by category for carousel slides
const SLIDE_GROUPS = {
  recovery: {
    title: 'Recovery Focus',
    icon: Heart,
    variant: 'recovery' as const,
    metrics: ['recovery', 'max_hr', 'vo2max', 'hrv'],
  },
  body: {
    title: 'Body Status',
    icon: Scale,
    variant: 'body' as const,
    metrics: ['weight', 'body_fat', 'muscle_mass'],
  },
  activity: {
    title: 'Activity',
    icon: Activity,
    variant: 'activity' as const,
    metrics: ['steps', 'strain', 'active_calories'],
  },
};

export function MetricsCarousel({ mappedMetrics, selectedMetrics, onMetricClick }: MetricsCarouselProps) {
  const { t } = useTranslation('dashboard');
  const metricConfig = createMetricConfig(t);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Build slides with actual data
  const slides = Object.entries(SLIDE_GROUPS).map(([key, group]) => {
    const metricsForSlide = group.metrics
      .filter(metricKey => {
        const data = mappedMetrics[metricKey];
        return data && data.value !== null && data.value !== undefined;
      })
      .map(metricKey => {
        const config = metricConfig[metricKey as MetricKey];
        const data = mappedMetrics[metricKey];
        return {
          label: config?.title || metricKey,
          value: data?.value,
          unit: config?.unit,
        };
      });

    return {
      key,
      ...group,
      metricsData: metricsForSlide,
    };
  }).filter(slide => slide.metricsData.length > 0);

  // Get all metrics for expanded view
  const allMetricsWithData = selectedMetrics.filter(key => {
    const data = mappedMetrics[key];
    return data && data.value !== null && data.value !== undefined;
  });

  return (
    <div className="space-y-4">
      {/* Carousel */}
      {slides.length > 0 ? (
        <>
          <Carousel
            setApi={setApi}
            opts={{
              align: 'center',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {slides.map((slide) => (
                <CarouselItem key={slide.key} className="pl-2 basis-[90%]">
                  <HighlightCard
                    title={slide.title}
                    icon={slide.icon}
                    variant={slide.variant}
                    metrics={slide.metricsData}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 py-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === current
                    ? 'bg-primary w-6'
                    : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="h-[70vh] flex items-center justify-center">
          <p className="text-muted-foreground">Нет данных для отображения</p>
        </div>
      )}

      {/* Show all metrics button */}
      {allMetricsWithData.length > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAllMetrics(!showAllMetrics)}
        >
          {showAllMetrics ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Скрыть детали
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Показать все метрики ({allMetricsWithData.length})
            </>
          )}
        </Button>
      )}

      {/* Expanded metrics list */}
      <AnimatePresence>
        {showAllMetrics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3 pt-4">
              {allMetricsWithData.map((metricKey) => {
                const config = metricConfig[metricKey];
                const data = mappedMetrics[metricKey];
                
                if (!config || !data) return null;
                
                  const valueStr = data.value !== null && data.value !== undefined 
                    ? String(data.value) 
                    : '-';
                  const changeStr = data.change !== undefined 
                    ? String(data.change) 
                    : undefined;
                  
                  return (
                    <MetricCard
                      key={metricKey}
                      title={config.title}
                      value={valueStr}
                      unit={config.unit}
                      change={changeStr}
                      source={data.source}
                      sources={data.sources}
                      color={config.color}
                      onClick={() => config.route && onMetricClick?.(config.route)}
                    />
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
