import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Discipline {
  discipline_name: string;
  discipline_type: string;
  benchmark_value: number | null;
  unit: string;
}

interface ChallengeDisciplineSelectorProps {
  discipline: Discipline;
  onChange: (field: keyof Discipline, value: any) => void;
}

const DISCIPLINE_TYPES = [
  { value: "reps", label: "Повторения", unit: "reps" },
  { value: "time", label: "Время", unit: "seconds" },
  { value: "weight", label: "Вес", unit: "kg" },
  { value: "distance", label: "Дистанция", unit: "km" },
  { value: "body_fat", label: "% жира", unit: "%" },
  { value: "muscle_mass", label: "Мышечная масса", unit: "kg" },
];

export function ChallengeDisciplineSelector({ discipline, onChange }: ChallengeDisciplineSelectorProps) {
  const handleTypeChange = (type: string) => {
    const selectedType = DISCIPLINE_TYPES.find(t => t.value === type);
    onChange("discipline_type", type);
    if (selectedType) {
      onChange("unit", selectedType.unit);
    }
  };

  return (
    <div className="grid gap-3">
      <div>
        <Label>Название упражнения</Label>
        <Input
          value={discipline.discipline_name}
          onChange={(e) => onChange("discipline_name", e.target.value)}
          placeholder="Например: Подтягивания"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Тип</Label>
          <Select value={discipline.discipline_type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISCIPLINE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Бенчмарк (опционально)</Label>
          <Input
            type="number"
            value={discipline.benchmark_value || ""}
            onChange={(e) => onChange("benchmark_value", e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Целевое значение"
          />
        </div>
      </div>

      <div>
        <Label>Единицы измерения</Label>
        <Input
          value={discipline.unit}
          onChange={(e) => onChange("unit", e.target.value)}
          placeholder="kg, reps, seconds..."
        />
      </div>
    </div>
  );
}
