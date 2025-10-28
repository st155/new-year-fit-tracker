import { cn } from "@/lib/utils";

interface TrainerSparklineProps {
  data: number[];
  color?: "orange" | "green" | "blue" | "purple";
  height?: number;
  className?: string;
}

const colorClasses = {
  orange: "stroke-trainer-orange",
  green: "stroke-trainer-green",
  blue: "stroke-trainer-blue",
  purple: "stroke-purple-400"
};

export function TrainerSparkline({
  data,
  color = "orange",
  height = 30,
  className
}: TrainerSparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg 
      className={cn("w-full", className)} 
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        className={cn(colorClasses[color], "transition-all duration-300")}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
