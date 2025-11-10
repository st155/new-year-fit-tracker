import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Exercise {
  name: string;
  label: string;
}

interface NumberInputFormProps {
  exercises: Exercise[];
  onSubmit: (values: Record<string, number>) => void;
}

export function NumberInputForm({ exercises, onSubmit }: NumberInputFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const result: Record<string, number> = {};
    Object.entries(values).forEach(([key, value]) => {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 0) {
        result[key] = num;
      }
    });
    onSubmit(result);
  };

  const handleSkip = () => {
    onSubmit({});
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      {exercises.map((exercise) => (
        <div key={exercise.name} className="space-y-2">
          <Label htmlFor={exercise.name} className="text-sm font-medium">
            {exercise.label}
          </Label>
          <div className="relative">
            <Input
              id={exercise.name}
              type="number"
              placeholder="0"
              value={values[exercise.name] || ''}
              onChange={(e) => handleChange(exercise.name, e.target.value)}
              className="pr-12 bg-background/50 backdrop-blur-sm border-border"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              кг
            </span>
          </div>
        </div>
      ))}

      <div className="flex gap-2 mt-2">
        <Button
          onClick={handleSkip}
          variant="outline"
          className="flex-1"
        >
          Пропустить
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-primary hover:from-cyan-600 hover:to-primary/90"
        >
          Продолжить
        </Button>
      </div>
    </div>
  );
}
