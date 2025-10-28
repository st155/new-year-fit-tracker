import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { TrainerProgressRing } from "./TrainerProgressRing";

interface TrainerMetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: ReactNode;
  progress?: number;
  color?: "orange" | "green" | "blue" | "purple";
  subtitle?: string;
  className?: string;
}

const colorClasses = {
  orange: {
    bg: "bg-trainer-orange/10",
    text: "text-trainer-orange",
    border: "border-trainer-orange/30",
    glow: "hover:shadow-[0_0_20px_rgba(255,107,53,0.3)]"
  },
  green: {
    bg: "bg-trainer-green/10",
    text: "text-trainer-green",
    border: "border-trainer-green/30",
    glow: "hover:shadow-[0_0_20px_rgba(78,205,196,0.3)]"
  },
  blue: {
    bg: "bg-trainer-blue/10",
    text: "text-trainer-blue",
    border: "border-trainer-blue/30",
    glow: "hover:shadow-[0_0_20px_rgba(69,183,209,0.3)]"
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
  }
};

export function TrainerMetricCard({
  title,
  value,
  unit,
  icon,
  progress,
  color = "orange",
  subtitle,
  className
}: TrainerMetricCardProps) {
  const colors = colorClasses[color];

  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-border backdrop-blur-lg",
        "transition-all duration-300 hover:scale-[1.02]",
        colors.glow,
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", colors.bg)}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <div className={cn("text-3xl font-bold", colors.text)}>
            {value}
          </div>
          {unit && <span className="text-sm text-muted-foreground mb-1">{unit}</span>}
        </div>
        
        {progress !== undefined && (
          <TrainerProgressRing value={progress} color={color} size={60} strokeWidth={6} />
        )}
        
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
