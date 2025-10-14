import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Trash2, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { InBodyDetailView } from "./InBodyDetailView";
import "../../index-inbody-styles.css";

interface InBodyAnalysis {
  id: string;
  test_date: string;
  weight: number | null;
  skeletal_muscle_mass: number | null;
  percent_body_fat: number | null;
  body_fat_mass: number | null;
  visceral_fat_area: number | null;
  bmi: number | null;
  bmr: number | null;
  total_body_water: number | null;
  protein: number | null;
  minerals: number | null;
  right_arm_percent: number | null;
  left_arm_percent: number | null;
  trunk_percent: number | null;
  right_leg_percent: number | null;
  left_leg_percent: number | null;
  pdf_url?: string;
}

export const InBodyHistory = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<InBodyAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<InBodyAnalysis | null>(null);

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
      toast.error('Failed to load analysis history');
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

      toast.success('Analysis deleted');
      fetchAnalyses();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast.error('Failed to delete analysis');
    }
  };

  const getChange = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null;
    const change = current - previous;
    return {
      value: change,
      trend: Math.abs(change) < 0.01 ? 'stable' : change > 0 ? 'up' : 'down'
    };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
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
            No InBody analyses uploaded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyses.map((analysis, index) => {
          const previousAnalysis = analyses[index + 1];
          const weightChange = getChange(analysis.weight, previousAnalysis?.weight ?? null);
          const bfChange = getChange(analysis.percent_body_fat, previousAnalysis?.percent_body_fat ?? null);

          return (
            <div
              key={analysis.id}
              className="inbody-card p-4 cursor-pointer hover:scale-105 transition-transform stagger-item"
              onClick={() => setSelectedAnalysis(analysis)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {format(new Date(analysis.test_date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    InBody Scan #{analyses.length - index}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAnalysis(analysis);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {analysis.pdf_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(analysis.pdf_url, '_blank');
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete analysis?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The analysis will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(analysis.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="space-y-3">
                {analysis.weight && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Weight</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold metric-glow">
                        {analysis.weight.toFixed(1)} kg
                      </span>
                      {weightChange && weightChange.trend !== 'stable' && (
                        <span className={weightChange.trend === 'down' ? 'text-green-400' : 'text-red-400'}>
                          {weightChange.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {analysis.skeletal_muscle_mass && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Muscle</span>
                    <span className="text-sm font-semibold">
                      {analysis.skeletal_muscle_mass.toFixed(1)} kg
                    </span>
                  </div>
                )}

                {analysis.percent_body_fat && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Body Fat</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {analysis.percent_body_fat.toFixed(1)}%
                      </span>
                      {bfChange && bfChange.trend !== 'stable' && (
                        <span className={bfChange.trend === 'down' ? 'text-green-400' : 'text-red-400'}>
                          {bfChange.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {analysis.bmi && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">BMI</span>
                    <span className="text-sm font-semibold">
                      {analysis.bmi.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedAnalysis} onOpenChange={() => setSelectedAnalysis(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0 bg-slate-950 border-purple-500/20">
          {selectedAnalysis && (
            <InBodyDetailView
              analysis={selectedAnalysis}
              previousAnalysis={analyses[analyses.findIndex(a => a.id === selectedAnalysis.id) + 1]}
              onClose={() => setSelectedAnalysis(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
