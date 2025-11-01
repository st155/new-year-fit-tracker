import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { generateClientReport, ClientReportData } from '@/lib/exporters/client-report-exporter';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ClientReportExportProps {
  client: {
    user_id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
  };
  goals: any[];
  healthData?: any[];
  whoopSummary?: any;
  ouraSummary?: any;
  unifiedMetrics?: any[];
}

export function ClientReportExport({
  client,
  goals,
  healthData = [],
  whoopSummary,
  ouraSummary,
  unifiedMetrics = [],
}: ClientReportExportProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const [sections, setSections] = useState({
    includeGoals: true,
    includeHealth: true,
    includeWhoop: !!whoopSummary,
    includeOura: !!ouraSummary,
    includeNotes: true,
  });

  const handleExport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: 'Ошибка',
        description: 'Выберите период для отчета',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Fetch trainer notes for the period
      const { data: notes, error: notesError } = await supabase
        .from('client_notes')
        .select('content, created_at')
        .eq('client_id', client.user_id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      // Filter unified metrics by date range
      const filteredMetrics = unifiedMetrics.filter((metric) => {
        const date = new Date(metric.measurement_date);
        return date >= dateRange.from! && date <= dateRange.to!;
      });

      // Prepare report data
      const reportData: ClientReportData = {
        client: {
          full_name: client.full_name,
          username: client.username,
          avatar_url: client.avatar_url,
        },
        period: {
          start: dateRange.from,
          end: dateRange.to,
        },
        goals: goals || [],
        healthMetrics: filteredMetrics || [],
        whoopSummary: sections.includeWhoop ? whoopSummary : undefined,
        ouraSummary: sections.includeOura ? ouraSummary : undefined,
        trainerNotes: sections.includeNotes ? notes || [] : undefined,
        sections,
      };

      // Generate PDF
      const pdfBytes = await generateClientReport(reportData);

      // Create filename
      const fileName = `${client.username}_report_${format(dateRange.from, 'yyyy-MM-dd')}_${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;

      // Download PDF
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();

      // Save report metadata
      if (user) {
        await supabase.from('trainer_reports').insert({
          trainer_id: user.id,
          client_id: client.user_id,
          report_type: 'custom',
          period_start: format(dateRange.from, 'yyyy-MM-dd'),
          period_end: format(dateRange.to, 'yyyy-MM-dd'),
          report_config: sections,
          file_name: fileName,
          file_size_bytes: pdfBytes.length,
          client_name: client.full_name,
          goals_count: goals.length,
          metrics_count: filteredMetrics.length,
        });
      }

      toast({
        title: 'Отчет сгенерирован',
        description: `PDF файл "${fileName}" успешно скачан`,
      });

      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сгенерировать отчет',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Экспорт в PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Экспорт отчета клиента</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range Picker */}
          <div className="space-y-2">
            <Label>Период</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'd MMM yyyy', { locale: ru })} -{' '}
                        {format(dateRange.to, 'd MMM yyyy', { locale: ru })}
                      </>
                    ) : (
                      format(dateRange.from, 'd MMM yyyy', { locale: ru })
                    )
                  ) : (
                    <span>Выберите период</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Sections Checkboxes */}
          <div className="space-y-3">
            <Label>Включить в отчет</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="goals"
                checked={sections.includeGoals}
                onCheckedChange={(checked) =>
                  setSections({ ...sections, includeGoals: !!checked })
                }
              />
              <Label htmlFor="goals" className="font-normal cursor-pointer">
                Цели и прогресс ({goals.length})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="health"
                checked={sections.includeHealth}
                onCheckedChange={(checked) =>
                  setSections({ ...sections, includeHealth: !!checked })
                }
              />
              <Label htmlFor="health" className="font-normal cursor-pointer">
                Метрики здоровья ({unifiedMetrics.length})
              </Label>
            </div>

            {whoopSummary && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="whoop"
                  checked={sections.includeWhoop}
                  onCheckedChange={(checked) =>
                    setSections({ ...sections, includeWhoop: !!checked })
                  }
                />
                <Label htmlFor="whoop" className="font-normal cursor-pointer">
                  Whoop данные
                </Label>
              </div>
            )}

            {ouraSummary && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="oura"
                  checked={sections.includeOura}
                  onCheckedChange={(checked) =>
                    setSections({ ...sections, includeOura: !!checked })
                  }
                />
                <Label htmlFor="oura" className="font-normal cursor-pointer">
                  Oura данные
                </Label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notes"
                checked={sections.includeNotes}
                onCheckedChange={(checked) =>
                  setSections({ ...sections, includeNotes: !!checked })
                }
              />
              <Label htmlFor="notes" className="font-normal cursor-pointer">
                Заметки тренера
              </Label>
            </div>
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Генерация PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Скачать PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
