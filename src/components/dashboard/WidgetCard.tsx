import { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { Card as TremorCard } from '@tremor/react';
import { Area, AreaChart, ResponsiveContainer, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Activity, Footprints, Zap, Scale, Heart, Flame, Moon, Droplet, AlertCircle, RefreshCw, Link as LinkIcon, Info } from 'lucide-react';
import { widgetKeys, type Widget } from '@/hooks/useWidgetsQuery';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { DataQualityBadge, ConflictWarningBadge } from '@/components/data-quality';
import { getConfidenceColor } from '@/lib/data-quality';
import type { MultiSourceWidgetData } from '@/hooks/metrics/useMultiSourceWidgetsData';
import type { WidgetHistoryData } from '@/hooks/metrics/useWidgetHistory';
import { logger } from '@/lib/logger';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { HabitLevelWidget } from './widgets/HabitLevelWidget';
import { HabitStreakWidget } from './widgets/HabitStreakWidget';
import { HabitSocialWidget } from './widgets/HabitSocialWidget';

interface WidgetCardProps {
  widget: Widget;
  data?: {
    value: number;
    unit: string;
    measurement_date: string;
    source: string;
    trend?: number;
    confidence?: number;
    factors?: {
      sourceReliability: number;
      dataFreshness: number;
      measurementFrequency: number;
      crossValidation: number;
    };
  };
  multiSourceData?: MultiSourceWidgetData;
  sparklineData?: WidgetHistoryData[];
  inBodySparklineData?: { date: string; value: number }[];
}

// Custom tooltip component for sparkline charts - supports dual data sources
function WidgetChartTooltip({ active, payload, metricName, unit }: any) {
  if (active && payload && payload.length) {
    const date = payload[0]?.payload?.date;
    const withingsValue = payload.find((p: any) => p.dataKey === 'withingsValue')?.value;
    const inbodyValue = payload.find((p: any) => p.dataKey === 'inbodyValue')?.value;
    
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{date}</p>
        {withingsValue != null && (
          <p className="text-sm font-semibold" style={{ color: '#ec4899' }}>
            Withings: {formatValue(withingsValue, metricName, unit)} {unit}
          </p>
        )}
        {inbodyValue != null && (
          <p className="text-sm font-semibold" style={{ color: '#10b981' }}>
            InBody: {formatValue(inbodyValue, metricName, unit)} {unit}
          </p>
        )}
        {withingsValue == null && inbodyValue == null && payload[0]?.value != null && (
          <p className="text-sm font-semibold text-foreground">
            {formatValue(payload[0].value, metricName, unit)} {unit}
          </p>
        )}
      </div>
    );
  }
  return null;
}

const getMetricIcon = (metricName: string) => {
  const name = metricName.toLowerCase();
  if (name.includes('step')) return Footprints;
  if (name.includes('strain')) return Flame;
  if (name.includes('recovery')) return Heart;
  if (name.includes('weight')) return Scale;
  if (name.includes('sleep')) return Moon;
  if (name.includes('hr') || name.includes('heart')) return Heart;
  if (name.includes('hrv')) return Heart;
  if (name.includes('calorie')) return Droplet;
  if (name.includes('vo2')) return Zap;
  return Activity;
};

const getMetricColor = (metricName: string) => {
  const name = metricName.toLowerCase();
  if (name.includes('step')) return '#3b82f6'; // blue
  if (name.includes('strain') || name.includes('workout')) return '#f97316'; // orange
  if (name.includes('recovery')) return '#10b981'; // green
  if (name.includes('weight')) return '#8b5cf6'; // purple
  if (name.includes('sleep')) return '#6366f1'; // indigo
  if (name.includes('hr') || name.includes('heart')) return '#ef4444'; // red
  if (name.includes('hrv')) return '#06b6d4'; // cyan
  if (name.includes('calorie')) return '#f59e0b'; // amber
  if (name.includes('vo2')) return '#14b8a6'; // teal
  if (name.includes('fat')) return '#ec4899'; // pink
  return '#3b82f6'; // default blue
};

// Метрики где снижение = улучшение
const isLowerBetter = (metricName: string) => {
  const name = metricName.toLowerCase();
  return name.includes('fat') || 
         name.includes('weight') || 
         name.includes('resting hr') ||
         name.includes('stress');
};

const getTrendColor = (trend: number, metricName: string) => {
  const lowerIsBetter = isLowerBetter(metricName);
  const isImproving = lowerIsBetter ? trend < 0 : trend > 0;
  
  if (Math.abs(trend) < 0.5) return '#6b7280'; // gray для нейтрального
  return isImproving ? '#10b981' : '#ef4444'; // green для улучшения, red для ухудшения
};

const formatValue = (value: number | string, metricName: string, unit: string): string => {
  if (typeof value === 'string') return value;
  
  if (metricName.toLowerCase().includes('sleep') && metricName.toLowerCase().includes('duration')) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  
  if (metricName === 'Steps') {
    return Math.round(value).toLocaleString();
  }
  
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
};

const getSourceDisplayName = (source: string): string => {
  const nameMap: Record<string, string> = {
    whoop: 'Whoop',
    ultrahuman: 'Ultrahuman',
    garmin: 'Garmin',
    withings: 'Withings',
  };
  return nameMap[source.toLowerCase()] || source;
};

// Определение цвета рамки по качеству значения метрики
const getMetricQualityColor = (metricName: string, value: number): string | null => {
  const name = metricName.toLowerCase();
  console.log('[DEBUG getMetricQualityColor]', metricName, '→', name, '| value:', value);
  
  // Recovery Score: <33 = красный, 33-66 = желтый, >66 = зеленый
  if (name.includes('recovery')) {
    if (value < 33) return '#ef4444';
    if (value < 67) return '#eab308';
    return '#10b981';
  }
  
  // Sleep Efficiency: <75 = красный, 75-85 = желтый, ≥85 = зеленый
  if (name.includes('sleep') && name.includes('efficiency')) {
    if (value < 75) return '#ef4444';
    if (value < 85) return '#eab308';
    return '#10b981';
  }
  
  // Sleep Duration: <6ч = красный, 6-7ч = желтый, ≥7ч = зеленый
  if (name.includes('sleep') && name.includes('duration')) {
    if (value < 6) return '#ef4444';
    if (value < 7) return '#eab308';
    return '#10b981';
  }
  
  // Resting HR: <35 или >100 = красный, 40-85 = норма
  if ((name.includes('resting') && name.includes('heart')) || name.includes('resting hr') || name.includes('пульс в покое')) {
    if (value < 35 || value > 100) return '#ef4444';
    if (value < 45 || value > 85) return '#eab308';
    return '#10b981';
  }
  
  // Steps: <5000 = красный, <8000 = желтый, >=10000 = зеленый
  if (name.includes('step') || name.includes('шаг')) {
    if (value < 5000) return '#ef4444';
    if (value < 8000) return '#eab308';
    if (value >= 10000) return '#10b981';
    return null;
  }
  
  // Body Fat Percentage: зависит от пола, упрощенно 15-28% = норма
  if ((name.includes('body') && name.includes('fat')) || name.includes('процент жира') || name.includes('жир')) {
    if (value < 10 || value > 35) return '#ef4444';
    if (value < 15 || value > 28) return '#eab308';
    return '#10b981';
  }
  
  // HRV: >60 = зеленый, 40-60 = желтый, <40 = красный
  if (name.includes('hrv')) {
    if (value < 40) return '#ef4444';
    if (value < 60) return '#eab308';
    return '#10b981';
  }
  
  // Day Strain: <10 = желтый (мало), 10-18 = зеленый (норма), >18 = желтый (много)
  if ((name.includes('strain') && !name.includes('workout')) || name.includes('нагрузка')) {
    if (value < 10 || value > 18) return '#eab308';
    return '#10b981';
  }
  
  // Active Calories: <200 = красный, 200-499 = желтый, >=500 = зеленый
  if ((name.includes('active') && name.includes('calor')) || name.includes('активные калории')) {
    if (value < 200) return '#ef4444';
    if (value < 500) return '#eab308';
    return '#10b981';
  }
  
  // Max Heart Rate: <120 = желтый (низкая интенсивность), >180 = красный
  if ((name.includes('max') && name.includes('heart')) || name.includes('max hr') || name.includes('макс')) {
    if (value < 120) return '#eab308';
    if (value > 180) return '#ef4444';
    return null; // Норма
  }
  
  return null;
};

// Получение текстового индикатора качества метрики
const getQualityLabel = (metricName: string, value: number): { icon: string; text: string; color: string } | null => {
  const name = metricName.toLowerCase();
  console.log('[DEBUG getQualityLabel]', metricName, '→', name, '| value:', value);
  
  if (name.includes('recovery')) {
    if (value < 33) return { icon: '🔴', text: 'Низкое восстановление', color: '#ef4444' };
    if (value < 67) return { icon: '⚠️', text: 'Среднее', color: '#eab308' };
    return { icon: '✅', text: 'Отличное', color: '#10b981' };
  }
  
  if (name.includes('sleep') && name.includes('efficiency')) {
    if (value < 75) return { icon: '😴', text: 'Плохой сон', color: '#ef4444' };
    if (value < 85) return { icon: '😐', text: 'Норма', color: '#eab308' };
    if (value < 95) return { icon: '😊', text: 'Хороший сон', color: '#10b981' };
    return { icon: '🌟', text: 'Отличный сон', color: '#10b981' };
  }
  
  if (name.includes('sleep') && name.includes('duration')) {
    if (value < 6) return { icon: '😴', text: 'Мало сна', color: '#ef4444' };
    if (value < 7) return { icon: '😐', text: 'Недостаточно', color: '#eab308' };
    if (value < 8) return { icon: '😊', text: 'Хорошо', color: '#10b981' };
    return { icon: '🌟', text: 'Отлично', color: '#10b981' };
  }
  
  if (name.includes('hrv')) {
    if (value < 40) return { icon: '🔴', text: 'Низкое', color: '#ef4444' };
    if (value < 60) return { icon: '⚠️', text: 'Среднее', color: '#eab308' };
    return { icon: '✅', text: 'Отличное', color: '#10b981' };
  }
  
  if (name.includes('strain') && !name.includes('workout')) {
    if (value < 10) return { icon: '⚠️', text: 'Низкая нагрузка', color: '#eab308' };
    if (value <= 18) return { icon: '✅', text: 'Норма', color: '#10b981' };
    return { icon: '⚠️', text: 'Высокая нагрузка', color: '#eab308' };
  }
  
  // Steps
  if (name.includes('step')) {
    if (value < 5000) return { icon: '🔴', text: 'Очень мало', color: '#ef4444' };
    if (value < 8000) return { icon: '⚠️', text: 'Недостаточно', color: '#eab308' };
    if (value >= 10000) return { icon: '✅', text: 'Отлично', color: '#10b981' };
    return { icon: '😊', text: 'Хорошо', color: '#10b981' };
  }
  
  // Body Fat Percentage
  if (name.includes('body') && name.includes('fat')) {
    if (value < 10) return { icon: '⚠️', text: 'Слишком низкий', color: '#ef4444' };
    if (value < 15) return { icon: '📊', text: 'Атлетический', color: '#10b981' };
    if (value < 20) return { icon: '✅', text: 'Отличный', color: '#10b981' };
    if (value < 28) return { icon: '😊', text: 'Норма', color: '#10b981' };
    if (value < 35) return { icon: '⚠️', text: 'Повышенный', color: '#eab308' };
    return { icon: '🔴', text: 'Высокий', color: '#ef4444' };
  }
  
  // Active Calories
  if (name.includes('active') && name.includes('calories')) {
    if (value < 200) return { icon: '🔴', text: 'Мало активности', color: '#ef4444' };
    if (value < 500) return { icon: '⚠️', text: 'Средняя активность', color: '#eab308' };
    return { icon: '✅', text: 'Отличная активность', color: '#10b981' };
  }
  
  // Max Heart Rate
  if (name.includes('max') && name.includes('heart')) {
    if (value < 120) return { icon: '⚠️', text: 'Низкая интенсивность', color: '#eab308' };
    if (value > 180) return { icon: '🔴', text: 'Очень высокий', color: '#ef4444' };
    return { icon: '💪', text: 'Норма', color: '#10b981' };
  }
  
  // Resting Heart Rate (дополнительные детали)
  if ((name.includes('resting') && name.includes('heart')) || name.includes('resting hr') || name.includes('пульс в покое')) {
    if (value < 40) return { icon: '⚠️', text: 'Очень низкий', color: '#ef4444' };
    if (value < 50) return { icon: '🏃', text: 'Атлетический', color: '#10b981' };
    if (value < 60) return { icon: '✅', text: 'Отличный', color: '#10b981' };
    if (value < 70) return { icon: '😊', text: 'Хороший', color: '#10b981' };
    if (value < 85) return { icon: '📊', text: 'Норма', color: '#10b981' };
    if (value < 100) return { icon: '⚠️', text: 'Повышенный', color: '#eab308' };
    return { icon: '🔴', text: 'Высокий', color: '#ef4444' };
  }
  
  return null;
};

// Получение пояснения для метрики
const getMetricTooltip = (metricName: string): string | null => {
  const name = metricName.toLowerCase();
  console.log('[DEBUG getMetricTooltip]', metricName, '→', name);
  
  if (name.includes('recovery')) {
    return 'Оценка готовности организма к нагрузкам. >66 = отличное, 33-66 = среднее, <33 = низкое восстановление';
  }
  
  if (name.includes('sleep') && name.includes('efficiency')) {
    return 'Процент времени, проведенного во сне от времени в постели. >85% = отлично, 75-85% = норма, <75% = плохо';
  }
  
  if (name.includes('sleep') && name.includes('duration')) {
    return 'Продолжительность сна. Рекомендуется 7-9 часов для взрослых';
  }
  
  if (name.includes('hrv')) {
    return 'Вариабельность сердечного ритма. Индикатор восстановления и адаптации к стрессу. Чем выше - тем лучше';
  }
  
  if (name.includes('strain') && !name.includes('workout')) {
    return 'Общая нагрузка за день. 10-18 = оптимальная зона';
  }
  
  if ((name.includes('resting') && name.includes('heart')) || name.includes('resting hr') || name.includes('пульс в покое')) {
    return 'Пульс в покое. Норма для взрослых: 40-85 уд/мин. Атлеты: 40-60 уд/мин';
  }
  
  if (name.includes('step')) {
    return 'Количество шагов за день. Рекомендуется: >10000 шагов. Минимум: 8000';
  }
  
  if (name.includes('body') && name.includes('fat')) {
    return 'Процент жира в организме. Норма для мужчин: 15-20%, для женщин: 20-28%. Атлеты: 10-15% (м), 18-22% (ж)';
  }
  
  if (name.includes('active') && name.includes('calories')) {
    return 'Калории, сожженные через физическую активность. Рекомендуется: >500 kcal. Минимум: 200 kcal';
  }
  
  if (name.includes('max') && name.includes('heart')) {
    return 'Максимальный пульс за день. Отражает интенсивность тренировки. Норма зависит от возраста (формула: 220 - возраст)';
  }
  
  if (name.includes('weight')) {
    return 'Масса тела. Интерпретация зависит от ваших целей (похудение/набор массы)';
  }
  
  return null;
};

export const WidgetCard = memo(function WidgetCard({ widget, data, multiSourceData, sparklineData, inBodySparklineData }: WidgetCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const metricName = widget.metric_name;
  const source = data?.source || 'unknown';
  const isMultiMode = widget.display_mode === 'multi' && multiSourceData;

  // ✅ ALL hooks BEFORE any early returns (React Rules of Hooks)
  const handleCardClick = useCallback(() => {
    navigate(`/metrics/${encodeURIComponent(metricName)}`);
  }, [navigate, metricName]);

  const Icon = useMemo(() => getMetricIcon(metricName), [metricName]);
  const color = useMemo(() => getMetricColor(metricName), [metricName]);

  // Render special Habits 3.0 widgets (after hooks)
  if (metricName === '🏆 Habit Level') {
    return <HabitLevelWidget />;
  }
  if (metricName === '🔥 Habit Streaks') {
    return <HabitStreakWidget />;
  }
  if (metricName === '🤝 Habit Social') {
    return <HabitSocialWidget />;
  }

  // Debug logging
  logger.debug('[WidgetCard]', {
    metric: metricName,
    displayMode: widget.display_mode,
    hasData: !!data,
    hasMultiSourceData: !!multiSourceData,
    multiSourceCount: multiSourceData?.sources?.length
  });

  // СНАЧАЛА проверяем multi-mode с данными
  if (isMultiMode && multiSourceData?.sources && multiSourceData.sources.length > 0) {
    const Icon = getMetricIcon(metricName);
    const color = getMetricColor(metricName);
    
    // Вычислить качество для первого источника (приоритетный)
    const primarySourceQuality = getMetricQualityColor(metricName, multiSourceData.sources[0].value);
    
    // Проверить свежесть для первого источника
    const daysDiff = Math.floor(multiSourceData.sources[0].age_hours / 24);
    const isDataStale = daysDiff >= 3;
    const isDataWarning = daysDiff === 2;
    
    return (
      <Card 
        className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer relative min-h-[180px] md:min-h-[160px]"
        onClick={handleCardClick}
        style={{
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: isDataStale 
            ? '#ef4444' 
            : isDataWarning 
              ? '#eab308' 
              : primarySourceQuality || 'hsl(var(--border))',
        }}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="absolute top-2 right-2 flex gap-1">
            {multiSourceData.sources[0]?.confidence && (
              <DataQualityBadge
                confidence={multiSourceData.sources[0].confidence}
                size="compact"
                showLabel={false}
              />
            )}
            <ConflictWarningBadge metricName={metricName} />
          </div>

          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground mb-1">
                {metricName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {multiSourceData.sources.length} {multiSourceData.sources.length === 1 ? 'источник' : 'источника'}
              </p>
            </div>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>

          <div className="space-y-2">
            {multiSourceData.sources.map((src, idx) => {
              const daysDiff = Math.floor(src.age_hours / 24);
              const isStale = daysDiff >= 3;
              const isWarning = daysDiff === 2;
              
              const qualityColor = getMetricQualityColor(metricName, src.value);
              
              return (
                <div 
                  key={idx} 
                  className="rounded-lg p-2.5 bg-card/50 hover:bg-card/70 transition-colors"
                  style={{
                    borderLeft: `3px solid ${qualityColor || color}`,
                  }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xl font-bold" style={{ color }}>
                      {formatValue(src.value, metricName, src.unit)}
                    </span>
                    <span className="text-sm text-muted-foreground">{src.unit}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getSourceDisplayName(src.source)}
                    </Badge>
                    {src.confidence && (
                      <DataQualityBadge
                        confidence={src.confidence}
                        size="compact"
                        showLabel={false}
                      />
                    )}
                    {src.age_hours < 24 ? (
                      <span className="text-xs text-muted-foreground">{src.age_hours}ч</span>
                    ) : (
                      <span 
                        className={`text-xs ${isStale ? 'text-destructive' : isWarning ? 'text-yellow-600' : 'text-muted-foreground'}`}
                      >
                        {Math.floor(src.age_hours / 24)}д
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multi-mode без данных
  if (isMultiMode && (!multiSourceData || !multiSourceData.sources || multiSourceData.sources.length === 0)) {
    return (
      <Card 
        className="overflow-hidden border-border/40 cursor-pointer hover:bg-accent/50 hover:shadow-lg transition-all hover:scale-[1.02]"
        onClick={() => navigate('/integrations')}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {metricName}
              </p>
              <p className="text-xs text-muted-foreground/60">
                Мульти-режим
              </p>
            </div>
            <Icon className="h-5 w-5 opacity-40" style={{ color }} />
          </div>
          <p className="text-sm text-muted-foreground mb-2">Нет данных</p>
          <p className="text-xs text-primary/70 flex items-center gap-1">
            <LinkIcon className="h-3 w-3" />
            Нажмите для подключения
          </p>
        </CardContent>
      </Card>
    );
  }

  // ПОТОМ проверяем single-mode без данных
  if (!data) {
    return (
      <Card 
        className="overflow-hidden border-border/40 cursor-pointer hover:bg-accent/50 hover:shadow-lg transition-all hover:scale-[1.02]"
        onClick={() => navigate('/integrations')}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {metricName}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {getSourceDisplayName(source)}
              </p>
            </div>
            <Icon className="h-5 w-5 opacity-40" style={{ color }} />
          </div>
          <p className="text-sm text-muted-foreground mb-2">Нет данных</p>
          <p className="text-xs text-primary/70 flex items-center gap-1">
            <LinkIcon className="h-3 w-3" />
            Нажмите для подключения
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasTrend = data.trend !== undefined && !isNaN(data.trend);
  const trendColor = hasTrend ? getTrendColor(data.trend!, metricName) : undefined;
  
  // Check if this is Body Fat metric for dual-column display
  const isBodyFatMetric = metricName.toLowerCase().includes('body') && metricName.toLowerCase().includes('fat');
  
  // Качество метрики (цвет рамки по значению)
  const qualityColor = getMetricQualityColor(metricName, data.value);
  const qualityLabel = getQualityLabel(metricName, data.value);
  const metricTooltip = getMetricTooltip(metricName);
  
  // Проверка на устаревшие данные с двумя уровнями (на основе дней)
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysDiff = (() => {
    if (!data?.measurement_date) return 0;
    const today = startOf(new Date());
    const dataDay = startOf(new Date(data.measurement_date));
    return Math.max(0, Math.floor((today.getTime() - dataDay.getTime()) / 86400000));
  })();
  const isToday = daysDiff === 0;
  const isYesterday = daysDiff === 1;
  const isDataWarning = daysDiff === 2; // Желтый: 2 дня
  const isDataStale = daysDiff >= 3; // Красный: 3+ дней
  const isWhoopSource = source.toLowerCase() === 'whoop';
  
  logger.debug('[WidgetCard freshness]', { metricName, source, date: data.measurement_date, daysDiff });
  
  const getDataAgeMessage = () => {
    if (!data?.measurement_date) return 'Нет данных';
    
    const measurementDate = parseISO(data.measurement_date);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - measurementDate.getTime()) / 60000);
    
    if (diffMinutes < 60) {
      return `${diffMinutes}м назад`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}ч назад`;
    } else if (isToday) {
      return 'Данные за сегодня';
    } else if (isYesterday) {
      return 'Данные за вчера';
    } else {
      return format(measurementDate, 'd MMM', { locale: ru });
    }
  };
  
  const getFreshnessIndicator = () => {
    if (isToday) return { label: '🟢 Сегодня', variant: 'success' as const, tooltip: 'Данные за сегодня' };
    if (isYesterday) return { label: '🟡 Вчера', variant: 'outline' as const, tooltip: 'Данные за вчера - сегодняшние еще обрабатываются' };
    if (isDataWarning) return { label: '⏱️ 2д', variant: 'outline' as const, tooltip: 'Данные не обновлялись 2 дня' };
    if (isDataStale) return { label: '⚠️ Устарело', variant: 'destructive' as const, tooltip: `Данные не обновлялись ${daysDiff} дней` };
    return null;
  };
  
  const freshnessIndicator = getFreshnessIndicator();

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer relative min-h-[180px] md:min-h-[160px]"
      onClick={handleCardClick}
      style={{
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: isDataStale 
          ? '#ef4444' 
          : isDataWarning 
            ? '#eab308' 
            : qualityColor || 'hsl(var(--border))',
      }}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1 sm:gap-2">
          {/* Data Quality Badge - always show if available */}
          {data?.confidence !== undefined && (
            <DataQualityBadge
              confidence={data.confidence}
              factors={data.factors}
              metricName={metricName}
              userId={user?.id}
              size="compact"
              showLabel={false}
            />
          )}
          
          {/* Conflict Warning Badge */}
          <ConflictWarningBadge metricName={metricName} />
          
          {/* Freshness Badge - показываем для всех источников */}
          {freshnessIndicator && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant={freshnessIndicator.variant} 
                    className="text-xs"
                  >
                    {freshnessIndicator.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{freshnessIndicator.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <h3 className="text-base font-semibold text-foreground mb-1">
                {metricName}
              </h3>
              {metricTooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{metricTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-[10px] sm:text-xs text-muted-foreground/60 cursor-help">
                    {getSourceDisplayName(source)}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Источник: {getSourceDisplayName(source)} (автовыбор)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color }} />
        </div>

        <div className="space-y-2">
          {/* Two-column layout for Body Fat with InBody data */}
          {isBodyFatMetric && inBodySparklineData && inBodySparklineData.length > 0 ? (
            <div className="flex justify-between items-start my-2">
              {/* Withings - left, pink */}
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-0.5">Withings</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight" style={{ color }}>
                    {formatValue(data.value, metricName, data.unit)}
                  </span>
                  <span className="text-sm text-muted-foreground">{data.unit}</span>
                </div>
              </div>
              {/* InBody - right, green */}
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground mb-0.5">InBody</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-emerald-500">
                    {inBodySparklineData[inBodySparklineData.length - 1]?.value.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">{data.unit}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-3xl font-bold tracking-tight" style={{ color }}>
                {formatValue(data.value, metricName, data.unit)}
              </span>
              {data.unit && (
                <span className="text-base text-muted-foreground">
                  {data.unit}
                </span>
              )}
            </div>
          )}
          
          {/* Текстовый индикатор качества */}
          {qualityLabel && (
            <div className="flex items-center gap-1">
              <span className="text-sm md:text-xs">{qualityLabel.icon}</span>
              <span className="text-sm md:text-xs font-medium" style={{ color: qualityLabel.color }}>
                {qualityLabel.text}
              </span>
            </div>
          )}
          
          {/* Прогресс-бар для ключевых метрик */}
          {(metricName === 'Recovery Score' || 
            (metricName.includes('Sleep') && metricName.includes('Efficiency')) ||
            metricName.includes('HRV')) && (
            <div className="space-y-1">
              <Progress 
                value={metricName === 'Recovery Score' ? data.value : 
                       metricName.includes('HRV') ? Math.min(100, (data.value / 100) * 100) :
                       data.value} 
                autoColor={true}
                className="h-4"
              />
            </div>
          )}
          
          {/* Специальная обработка Body Fat Percentage */}
          {(metricName.toLowerCase().includes('body') && metricName.toLowerCase().includes('fat')) && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Здоровая зона: 15-25%
                </span>
                <Badge 
                  variant={data.value >= 15 && data.value <= 25 ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {data.value >= 15 && data.value <= 25 ? 'В норме' : 'Вне нормы'}
                </Badge>
              </div>
                  <Progress 
                    value={Math.min((data.value / 35) * 100, 100)} 
                    className="h-4"
                    variant={
                      data.value < 15 || data.value > 28 ? 'danger' :
                      data.value > 25 ? 'warning' : 
                      'success'
                    }
                  />
              <p className="text-xs text-muted-foreground font-medium">
                {data.value < 15 ? 'Слишком низкий' : 
                 data.value <= 20 ? 'Атлетический' :
                 data.value <= 25 ? 'Отличный' :
                 data.value <= 28 ? 'Норма' :
                 'Повышенный'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-xs">
          <div className="flex items-center gap-2">
            {(() => {
              const now = new Date();
              const dataDate = new Date(data.measurement_date);
              const daysDiff = Math.floor((now.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24));
              
              const isSleepMetric = metricName.toLowerCase().includes('sleep');
              const isRecoveryScore = metricName === 'Recovery Score';
              const isWorkoutMetric = metricName.toLowerCase().includes('workout') || 
                                     metricName.toLowerCase().includes('strain');
              
              // Recovery Score: если данные за вчера/сегодня → "Сегодня"
              if (isRecoveryScore && daysDiff <= 1) {
                return <span className="text-muted-foreground">Сегодня</span>;
              }
              
              // Sleep: если данные за сегодня → "Сегодня"
              if (isSleepMetric && daysDiff === 0) {
                return <span className="text-muted-foreground">Сегодня</span>;
              }
              
              // Workout метрики: "Последняя: [дата]" если > 1 дня
              if (isWorkoutMetric && daysDiff > 1) {
                return (
                  <>
                    <span className="text-muted-foreground">Последняя:</span>
                    <span className="text-muted-foreground">
                      {dataDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </>
                );
              }
              
              // Остальные метрики: "Сегодня" / "Вчера" / дата
              if (daysDiff === 0) {
                return <span className="text-muted-foreground">Сегодня</span>;
              } else if (daysDiff === 1) {
                return <span className="text-muted-foreground">Вчера</span>;
              } else {
                return (
                  <>
                    <span className="text-muted-foreground">
                      {dataDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                    {daysDiff > 1 && (
                      <span className="text-xs text-yellow-600 font-medium">
                        ({daysDiff} дн. назад)
                      </span>
                    )}
                  </>
                );
              }
            })()}
          </div>
          
          {hasTrend && (
            <div 
              className="flex items-center gap-0.5 sm:gap-1 font-medium"
              style={{ color: trendColor }}
            >
              {data.trend! > 0 ? (
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              ) : data.trend! < 0 ? (
                <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              ) : (
                <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              )}
              <span className="hidden sm:inline">{Math.abs(data.trend!).toFixed(1)}%</span>
              <span className="sm:hidden">{Math.abs(data.trend!).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* Sparkline Chart - Recharts with InBody overlay */}
        {sparklineData && sparklineData.length > 1 && (() => {
          // Linear interpolation function for InBody data
          const interpolateInBodyValue = (dateStr: string, inBodyData: { date: string; value: number }[]): number | undefined => {
            if (inBodyData.length < 2) return undefined;
            
            const sorted = [...inBodyData].sort((a, b) => a.date.localeCompare(b.date));
            const firstPoint = sorted[0];
            const lastPoint = sorted[sorted.length - 1];
            
            // Outside range - undefined
            if (dateStr < firstPoint.date || dateStr > lastPoint.date) return undefined;
            
            // Exact match - return actual value
            const exactMatch = sorted.find(d => d.date === dateStr);
            if (exactMatch) return exactMatch.value;
            
            // Linear interpolation between first and last point
            const firstTime = new Date(firstPoint.date).getTime();
            const lastTime = new Date(lastPoint.date).getTime();
            const currentTime = new Date(dateStr).getTime();
            
            const progress = (currentTime - firstTime) / (lastTime - firstTime);
            return firstPoint.value + (lastPoint.value - firstPoint.value) * progress;
          };

          // Merge Withings and InBody data by date (computed once, not in JSX)
          const mergedChartData = (() => {
            // If no InBody data or only 1 point - show only Withings
            if (!inBodySparklineData || inBodySparklineData.length < 2) {
              return sparklineData.map(d => ({
                date: format(parseISO(d.date), 'd MMM', { locale: ru }),
                rawDate: d.date,
                withingsValue: d.value,
                inbodyValue: undefined,
                isRealInBody: false,
              }));
            }
            
            // Show ALL Withings data (full period) + InBody only in its range
            const allDates = new Set([
              ...sparklineData.map(d => d.date),
              ...inBodySparklineData.map(d => d.date),
            ]);
            
            return Array.from(allDates).sort().map(date => {
              const withingsPoint = sparklineData.find(d => d.date === date);
              // InBody: interpolated only within its date range, undefined outside
              const inbodyValue = interpolateInBodyValue(date, inBodySparklineData);
              const isRealInBody = inBodySparklineData.some(d => d.date === date);
              
              return {
                date: format(parseISO(date), 'd MMM', { locale: ru }),
                rawDate: date,
                withingsValue: withingsPoint?.value,
                inbodyValue: inbodyValue,
                isRealInBody: isRealInBody,
              };
            });
          })();
          
          // Calculate SEPARATE domains for each data source
          const withingsValues = mergedChartData
            .map(d => d.withingsValue)
            .filter((v): v is number => v != null);
          
          const inbodyValues = mergedChartData
            .map(d => d.inbodyValue)
            .filter((v): v is number => v != null);

          // Explicit domains with padding - each source gets its own range
          const withingsDomain: [number, number] = withingsValues.length > 0 
            ? [
                Math.min(...withingsValues) - 0.3,
                Math.max(...withingsValues) + 0.3
              ]
            : [0, 100];
          
          const inbodyDomain: [number, number] = inbodyValues.length > 0
            ? [
                Math.min(...inbodyValues) - 0.3,
                Math.max(...inbodyValues) + 0.3
              ]
            : [0, 100];

          return (
            <div className="mt-2 sm:mt-3 -mx-3 sm:-mx-6 -mb-3 sm:-mb-6">
              <ResponsiveContainer width="100%" height={65}>
                <AreaChart 
                  data={mergedChartData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={`gradientWithings-${metricName}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id={`gradientInBody-${metricName}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  {/* Dual Y-axis with EXPLICIT separate domains */}
                  <YAxis 
                    yAxisId="withings"
                    domain={withingsDomain}
                    hide 
                  />
                  <YAxis 
                    yAxisId="inbody"
                    orientation="right"
                    domain={inbodyDomain}
                    hide 
                  />
                  <RechartsTooltip 
                    content={
                      <WidgetChartTooltip 
                        metricName={metricName} 
                        unit={data.unit} 
                      />
                    } 
                  />
                  {/* Withings data - pink gradient wave */}
                  <Area
                    yAxisId="withings"
                    type="monotone"
                    dataKey="withingsValue"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#gradientWithings-${metricName})`}
                    isAnimationActive={false}
                    connectNulls={true}
                  />
                  {/* InBody data - green gradient wave with dots */}
                  {inBodySparklineData && inBodySparklineData.length >= 2 && (
                    <Area
                      yAxisId="inbody"
                      type="linear"
                      dataKey="inbodyValue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill={`url(#gradientInBody-${metricName})`}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload?.isRealInBody && cx && cy) {
                          return (
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={4} 
                              fill="#10b981" 
                              stroke="white" 
                              strokeWidth={1.5}
                            />
                          );
                        }
                        return null;
                      }}
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
              {/* Legend for dual data sources */}
              {inBodySparklineData && inBodySparklineData.length > 0 && (
                <div className="flex items-center justify-end gap-3 px-3 pb-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 rounded" style={{ backgroundColor: color }}></span>
                    Withings
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    InBody
                  </span>
                </div>
              )}
            </div>
          );
        })()}

      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison для оптимизации
  return (
    prevProps.widget.id === nextProps.widget.id &&
    prevProps.data?.value === nextProps.data?.value &&
    prevProps.data?.measurement_date === nextProps.data?.measurement_date &&
    prevProps.sparklineData?.length === nextProps.sparklineData?.length
  );
});
