import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

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
  { value: "reps", unit: "reps" },
  { value: "time", unit: "seconds" },
  { value: "weight", unit: "kg" },
  { value: "distance", unit: "km" },
  { value: "body_fat", unit: "%" },
  { value: "muscle_mass", unit: "kg" },
];

export function ChallengeDisciplineSelector({ discipline, onChange }: ChallengeDisciplineSelectorProps) {
  const { t } = useTranslation('trainerDashboard');

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
        <Label>{t('discipline.exerciseName')}</Label>
        <Input
          value={discipline.discipline_name}
          onChange={(e) => onChange("discipline_name", e.target.value)}
          placeholder={t('discipline.exercisePlaceholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('discipline.type')}</Label>
          <Select value={discipline.discipline_type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISCIPLINE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {t(`disciplineTypes.${type.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{t('discipline.benchmark')}</Label>
          <Input
            type="number"
            value={discipline.benchmark_value || ""}
            onChange={(e) => onChange("benchmark_value", e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={t('discipline.benchmarkPlaceholder')}
          />
        </div>
      </div>

      <div>
        <Label>{t('discipline.unit')}</Label>
        <Input
          value={discipline.unit}
          onChange={(e) => onChange("unit", e.target.value)}
          placeholder={t('discipline.unitPlaceholder')}
        />
      </div>
    </div>
  );
}
