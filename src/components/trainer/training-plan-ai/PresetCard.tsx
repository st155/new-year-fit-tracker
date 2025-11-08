import { Card } from '@/components/ui/card';
import { TrainingPlanPreset } from '@/lib/training-plan-presets';
import { cn } from '@/lib/utils';

interface PresetCardProps {
  preset: TrainingPlanPreset;
  selected: boolean;
  onSelect: () => void;
}

export const PresetCard = ({ preset, selected, onSelect }: PresetCardProps) => {
  const Icon = preset.icon;

  return (
    <Card
      className={cn(
        'relative overflow-hidden cursor-pointer transition-all hover:scale-105',
        'border-2',
        selected ? 'border-primary shadow-lg' : 'border-border hover:border-primary/50'
      )}
      onClick={onSelect}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-10', preset.gradient)} />
      <div className="relative p-4 space-y-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg bg-gradient-to-br',
              preset.gradient,
              'text-white'
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{preset.name}</h3>
            <p className="text-xs text-muted-foreground">{preset.category}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{preset.description}</p>
        <div className="text-xs text-muted-foreground">
          {preset.weeklyWorkouts} workouts/week • {preset.defaultDuration} weeks
        </div>
      </div>
    </Card>
  );
};
