import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';

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
    <div className="space-y-4">
      <Card className="p-4 bg-card border-2 border-border/50">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold">Duration</Label>
            <span className="text-base font-bold text-primary">{duration} weeks</span>
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
      </Card>

      <Card className="p-4 bg-card border-2 border-border/50">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold">Base Difficulty</Label>
            <span className="text-base font-bold text-primary">
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
          <div className="flex justify-between text-sm text-foreground/70">
            {DIFFICULTY_LABELS.map((label, idx) => (
              <span 
                key={idx}
                className={idx === difficulty ? 'font-bold text-primary' : ''}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-card border-2 border-border/50">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold">Number of Disciplines</Label>
            <span className="text-base font-bold text-primary">{disciplineCount}</span>
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
      </Card>

      <Card className="p-4 bg-card border-2 border-border/50">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold">Target Audience</Label>
            <span className="text-base font-bold text-primary">
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
          <div className="flex justify-between text-sm text-foreground/70">
            {AUDIENCE_LABELS.map((label, idx) => (
              <span 
                key={idx}
                className={idx === targetAudience ? 'font-bold text-primary' : ''}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
