import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface SettingsPanelProps {
  duration: number;
  onDurationChange: (value: number) => void;
  difficulty: number;
  onDifficultyChange: (value: number) => void;
  maxWorkouts: number;
}

const difficultyLabels = ['Beginner', 'Regular', 'Advanced', 'Elite'];

export const SettingsPanel = ({
  duration,
  onDurationChange,
  difficulty,
  onDifficultyChange,
}: SettingsPanelProps) => {
  return (
    <Card className="p-4 space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Duration</Label>
          <span className="text-sm font-medium text-muted-foreground">{duration} weeks</span>
        </div>
        <Slider
          value={[duration]}
          onValueChange={([value]) => onDurationChange(value)}
          min={4}
          max={16}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Difficulty Level</Label>
          <span className="text-sm font-medium text-muted-foreground">
            {difficultyLabels[difficulty]}
          </span>
        </div>
        <Slider
          value={[difficulty]}
          onValueChange={([value]) => onDifficultyChange(value)}
          min={0}
          max={3}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Beginner</span>
          <span>Elite</span>
        </div>
      </div>
    </Card>
  );
};
