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

  // Always start with "ST" prefix
  parts.push("ST");

  const text = actionText.toLowerCase();

  // Duration variants
  // 1) 1h 23m
  const durHMM = actionText.match(/(\d+)h\s*(\d+)m/i);
  if (durHMM) {
    parts.push(`${durHMM[1]}h ${durHMM[2]}m`);
  }
  // 2) 15m 36s
  const durMS = actionText.match(/(\d+)m\s*(\d+)s/i);
  if (!durHMM && durMS) {
    parts.push(`${durMS[1]}m ${durMS[2]}s`);
  }
  // 3) 75m
  const durM = actionText.match(/(?:^|\s)(\d+)m(?:\s|$)/i);
  if (!durHMM && !durMS && durM) {
    parts.push(`${durM[1]}m`);
  }

  // Calories (accept optional space)
  const caloriesMatch = actionText.match(/(\d+)\s*kcal/i);
  if (caloriesMatch) {
    parts.push(`${caloriesMatch[1]}kcal`);
  }

  // Strain (support both "7.8 strain" and "strain 7.8")
  const strainAfter = actionText.match(/strain\s*([\d.]+)/i);
  const strainBefore = actionText.match(/([\d.]+)\s*strain/i);
  const strainVal = strainAfter?.[1] ?? strainBefore?.[1];
  if (strainVal) {
    parts.push(`Strain ${strainVal}`);
  }

  // Recovery (support both orders)
  const recoveryAfter = actionText.match(/recovery\s*(\d+)%/i);
  const recoveryBefore = actionText.match(/(\d+)%\s*recovery/i);
  const recovered = actionText.match(/recovered\s*(\d+)%/i);
  const recoveryVal = recoveryAfter?.[1] ?? recoveryBefore?.[1] ?? recovered?.[1];
  if (recoveryVal) {
    parts.push(`Recovery ${recoveryVal}%`);
  }

  // Sleep duration (e.g., "slept 7.5h" or "slept 7h 30m")
  const sleptHM = actionText.match(/slept\s*(\d+)h\s*(\d+)m/i);
  const sleptH = actionText.match(/slept\s*([\d.]+)h/i);
  if (sleptHM) {
    parts.push(`${sleptHM[1]}h ${sleptHM[2]}m`);
  } else if (sleptH) {
    parts.push(`${sleptH[1]}h`);
  }

  // Quality (English and Russian labels)
  const qualityEn = actionText.match(/quality[:\s]*?(\d+)%/i);
  const qualityRu = actionText.match(/качество[:\s]*?(\d+)%/i);
  const qualityVal = qualityEn?.[1] ?? qualityRu?.[1];
  if (qualityVal) {
    parts.push(`${qualityVal}% quality`);
  }

  // If we have more than just "ST", join with commas; else fallback
  if (parts.length > 1) {
    return parts.join(', ');
  }
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