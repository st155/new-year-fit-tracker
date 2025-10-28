import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { TrainerSparkline } from "./TrainerSparkline";

interface TrainerStatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: number;
  color?: "orange" | "green" | "blue" | "purple" | "default";
  subtitle?: string;
  sparklineData?: number[];
  className?: string;
}

const colorClasses = {
  orange: {
    bg: "bg-trainer-orange/10",
    icon: "text-trainer-orange",
    border: "hover:border-trainer-orange/30",
    badge: "bg-orange-100 text-orange-700 border-0"
  },
  green: {
    bg: "bg-trainer-green/10",
    icon: "text-trainer-green",
    border: "hover:border-trainer-green/30",
    badge: "bg-green-100 text-green-700 border-0"
  },
  blue: {
    bg: "bg-trainer-blue/10",
    icon: "text-trainer-blue",
    border: "hover:border-trainer-blue/30",
    badge: "bg-blue-100 text-blue-700 border-0"
  },
  purple: {
    bg: "bg-purple-500/10",
    icon: "text-purple-400",
    border: "hover:border-purple-500/30",
    badge: "bg-purple-100 text-purple-700 border-0"
  },
  default: {
    bg: "bg-muted/30",
    icon: "text-muted-foreground",
    border: "hover:border-border",
    badge: "bg-muted text-muted-foreground border-0"
  }
};

export function TrainerStatCard({
  title,
  value,
  icon,
  trend,
  color = "orange",
  subtitle,
  sparklineData,
  className
}: TrainerStatCardProps) {
  const colors = colorClasses[color];
  const showTrend = trend !== undefined && trend !== 0;
  const isPositive = trend && trend > 0;

  return (
    <Card 
      className={cn(
        "border-border transition-all duration-300 hover:scale-[1.02]",
        colors.border,
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-2 flex-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-3xl font-bold">{value}</div>
          {showTrend && (
            <Badge className={cn(colors.badge, "gap-1")}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? '+' : ''}{trend}%
            </Badge>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0", colors.bg)}>
          <div className={cn("h-6 w-6", colors.icon)}>
            {icon}
          </div>
        </div>
      </CardHeader>
      {sparklineData && sparklineData.length > 0 && (
        <CardContent className="pt-0">
          <TrainerSparkline 
            data={sparklineData} 
            color={color === "default" ? "orange" : color} 
            height={40} 
          />
        </CardContent>
      )}
    </Card>
  );
}
