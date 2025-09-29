import { Activity, Heart, Moon, Dumbbell, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  activity: {
    id: string;
    user_id: string;
    action_type: string;
    action_text: string;
    created_at: string;
    profiles: {
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    like_count?: number;
    comment_count?: number;
    user_liked?: boolean;
  };
  onActivityUpdate: () => void;
}

const getActivityIcon = (actionText: string) => {
  if (actionText.includes('workout') || actionText.includes('Activity') || actionText.includes('strain')) {
    return <Activity className="h-8 w-8" />;
  }
  if (actionText.includes('recovered') || actionText.includes('Recovery')) {
    return <TrendingUp className="h-8 w-8" />;
  }
  if (actionText.includes('slept') || actionText.includes('sleep')) {
    return <Moon className="h-8 w-8" />;
  }
  return <Dumbbell className="h-8 w-8" />;
};

const parseActivityMetrics = (actionText: string) => {
  const metrics: string[] = [];
  
  // Duration (e.g., "15m 36s")
  const durationMatch = actionText.match(/(\d+)m\s*(\d+)s/);
  if (durationMatch) {
    metrics.push(`${durationMatch[1]}m ${durationMatch[2]}s`);
  }
  
  // Calories (e.g., "173kcal")
  const caloriesMatch = actionText.match(/(\d+)kcal/);
  if (caloriesMatch) {
    metrics.push(`${caloriesMatch[1]}kcal`);
  }
  
  // Strain (e.g., "7.2 strain")
  const strainMatch = actionText.match(/([\d.]+)\s*strain/);
  if (strainMatch) {
    metrics.push(`${strainMatch[1]} strain`);
  }
  
  // Recovery (e.g., "recovered 85%")
  const recoveryMatch = actionText.match(/recovered\s*(\d+)%/);
  if (recoveryMatch) {
    metrics.push(`${recoveryMatch[1]}% recovery`);
  }
  
  // Sleep (e.g., "slept 7.5h")
  const sleepMatch = actionText.match(/slept\s*([\d.]+)h/);
  if (sleepMatch) {
    metrics.push(`${sleepMatch[1]}h sleep`);
  }
  
  // If no metrics found, return the action text as is
  return metrics.length > 0 ? metrics.join(', ') : actionText;
};

export function ActivityCard({ activity }: ActivityCardProps) {
  const metrics = parseActivityMetrics(activity.action_text);
  const icon = getActivityIcon(activity.action_text);
  
  return (
    <div className="relative rounded-3xl p-[2px] bg-gradient-to-r from-primary via-primary to-success overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <div className="relative rounded-3xl bg-card/90 backdrop-blur-sm p-6 h-full">
        <div className="flex items-center gap-4">
          <div className="text-primary shrink-0">
            {icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-foreground leading-tight">
              {metrics}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}