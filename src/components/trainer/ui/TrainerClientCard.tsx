import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrainerProgressRing } from "./TrainerProgressRing";
import { Sparkles, Eye } from "lucide-react";

interface ClientMetric {
  name: string;
  value: number | string;
  unit?: string;
  icon: ReactNode;
  color?: "orange" | "green" | "blue" | "purple";
}

interface TrainerClientCardProps {
  client: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    goals_count?: number;
  };
  healthScore: number;
  metrics?: ClientMetric[];
  isActive?: boolean;
  lastActivity?: string;
  onViewDetails?: () => void;
  onAskAI?: () => void;
  className?: string;
}

export function TrainerClientCard({
  client,
  healthScore,
  metrics = [],
  isActive = false,
  lastActivity,
  onViewDetails,
  onAskAI,
  className
}: TrainerClientCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getHealthScoreColor = (score: number): "orange" | "green" | "blue" | "purple" => {
    if (score >= 80) return "green";
    if (score >= 60) return "blue";
    if (score >= 40) return "orange";
    return "purple";
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden border-border",
        "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        "cursor-pointer",
        className
      )}
      onClick={onViewDetails}
    >
      {/* Activity indicator */}
      {isActive && (
        <div className="absolute top-3 right-3">
          <div className="relative">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <div className="absolute inset-0 h-2 w-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
          </div>
        </div>
      )}

      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar + Health Score */}
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-trainer-orange/20">
              <AvatarImage src={client.avatar_url} />
              <AvatarFallback className="bg-trainer-orange/10 text-trainer-orange font-bold text-lg">
                {getInitials(client.full_name || client.username)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2">
              <TrainerProgressRing 
                value={healthScore} 
                size={40} 
                strokeWidth={4}
                color={getHealthScoreColor(healthScore)}
                showValue={false}
              />
            </div>
          </div>

          {/* Client Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate">
              {client.full_name || client.username}
            </h3>
            <p className="text-sm text-muted-foreground">@{client.username}</p>
            
            {/* Metrics */}
            {metrics.length > 0 && (
              <div className="flex gap-3 mt-3">
                {metrics.slice(0, 3).map((metric, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <div className={cn(
                      "h-4 w-4",
                      metric.color ? `text-trainer-${metric.color}` : "text-muted-foreground"
                    )}>
                      {metric.icon}
                    </div>
                    <span className="text-xs font-medium">
                      {metric.value}{metric.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Stats badges */}
            <div className="flex gap-2 mt-3">
              {client.goals_count !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {client.goals_count} целей
                </Badge>
              )}
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  healthScore >= 80 ? "border-green-500/50 text-green-600" :
                  healthScore >= 60 ? "border-blue-500/50 text-blue-600" :
                  healthScore >= 40 ? "border-orange-500/50 text-orange-600" :
                  "border-purple-500/50 text-purple-600"
                )}
              >
                Health: {healthScore}%
              </Badge>
            </div>

            {lastActivity && (
              <p className="text-xs text-muted-foreground mt-2">
                {lastActivity}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions - показываются при hover */}
        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1 gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
          >
            <Eye className="h-3 w-3" />
            Детали
          </Button>
          <Button 
            size="sm"
            className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700"
            onClick={(e) => {
              e.stopPropagation();
              onAskAI?.();
            }}
          >
            <Sparkles className="h-3 w-3" />
            Спросить AI
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
