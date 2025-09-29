import { Activity, Heart, Moon, Dumbbell, TrendingUp, Bike, Waves, Mountain, User, Footprints, Zap, ShirtIcon as Shirt } from "lucide-react";
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
  const text = actionText.toLowerCase();
  
  // Sleep activities (purple moon icon)
  if (text.includes('slept') || text.includes('sleep') || text.includes('сон') || text.includes('спал')) {
    return <Moon className="h-8 w-8" />;
  }
  
  // Strength/Weight training (orange dumbbell icon)
  if (text.includes('weight') || text.includes('strength') || text.includes('силовая') || text.includes('гантели')) {
    return <Dumbbell className="h-8 w-8" />;
  }
  
  // General workouts/training (orange activity line icon)
  if (text.includes('workout') || text.includes('training') || text.includes('тренировку') || text.includes('strain') || text.includes('завершил')) {
    return <TrendingUp className="h-8 w-8" />;
  }
  
  // Recovery activities  
  if (text.includes('recovered') || text.includes('recovery') || text.includes('восстановление')) {
    return <TrendingUp className="h-8 w-8" />;
  }
  
  // Default fallback icon (standard activity icon)
  return <Activity className="h-8 w-8" />;
};

const parseActivityMetrics = (actionText: string) => {
  const parts: string[] = [];
  
  // Start with "ST" prefix
  parts.push("ST");
  
  // Duration (e.g., "15m 36s")
  const durationMatch = actionText.match(/(\d+)m\s*(\d+)s/);
  if (durationMatch) {
    parts.push(`${durationMatch[1]}m ${durationMatch[2]}s`);
  }
  
  // Calories (e.g., "173kcal")
  const caloriesMatch = actionText.match(/(\d+)kcal/);
  if (caloriesMatch) {
    parts.push(`${caloriesMatch[1]}kcal`);
  }
  
  // Strain (e.g., "Strain 7.2")
  const strainMatch = actionText.match(/([\d.]+)\s*strain/i);
  if (strainMatch) {
    parts.push(`Strain ${strainMatch[1]}`);
  }
  
  // Recovery (e.g., "85% recovery")
  const recoveryMatch = actionText.match(/recovered\s*(\d+)%/i);
  if (recoveryMatch) {
    parts.push(`${recoveryMatch[1]}% recovery`);
  }
  
  // Sleep (e.g., "7.5h sleep")
  const sleepMatch = actionText.match(/slept\s*([\d.]+)h/i);
  if (sleepMatch) {
    parts.push(`${sleepMatch[1]}h sleep`);
  }
  
  // If we only have "ST", add a generic activity description
  if (parts.length === 1) {
    if (actionText.toLowerCase().includes('тренировку')) {
      parts.push('завершил тренировку');
    } else if (actionText.toLowerCase().includes('спал')) {
      parts.push('спал');
    } else if (actionText.toLowerCase().includes('recovered')) {
      parts.push('восстановился');
    } else {
      parts.push('активность');
    }
  }
  
  return parts.join(' ');
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