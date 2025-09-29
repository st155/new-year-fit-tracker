import { Activity, Heart, Moon, Dumbbell, TrendingUp, Bike, Waves, Mountain, User, Footprints, Zap, PersonStanding } from "lucide-react";
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
  
  // Running activities (orange running person)
  if (text.includes('running') || text.includes('run') || text.includes('бег')) {
    return <Footprints className="h-8 w-8" />;
  }
  
  // Swimming activities (teal waves)
  if (text.includes('swimming') || text.includes('swim') || text.includes('плавание')) {
    return <Waves className="h-8 w-8" />;
  }
  
  // Cycling activities (blue bicycle)
  if (text.includes('cycling') || text.includes('bike') || text.includes('велосипед')) {
    return <Bike className="h-8 w-8" />;
  }
  
  // Weight lifting activities (red/orange person with weights)
  if (text.includes('weight') || text.includes('lifting') || text.includes('силовая') || text.includes('гантели')) {
    return <PersonStanding className="h-8 w-8" />;
  }
  
  // Strength training (barbell icon)
  if (text.includes('strength') || text.includes('barbell') || text.includes('штанга')) {
    return <Dumbbell className="h-8 w-8" />;
  }
  
  // Hiking/Walking activities (green hiking boot/mountain)
  if (text.includes('hiking') || text.includes('walk') || text.includes('поход') || text.includes('ходьба')) {
    return <Mountain className="h-8 w-8" />;
  }
  
  // Yoga/Meditation activities (blue person sitting)
  if (text.includes('yoga') || text.includes('meditation') || text.includes('йога') || text.includes('медитация')) {
    return <User className="h-8 w-8" />;
  }
  
  // Boxing/Martial arts (purple)
  if (text.includes('boxing') || text.includes('martial') || text.includes('бокс') || text.includes('единоборства')) {
    return <Zap className="h-8 w-8" />;
  }
  
  // Sleep activities (purple moon)
  if (text.includes('slept') || text.includes('sleep') || text.includes('сон') || text.includes('спал')) {
    return <Moon className="h-8 w-8" />;
  }
  
  // General workouts/training (activity line trending up)
  if (text.includes('workout') || text.includes('training') || text.includes('тренировку') || text.includes('strain') || text.includes('завершил')) {
    return <TrendingUp className="h-8 w-8" />;
  }
  
  // Recovery activities  
  if (text.includes('recovered') || text.includes('recovery') || text.includes('восстановление')) {
    return <Heart className="h-8 w-8" />;
  }
  
  // Default fallback icon (standard activity icon)
  return <Activity className="h-8 w-8" />;
};

const parseActivityMetrics = (actionText: string) => {
  const parts: string[] = [];
  
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
  
  // Strain (e.g., "7.2 strain")
  const strainMatch = actionText.match(/([\d.]+)\s*strain/i);
  if (strainMatch) {
    parts.push(`${strainMatch[1]} strain`);
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
  
  // Quality (quality percentage)
  const qualityMatch = actionText.match(/качество:\s*(\d+)%/i);
  if (qualityMatch) {
    parts.push(`${qualityMatch[1]}% quality`);
  }
  
  // If we have extracted metrics, join them with commas
  if (parts.length > 0) {
    return parts.join(', ');
  }
  
  // Fallback for activities without specific metrics
  return 'активность';
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