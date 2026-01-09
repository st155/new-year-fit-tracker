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
import { useTranslation } from 'react-i18next';

type ExportFormat = 'csv' | 'pdf';
type DataType = 'goals' | 'measurements' | 'workouts' | 'body_composition';

export function ExportDataDialog() {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedData, setSelectedData] = useState<DataType[]>(['goals', 'measurements']);
  const [loading, setLoading] = useState(false);

  const dataTypes = [
    { id: 'goals' as DataType, labelKey: 'export.dataTypes.goals', icon: Table2 },
    { id: 'measurements' as DataType, labelKey: 'export.dataTypes.measurements', icon: Table2 },
    { id: 'workouts' as DataType, labelKey: 'export.dataTypes.workouts', icon: Table2 },
    { id: 'body_composition' as DataType, labelKey: 'export.dataTypes.bodyComposition', icon: Table2 },
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
          category: goal.is_personal ? t('export.categories.personal') : t('export.categories.challenge'),
          created: formatDateForExport(goal.created_at)
        };
      })
    );

    return {
      headers: [
        t('export.headers.goal'), 
        t('export.headers.type'), 
        t('export.headers.current'), 
        t('export.headers.target'), 
        t('export.headers.unit'), 
        t('export.headers.progress'), 
        t('export.headers.category'), 
        t('export.headers.created')
      ],
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
      headers: [
        t('export.headers.date'), 
        t('export.headers.metric'), 
        t('export.headers.value'), 
        t('export.headers.unit'), 
        t('export.headers.source'), 
        t('export.headers.verified')
      ],
      rows: measurements.map(m => [
        formatDateForExport(m.measurement_date),
        m.goals?.goal_name || '',
        formatNumberForExport(m.value),
        m.unit,
        m.source || 'manual',
        m.verified_by_trainer ? t('export.headers.yes') : t('export.headers.no')
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
      headers: [
        t('export.headers.date'), 
        t('export.headers.type'), 
        t('export.headers.durationMin'), 
        t('export.headers.calories'), 
        t('export.headers.distanceKm'), 
        t('export.headers.avgHr'), 
        t('export.headers.maxHr')
      ],
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
      headers: [
        t('export.headers.date'), 
        t('export.headers.weightKg'), 
        t('export.headers.fatPercent'), 
        t('export.headers.muscleKg'), 
        t('export.headers.method')
      ],
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
      toast.error(t('export.validation.selectData'));
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

      const titles: Record<DataType, string> = {
        goals: t('export.dataTypes.goals'),
        measurements: t('export.dataTypes.measurements'),
        workouts: t('export.dataTypes.workouts'),
        body_composition: t('export.dataTypes.bodyComposition'),
      };

      for (const dataType of selectedData) {
        const data = await dataFetchers[dataType]();
        if (!data) continue;

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${titles[dataType]}_${timestamp}`;

        if (format === 'csv') {
          exportToCSV(data, filename);
        } else {
          exportToPDF(data, filename, titles[dataType]);
        }
      }

      toast.success(t('export.success', { format: format.toUpperCase() }));
      setOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error(t('export.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          {t('export.buttonLabel')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('export.title')}</DialogTitle>
          <DialogDescription>
            {t('export.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Выбор формата */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('export.selectFormat')}</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer flex items-center gap-2">
                  <Table2 className="h-4 w-4" />
                  {t('export.formats.csv')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('export.formats.pdf')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Выбор типов данных */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('export.selectData')}</Label>
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
                    {t(type.labelKey)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('export.cancel')}
          </Button>
          <Button onClick={handleExport} disabled={loading || selectedData.length === 0}>
            {loading ? t('export.exporting') : t('export.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
