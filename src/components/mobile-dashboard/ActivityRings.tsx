import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RingData {
  value: number;
  max: number;
  color: string;
  label: string;
}

interface ActivityRingsProps {
  steps: number;
  strain: number;
  calories: number;
  className?: string;
}

export function ActivityRings({ steps, strain, calories, className }: ActivityRingsProps) {
  const rings: RingData[] = [
    { value: steps, max: 10000, color: 'hsl(158, 64%, 52%)', label: 'Steps' },
    { value: strain, max: 21, color: 'hsl(38, 92%, 50%)', label: 'Strain' },
    { value: calories, max: 600, color: 'hsl(349, 100%, 60%)', label: 'Cal' },
  ];

  const size = 120;
  const strokeWidth = 10;
  const gap = 14;

  return (
    <div className={cn("flex items-center justify-center gap-6", className)}>
      {/* Rings SVG */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {rings.map((ring, index) => {
            const radius = (size - strokeWidth) / 2 - index * gap;
            const circumference = 2 * Math.PI * radius;
            const progress = Math.min(ring.value / ring.max, 1) * circumference;
            
            return (
              <g key={ring.label}>
                {/* Background ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth={strokeWidth}
                  opacity={0.3}
                />
                {/* Progress ring */}
                <motion.circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - progress }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 + index * 0.15 }}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ filter: `drop-shadow(0 0 6px ${ring.color})` }}
                />
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Legend */}
      <div className="flex flex-col gap-2">
        {rings.map((ring) => (
          <div key={ring.label} className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: ring.color }}
            />
            <span className="text-xs text-muted-foreground">{ring.label}</span>
            <span className="text-sm font-medium text-foreground">
              {ring.label === 'Steps' 
                ? ring.value.toLocaleString() 
                : ring.label === 'Strain'
                ? ring.value.toFixed(1)
                : ring.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
