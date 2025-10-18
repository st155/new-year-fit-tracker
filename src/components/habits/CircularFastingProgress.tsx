import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CircularFastingProgressProps {
  progress: number;
  elapsedMinutes: number;
  targetMinutes: number;
  status: {
    isFasting: boolean;
    isEating: boolean;
    duration: number;
  };
  className?: string;
}

export function CircularFastingProgress({
  progress,
  elapsedMinutes,
  targetMinutes,
  status,
  className,
}: CircularFastingProgressProps) {
  const size = 280;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}м`;
    return `${hours}ч ${mins}м`;
  };

  const getStatusColor = () => {
    if (status.isFasting) return "from-green-400 via-emerald-500 to-teal-500";
    if (status.isEating) return "from-orange-400 via-red-500 to-pink-500";
    return "from-gray-300 to-gray-400";
  };

  const getStatusEmoji = () => {
    if (status.isFasting) return "🔥";
    if (status.isEating) return "🍽️";
    return "⏸️";
  };

  const getStatusText = () => {
    if (status.isFasting) return "Голодание";
    if (status.isEating) return "Окно питания";
    return "Не активно";
  };

  const isGoalReached = status.isFasting && elapsedMinutes >= targetMinutes;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={cn("transition-all duration-1000", 
                status.isFasting ? "text-green-400" : status.isEating ? "text-orange-400" : "text-gray-300"
              )} stopColor="currentColor" />
              <stop offset="50%" className={cn("transition-all duration-1000",
                status.isFasting ? "text-emerald-500" : status.isEating ? "text-red-500" : "text-gray-350"
              )} stopColor="currentColor" />
              <stop offset="100%" className={cn("transition-all duration-1000",
                status.isFasting ? "text-teal-500" : status.isEating ? "text-pink-500" : "text-gray-400"
              )} stopColor="currentColor" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-muted/20"
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              "transition-all duration-1000 ease-in-out",
              isGoalReached && "animate-pulse-glow"
            )}
            filter="url(#glow)"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl mb-2 animate-in fade-in duration-500">
            {getStatusEmoji()}
          </div>
          <div className={cn(
            "text-5xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-500",
            getStatusColor()
          )}>
            {formatTime(elapsedMinutes)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {status.isFasting && `${Math.round(progress)}%`}
            {status.isEating && "идёт приём пищи"}
            {!status.isFasting && !status.isEating && "готов начать"}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <Badge 
        variant={status.isFasting ? "default" : status.isEating ? "secondary" : "outline"}
        className={cn(
          "text-sm px-4 py-1 transition-all duration-300",
          status.isFasting && "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 shadow-lg shadow-green-500/30",
          status.isEating && "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/30",
          isGoalReached && "animate-milestone-bounce"
        )}
      >
        {getStatusText()}
      </Badge>
    </div>
  );
}
