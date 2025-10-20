interface HabitSparklineProps {
  data: number[];
  height?: number;
  width?: number;
  color?: string;
}

export function HabitSparkline({ 
  data, 
  height = 40, 
  width = 100,
  color = 'hsl(var(--primary))'
}: HabitSparklineProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg 
      width={width} 
      height={height} 
      className="overflow-visible"
      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Dots at each point */}
      {data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="2"
            fill={color}
            opacity="0.6"
          />
        );
      })}
    </svg>
  );
}
