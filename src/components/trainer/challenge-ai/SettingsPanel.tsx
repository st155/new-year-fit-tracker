import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface Discipline {
  name: string;
  type: string;
  unit: string;
}

interface SettingsPanelProps {
  duration: number;
  onDurationChange: (value: number) => void;
  difficulty: number;
  onDifficultyChange: (value: number) => void;
  selectedDisciplines: string[];
  onSelectedDisciplinesChange: (disciplines: string[]) => void;
  availableDisciplines: Discipline[];
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
  selectedDisciplines,
  onSelectedDisciplinesChange,
  availableDisciplines,
  targetAudience,
  onTargetAudienceChange,
}: SettingsPanelProps) => {
  const toggleDiscipline = (disciplineName: string) => {
    if (selectedDisciplines.includes(disciplineName)) {
      // Don't allow deselecting if only 1 discipline is selected
      if (selectedDisciplines.length > 1) {
        onSelectedDisciplinesChange(selectedDisciplines.filter(d => d !== disciplineName));
      }
    } else {
      onSelectedDisciplinesChange([...selectedDisciplines, disciplineName]);
    }
  };

  const selectAll = () => {
    onSelectedDisciplinesChange(availableDisciplines.map(d => d.name));
  };

  const selectTop4 = () => {
    onSelectedDisciplinesChange(availableDisciplines.slice(0, 4).map(d => d.name));
  };

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
            className="w-full [&_[role=slider]]:border-blue-500 [&_[role=slider]]:shadow-blue-500/20"
            style={{
              '--slider-gradient': 'linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234))'
            } as any}
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
            className="w-full [&_[role=slider]]:border-orange-500 [&_[role=slider]]:shadow-orange-500/20"
            style={{
              '--slider-gradient': 'linear-gradient(to right, rgb(34, 197, 94), rgb(251, 146, 60), rgb(239, 68, 68))'
            } as any}
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
            <Label className="text-sm font-semibold">Select Disciplines</Label>
            <div className="flex gap-2">
              <button 
                onClick={selectTop4}
                className="text-xs text-primary hover:underline"
              >
                Top 4
              </button>
              <span className="text-muted-foreground">|</span>
              <button 
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
            {availableDisciplines.map((discipline, idx) => (
              <div 
                key={discipline.name}
                className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                  selectedDisciplines.includes(discipline.name) 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  id={`discipline-${idx}`}
                  checked={selectedDisciplines.includes(discipline.name)}
                  onCheckedChange={() => toggleDiscipline(discipline.name)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label 
                  htmlFor={`discipline-${idx}`}
                  className="flex-1 text-sm font-medium cursor-pointer flex justify-between items-center"
                >
                  <span>{discipline.name}</span>
                  <span className="text-xs text-muted-foreground">{discipline.unit}</span>
                </label>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground text-center">
            {selectedDisciplines.length} of {availableDisciplines.length} selected
          </div>
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
            className="w-full [&_[role=slider]]:border-amber-500 [&_[role=slider]]:shadow-amber-500/20"
            style={{
              '--slider-gradient': 'linear-gradient(to right, rgb(56, 189, 248), rgb(251, 191, 36), rgb(234, 179, 8))'
            } as any}
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
