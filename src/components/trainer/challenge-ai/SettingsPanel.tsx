import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface SettingsPanelProps {
  duration: number;
  onDurationChange: (value: number) => void;
  difficulty: number;
  onDifficultyChange: (value: number) => void;
  disciplineCount: number;
  onDisciplineCountChange: (value: number) => void;
  maxDisciplines: number;
  targetAudience: number;
  onTargetAudienceChange: (value: number) => void;
}

const DIFFICULTY_LABELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
const AUDIENCE_LABELS = ['Recreational', 'Regular', 'Competitive', 'Professional'];

export const SettingsPanel = ({
  duration,
  onDurationChange,
  difficulty,
  onDifficultyChange,
  disciplineCount,
  onDisciplineCountChange,
  maxDisciplines,
  targetAudience,
  onTargetAudienceChange,
}: SettingsPanelProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Duration</Label>
          <span className="text-sm font-medium text-foreground">{duration} weeks</span>
        </div>
        <Slider
          value={[duration]}
          onValueChange={([value]) => onDurationChange(value)}
          min={2}
          max={24}
          step={1}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Base Difficulty</Label>
          <span className="text-sm font-medium text-foreground">
            {DIFFICULTY_LABELS[difficulty]}
          </span>
        </div>
        <Slider
          value={[difficulty]}
          onValueChange={([value]) => onDifficultyChange(value)}
          min={0}
          max={3}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {DIFFICULTY_LABELS.map((label, idx) => (
            <span key={idx}>{label}</span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Number of Disciplines</Label>
          <span className="text-sm font-medium text-foreground">{disciplineCount}</span>
        </div>
        <Slider
          value={[disciplineCount]}
          onValueChange={([value]) => onDisciplineCountChange(value)}
          min={1}
          max={maxDisciplines}
          step={1}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Target Audience</Label>
          <span className="text-sm font-medium text-foreground">
            {AUDIENCE_LABELS[targetAudience]}
          </span>
        </div>
        <Slider
          value={[targetAudience]}
          onValueChange={([value]) => onTargetAudienceChange(value)}
          min={0}
          max={3}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {AUDIENCE_LABELS.map((label, idx) => (
            <span key={idx}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
