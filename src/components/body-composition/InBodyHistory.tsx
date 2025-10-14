import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, TrendingDown, TrendingUp, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InBodyAnalysis {
  id: string;
  test_date: string;
  weight?: number;
  skeletal_muscle_mass?: number;
  percent_body_fat?: number;
  body_fat_mass?: number;
  visceral_fat_area?: number;
  bmi?: number;
  bmr?: number;
  pdf_url?: string;
}

export const InBodyHistory = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<InBodyAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalyses = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inbody_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching InBody analyses:', error);
      toast.error('Не удалось загрузить историю анализов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inbody_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Анализ удален');
      fetchAnalyses();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast.error('Не удалось удалить анализ');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Пока нет загруженных InBody анализов
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {analyses.map((analysis) => (
        <Card key={analysis.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {format(new Date(analysis.test_date), 'dd MMMM yyyy, HH:mm', { locale: ru })}
              </CardTitle>
              <div className="flex gap-2">
                {analysis.pdf_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(analysis.pdf_url, '_blank')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить анализ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Это действие нельзя отменить. Анализ будет удален навсегда.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(analysis.id)}>
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {analysis.weight && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Вес</p>
                  <p className="text-2xl font-bold">{analysis.weight.toFixed(1)} кг</p>
                </div>
              )}
              {analysis.skeletal_muscle_mass && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Мышечная масса</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    {analysis.skeletal_muscle_mass.toFixed(1)} кг
                  </p>
                </div>
              )}
              {analysis.percent_body_fat && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">% жира</p>
                  <p className="text-2xl font-bold">{analysis.percent_body_fat.toFixed(1)}%</p>
                </div>
              )}
              {analysis.bmi && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">BMI</p>
                  <p className="text-2xl font-bold">{analysis.bmi.toFixed(1)}</p>
                </div>
              )}
              {analysis.visceral_fat_area && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Висцеральный жир</p>
                  <p className="text-xl font-semibold">{analysis.visceral_fat_area.toFixed(0)} см²</p>
                </div>
              )}
              {analysis.bmr && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">BMR</p>
                  <p className="text-xl font-semibold">{analysis.bmr} ккал</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
