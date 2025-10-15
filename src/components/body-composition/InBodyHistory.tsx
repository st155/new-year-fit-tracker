import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Trash2, Eye, TrendingUp, TrendingDown, ScanLine, Loader2, RefreshCw, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface InBodyUpload {
  id: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  uploaded_at: string;
  status: 'uploaded' | 'processing' | 'analyzed' | 'failed';
  analysis_id: string | null;
  error_message: string | null;
}

export const InBodyHistory = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<InBodyAnalysis[]>([]);
  const [uploads, setUploads] = useState<InBodyUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<InBodyAnalysis | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [analysesRes, uploadsRes] = await Promise.all([
        supabase
          .from('inbody_analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('test_date', { ascending: false }),
        supabase
          .from('inbody_uploads')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['uploaded', 'failed'])
          .order('uploaded_at', { ascending: false })
      ]);

      if (analysesRes.error) throw analysesRes.error;
      if (uploadsRes.error) throw uploadsRes.error;

      setAnalyses(analysesRes.data || []);
      setUploads((uploadsRes.data || []) as InBodyUpload[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const convertPdfToImage = async (pdfBlob: Blob): Promise<Blob> => {
    // Lazy load PDF.js to avoid React initialization conflicts
    const pdfjs = await import('pdfjs-dist');
    
    // Configure worker on first use
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    }
    
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const scale = 2.0; // High quality
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context unavailable');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // @ts-ignore - PDF.js types can be inconsistent
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create image blob'));
      }, 'image/jpeg', 0.85);
    });
  };

  const handleAnalyze = async (uploadId: string, storagePath: string) => {
    setProcessingIds(prev => new Set(prev).add(uploadId));
    
    try {
      await supabase
        .from('inbody_uploads')
        .update({ status: 'processing' })
        .eq('id', uploadId);

      toast.info('Конвертация PDF в изображение...');

      // Download PDF from storage
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from('inbody-pdfs')
        .download(storagePath);

      if (downloadError) throw downloadError;
      if (!pdfData) throw new Error('PDF not found');

      // Convert PDF to image
      const imageBlob = await convertPdfToImage(pdfData);

      // Upload image to storage
      const imagePath = `${user!.id}/${Date.now()}_inbody.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('inbody-images')
        .upload(imagePath, imageBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Update upload record with image path
      await supabase
        .from('inbody_uploads')
        .update({ image_path: imagePath })
        .eq('id', uploadId);

      toast.info('Анализ изображения с помощью AI...');

      // Call edge function with image path
      const { data, error } = await supabase.functions.invoke('inbody-ingest', {
        body: { 
          imagePath: imagePath,
          uploadId: uploadId
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Анализ успешно завершен');
      fetchData();
    } catch (error: any) {
      console.error('Error analyzing:', error);
      toast.error(error.message || 'Ошибка анализа');
      
      await supabase
        .from('inbody_uploads')
        .update({ 
          status: 'failed',
          error_message: error.message 
        })
        .eq('id', uploadId);
      
      fetchData();
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadId);
        return newSet;
      });
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inbody_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Analysis deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast.error('Failed to delete analysis');
    }
  };

  const handleDeleteUpload = async (id: string, storagePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('inbody-pdfs')
        .remove([storagePath]);

      if (storageError) console.error('Storage delete error:', storageError);

      const { error: dbError } = await supabase
        .from('inbody_uploads')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
      toast.success('PDF удален');
      fetchData();
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast.error('Ошибка удаления');
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

  if (analyses.length === 0 && uploads.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No InBody data yet. Upload a PDF to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Pending uploads */}
        {uploads.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ожидают распознавания ({uploads.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploads.map((upload) => {
                const isProcessing = processingIds.has(upload.id);
                const isFailed = upload.status === 'failed';
                
                return (
                  <Card key={upload.id} className={`${isFailed ? 'border-destructive/50' : 'border-amber-500/50'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge variant={isFailed ? 'destructive' : 'secondary'} className="mb-2">
                            {isFailed ? '❌ Ошибка' : '📁 Не распознан'}
                          </Badge>
                          <CardTitle className="text-sm font-medium truncate">
                            {upload.file_name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(upload.file_size / (1024 * 1024)).toFixed(1)} MB • {format(new Date(upload.uploaded_at), 'dd.MM.yyyy')}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить PDF?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Файл будет удален без возможности восстановления
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUpload(upload.id, upload.storage_path)}>
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isFailed && upload.error_message && (
                        <p className="text-xs text-destructive mb-3">{upload.error_message}</p>
                      )}
                      <Button
                        onClick={() => handleAnalyze(upload.id, upload.storage_path)}
                        disabled={isProcessing}
                        className="w-full"
                        variant={isFailed ? 'outline' : 'default'}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Анализируем...
                          </>
                        ) : isFailed ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Попробовать снова
                          </>
                        ) : (
                          <>
                            <ScanLine className="mr-2 h-4 w-4" />
                            Распознать
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Analyzed results */}
        {analyses.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Распознанные анализы ({analyses.length})
            </h3>
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
                            <Download className="h-4 w-4" />
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
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAnalysis(analysis.id)}>
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
          </div>
        )}
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