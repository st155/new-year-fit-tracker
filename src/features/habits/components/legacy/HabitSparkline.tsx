import { useMemo } from 'react';

interface HabitSparklineProps {
  data: number[]; // Array of 0s and 1s
  height?: number;
  width?: number;
  color?: string;
}

export function HabitSparkline({ 
  data, 
  height = 30, 
  width = 120,
  color = 'hsl(var(--habit-positive))'
}: HabitSparklineProps) {
  const points = useMemo(() => {
    if (data.length === 0) return [];
    
    const spacing = width / (data.length - 1 || 1);
    const barWidth = Math.max(1, spacing * 0.6);
    
    return data.map((value, i) => {
      const x = i * spacing;
      const barHeight = value > 0 ? height * 0.8 : height * 0.2;
      const y = height - barHeight;
      return { x, y: y + 2, height: barHeight - 2, value };
    });
  }, [data, height, width]);

  if (data.length === 0) return null;

  return (
    <svg width={width} height={height} className="habit-sparkline">
      {points.map((point, i) => (
        <rect
          key={i}
          x={point.x}
          y={point.y}
          width={width / (data.length * 1.2)}
          height={point.height}
          fill={point.value > 0 ? color : 'hsl(var(--muted))'}
          opacity={point.value > 0 ? 0.9 : 0.3}
          rx={1}
        />
      ))}
    </svg>
  );
}
