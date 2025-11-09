import { useMemo } from 'react';
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
  const { path, max, min } = useMemo(() => {
    if (data.length === 0) return { path: '', max: 0, min: 0 };
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const width = 100;
    const stepX = width / (data.length - 1 || 1);
    
    const points = data.map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    const path = `M ${points.join(' L ')}`;
    
    return { path, max, min };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-xs", className)}>
        Нет данных
      </div>
    );
  }

  return (
    <svg 
      viewBox={`0 0 100 ${height}`} 
      className={cn("w-full", className)}
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300"
      />
      <path
        d={`${path} L 100,${height} L 0,${height} Z`}
        fill={color}
        opacity="0.1"
      />
    </svg>
  );
}
