import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart, Moon, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthScoreBreakdown {
  recovery: number;
  sleep: number;
  activity: number;
  consistency: number;
  trend: number;
}

interface ClientHealthScoreProps {
  totalScore: number;
  breakdown: HealthScoreBreakdown;
  lastUpdated?: Date;
  className?: string;
}

function getScoreColor(score: number): { color: string; label: string; gradient: string } {
  if (score >= 80) {
    return { 
      color: 'hsl(var(--success))', 
      label: 'Excellent',
      gradient: 'from-green-500/20 to-green-600/10'
    };
  } else if (score >= 60) {
    return { 
      color: 'hsl(var(--primary))', 
      label: 'Good',
      gradient: 'from-blue-500/20 to-blue-600/10'
    };
  } else if (score >= 40) {
    return { 
      color: 'hsl(var(--warning))', 
      label: 'Fair',
      gradient: 'from-yellow-500/20 to-yellow-600/10'
    };
  } else {
    return { 
      color: 'hsl(var(--destructive))', 
      label: 'Poor',
      gradient: 'from-red-500/20 to-red-600/10'
    };
  }
}

export function ClientHealthScore({ 
  totalScore, 
  breakdown, 
  lastUpdated,
  className 
}: ClientHealthScoreProps) {
  const { color, label, gradient } = getScoreColor(totalScore);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Card className={cn("cursor-pointer hover:shadow-lg transition-shadow", className)}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* Circular Progress */}
              <div className="relative">
                <svg className="h-24 w-24 -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={color}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - totalScore / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{totalScore}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Health Score</h3>
                <Badge 
                  variant={totalScore >= 80 ? 'default' : 'secondary'}
                  className="mb-2"
                >
                  {label}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Click for detailed breakdown
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Health Score Breakdown</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Comprehensive health assessment based on multiple factors
            </p>
          </div>

          {/* Recovery Component (25%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Recovery</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {breakdown.recovery.toFixed(0)}/25
              </span>
            </div>
            <Progress value={(breakdown.recovery / 25) * 100} className="h-2" />
          </div>

          {/* Sleep Component (25%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Sleep Quality</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {breakdown.sleep.toFixed(0)}/25
              </span>
            </div>
            <Progress value={(breakdown.sleep / 25) * 100} className="h-2" />
          </div>

          {/* Activity Component (20%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Activity Level</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {breakdown.activity.toFixed(0)}/20
              </span>
            </div>
            <Progress value={(breakdown.activity / 20) * 100} className="h-2" />
          </div>

          {/* Consistency Component (15%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Consistency</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {breakdown.consistency.toFixed(0)}/15
              </span>
            </div>
            <Progress value={(breakdown.consistency / 15) * 100} className="h-2" />
          </div>

          {/* Trend Component (15%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Progress Trend</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {breakdown.trend.toFixed(0)}/15
              </span>
            </div>
            <Progress value={(breakdown.trend / 15) * 100} className="h-2" />
          </div>

          {lastUpdated && (
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleDateString()}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
