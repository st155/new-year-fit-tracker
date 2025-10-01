import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, FileText, Table2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { exportToCSV, exportToPDF, formatDateForExport, formatNumberForExport } from "@/lib/export-utils";

type ExportFormat = 'csv' | 'pdf';
type DataType = 'goals' | 'measurements' | 'workouts' | 'body_composition';

export function ExportDataDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedData, setSelectedData] = useState<DataType[]>(['goals', 'measurements']);
  const [loading, setLoading] = useState(false);

  const dataTypes = [
    { id: 'goals' as DataType, label: 'Цели и прогресс', icon: Table2 },
    { id: 'measurements' as DataType, label: 'Измерения', icon: Table2 },
    { id: 'workouts' as DataType, label: 'Тренировки', icon: Table2 },
    { id: 'body_composition' as DataType, label: 'Состав тела', icon: Table2 },
  ];

  const toggleDataType = (type: DataType) => {
    setSelectedData(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const fetchGoalsData = async () => {
    const { data: goals } = await supabase
      .from('goals')
      .select(`
        goal_name,
        goal_type,
        target_value,
        target_unit,
        created_at,
        is_personal
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!goals) return null;

    // Получаем текущие значения для каждой цели
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const { data: metrics } = await supabase
          .from('user_metrics')
          .select('id')
          .eq('user_id', user?.id)
          .ilike('metric_name', `%${goal.goal_name}%`)
          .limit(1);

        let currentValue = 0;
        if (metrics && metrics.length > 0) {
          const { data: values } = await supabase
            .from('metric_values')
            .select('value')
            .eq('metric_id', metrics[0].id)
            .order('measurement_date', { ascending: false })
            .limit(1);

          if (values && values.length > 0) {
            currentValue = Number(values[0].value);
          }
        }

        const progress = goal.target_value 
          ? ((currentValue / goal.target_value) * 100).toFixed(1)
          : '0';

        return {
          name: goal.goal_name,
          type: goal.goal_type,
          current: formatNumberForExport(currentValue),
          target: formatNumberForExport(goal.target_value),
          unit: goal.target_unit || '',
          progress: progress + '%',
          category: goal.is_personal ? 'Личная' : 'Челлендж',
          created: formatDateForExport(goal.created_at)
        };
      })
    );

    return {
      headers: ['Цель', 'Тип', 'Текущее', 'Целевое', 'Единица', 'Прогресс', 'Категория', 'Создана'],
      rows: goalsWithProgress.map(g => [
        g.name, g.type, g.current, g.target, g.unit, g.progress, g.category, g.created
      ])
    };
  };

  const fetchMeasurementsData = async () => {
    const { data: measurements } = await supabase
      .from('measurements')
      .select(`
        value,
        unit,
        measurement_date,
        source,
        verified_by_trainer,
        goals (goal_name)
      `)
      .eq('user_id', user?.id)
      .order('measurement_date', { ascending: false })
      .limit(100);

    if (!measurements) return null;

    return {
      headers: ['Дата', 'Метрика', 'Значение', 'Единица', 'Источник', 'Проверено'],
      rows: measurements.map(m => [
        formatDateForExport(m.measurement_date),
        m.goals?.goal_name || '',
        formatNumberForExport(m.value),
        m.unit,
        m.source || 'manual',
        m.verified_by_trainer ? 'Да' : 'Нет'
      ])
    };
  };

  const fetchWorkoutsData = async () => {
    const { data: workouts } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user?.id)
      .order('start_time', { ascending: false })
      .limit(100);

    if (!workouts) return null;

    return {
      headers: ['Дата', 'Тип', 'Длительность (мин)', 'Калории', 'Дистанция (км)', 'Ср. пульс', 'Макс. пульс'],
      rows: workouts.map(w => [
        formatDateForExport(w.start_time),
        w.workout_type,
        formatNumberForExport(w.duration_minutes, 0),
        formatNumberForExport(w.calories_burned, 0),
        formatNumberForExport(w.distance_km),
        formatNumberForExport(w.heart_rate_avg, 0),
        formatNumberForExport(w.heart_rate_max, 0)
      ])
    };
  };

  const fetchBodyCompositionData = async () => {
    const { data: bodyComp } = await supabase
      .from('body_composition')
      .select('*')
      .eq('user_id', user?.id)
      .order('measurement_date', { ascending: false })
      .limit(100);

    if (!bodyComp) return null;

    return {
      headers: ['Дата', 'Вес (кг)', 'Жир (%)', 'Мышцы (кг)', 'Метод'],
      rows: bodyComp.map(b => [
        formatDateForExport(b.measurement_date),
        formatNumberForExport(b.weight),
        formatNumberForExport(b.body_fat_percentage),
        formatNumberForExport(b.muscle_mass),
        b.measurement_method || ''
      ])
    };
  };

  const handleExport = async () => {
    if (selectedData.length === 0) {
      toast.error('Выберите данные для экспорта');
      return;
    }

    setLoading(true);
    try {
      const dataFetchers: Record<DataType, () => Promise<any>> = {
        goals: fetchGoalsData,
        measurements: fetchMeasurementsData,
        workouts: fetchWorkoutsData,
        body_composition: fetchBodyCompositionData,
      };

      for (const dataType of selectedData) {
        const data = await dataFetchers[dataType]();
        if (!data) continue;

        const titles: Record<DataType, string> = {
          goals: 'Цели и прогресс',
          measurements: 'Измерения',
          workouts: 'Тренировки',
          body_composition: 'Состав тела',
        };

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${titles[dataType]}_${timestamp}`;

        if (format === 'csv') {
          exportToCSV(data, filename);
        } else {
          exportToPDF(data, filename, titles[dataType]);
        }
      }

      toast.success(`Данные экспортированы в формате ${format.toUpperCase()}`);
      setOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Ошибка при экспорте данных');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Экспорт данных
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Экспорт данных</DialogTitle>
          <DialogDescription>
            Выберите тип данных и формат для экспорта
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Выбор формата */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Формат экспорта</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer flex items-center gap-2">
                  <Table2 className="h-4 w-4" />
                  CSV (Excel, Google Sheets)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  PDF (печать в PDF)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Выбор типов данных */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Данные для экспорта</Label>
            <div className="space-y-3">
              {dataTypes.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.id}
                    checked={selectedData.includes(type.id)}
                    onCheckedChange={() => toggleDataType(type.id)}
                  />
                  <Label 
                    htmlFor={type.id} 
                    className="font-normal cursor-pointer flex items-center gap-2"
                  >
                    <type.icon className="h-4 w-4 text-muted-foreground" />
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleExport} disabled={loading || selectedData.length === 0}>
            {loading ? 'Экспорт...' : 'Экспортировать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
