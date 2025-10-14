import { cn } from "@/lib/utils";

interface WaveChartProps {
  value: number;
  status: string;
  statusColor: string;
  className?: string;
}

export function WaveChart({ value, status, statusColor, className }: WaveChartProps) {
  return (
    <div className={cn("relative h-24 overflow-hidden", className)}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
          </linearGradient>
          <filter id="waveGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <path
          d="M0,40 Q25,20 50,40 T100,40 T150,40 T200,40"
          fill="none"
          stroke="url(#waveGradient)"
          strokeWidth="2"
          filter="url(#waveGlow)"
          className="animate-pulse"
        />
        
        <path
          d="M0,40 Q25,20 50,40 T100,40 T150,40 T200,40 L200,80 L0,80 Z"
          fill="url(#waveGradient)"
          opacity="0.2"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <span className="text-xl font-bold metric-glow">{value.toFixed(1)}%</span>
        <span className={cn("text-xs font-semibold mt-1", statusColor)}>{status}</span>
      </div>
    </div>
  );
}
