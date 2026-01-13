import { cn } from "@/lib/utils";
import { motion, Easing } from "framer-motion";

/**
 * Unified CircularProgress Component
 * Replaces: 
 * - src/components/ui/circular-progress.tsx (this file)
 * - src/components/dashboard/CircularProgress.tsx
 * - src/components/body-composition/CircularProgress.tsx
 * - src/features/habits/components/widgets/CircularProgress.tsx
 */

// Gradient presets for different contexts
const GRADIENT_PRESETS = {
  primary: ["hsl(var(--primary))", "hsl(var(--primary))"],
  success: ["hsl(var(--success))", "hsl(142 76% 36%)"],
  warning: ["hsl(var(--warning))", "hsl(38 92% 50%)"],
  danger: ["hsl(var(--danger))", "hsl(0 72% 51%)"],
  purple: ["#6366F1", "#9333EA"],
  cyan: ["#06B6D4", "#0891B2"],
  orange: ["#F97316", "#EA580C"],
} as const;

type GradientPreset = keyof typeof GRADIENT_PRESETS;

interface CircularProgressProps {
  /** Current value */
  value: number;
  /** Maximum value (default: 100 for percentage) */
  max?: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show value in center */
  showValue?: boolean;
  /** Label text below value */
  label?: string;
  /** Gradient preset or custom [from, to] colors */
  gradient?: GradientPreset | [string, string];
  /** Legacy color prop - use gradient instead */
  color?: string;
  /** Enable glow effect */
  glow?: boolean;
  /** Enable animation on mount */
  animated?: boolean;
  /** Custom render for center content */
  children?: React.ReactNode;
  /** Format value display (default: Math.round) */
  formatValue?: (value: number) => string;
}

const EASE_OUT: Easing = [0.4, 0, 0.2, 1];

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  className,
  showValue = true,
  label,
  gradient = "primary",
  color,
  glow = true,
  animated = true,
  children,
  formatValue = (v) => Math.round(v).toString(),
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;
  
  // Generate unique IDs for SVG definitions
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
  const glowId = `glow-${gradientId}`;
  
  // Resolve gradient colors (support legacy color prop)
  const resolvedGradient = color 
    ? [color, color] 
    : (Array.isArray(gradient) ? gradient : GRADIENT_PRESETS[gradient]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={resolvedGradient[0]} />
            <stop offset="100%" stopColor={resolvedGradient[1]} />
          </linearGradient>
          {glow && (
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          )}
        </defs>
        
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.2}
        />
        
        {/* Progress circle */}
        {animated ? (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            filter={glow ? `url(#${glowId})` : undefined}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: EASE_OUT }}
          />
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter={glow ? `url(#${glowId})` : undefined}
            className="transition-all duration-500 ease-out"
          />
        )}
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ? (
          children
        ) : (
          <>
            {showValue && (
              <span className="text-2xl font-bold">{formatValue(value)}</span>
            )}
            {label && (
              <span className="text-xs text-muted-foreground mt-1">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Export gradient presets for external use
export { GRADIENT_PRESETS };
export type { CircularProgressProps, GradientPreset };
