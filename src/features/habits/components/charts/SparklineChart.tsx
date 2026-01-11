import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface SparklineChartProps {
  data: number[]; // Array of values
  className?: string;
  color?: string;
  height?: number;
}

export function SparklineChart({ 
  data, 
  className, 
  color = "hsl(var(--primary))",
  height = 40 
}: SparklineChartProps) {
  const { t } = useTranslation('common');

  const { path, max, min, lastPoint, gradientId } = useMemo(() => {
    if (data.length === 0) return { path: '', max: 0, min: 0, lastPoint: null, gradientId: '' };
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const width = 100;
    const stepX = width / (data.length - 1 || 1);
    
    const points = data.map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });
    
    const path = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const lastPoint = points[points.length - 1];
    const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;
    
    return { path, max, min, lastPoint, gradientId };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-xs", className)}>
        {t('states.noData')}
      </div>
    );
  }

  return (
    <svg 
      viewBox={`0 0 100 ${height}`} 
      className={cn("w-full", className)}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.05"/>
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <path
        d={`${path} L 100,${height} L 0,${height} Z`}
        fill={`url(#${gradientId})`}
      />
      {lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="2.5"
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}
