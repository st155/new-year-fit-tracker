import { cn } from "@/lib/utils";

interface TrainerProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: "orange" | "green" | "blue" | "purple";
  showValue?: boolean;
  className?: string;
}

const colorStroke = {
  orange: "stroke-trainer-orange",
  green: "stroke-trainer-green",
  blue: "stroke-trainer-blue",
  purple: "stroke-purple-400"
};

export function TrainerProgressRing({
  value,
  size = 80,
  strokeWidth = 8,
  color = "orange",
  showValue = true,
  className
}: TrainerProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
          opacity={0.2}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn(colorStroke[color], "transition-all duration-500 ease-out")}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-sm font-bold", colorStroke[color].replace('stroke-', 'text-'))}>
            {Math.round(value)}%
          </span>
        </div>
      )}
    </div>
  );
}
