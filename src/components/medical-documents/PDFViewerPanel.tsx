import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from 'sonner';

// Set worker source for pdf.js from local npm package instead of CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PDFViewerPanelProps {
  documentId: string;
  storagePath: string;
}

export const PDFViewerPanel = ({ documentId, storagePath }: PDFViewerPanelProps) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    loadPDF();
  }, [storagePath]);

  useEffect(() => {
    if (pdfDoc && canvasRef) {
      renderPage(pageNum);
    }
  }, [pdfDoc, pageNum, scale, canvasRef]);

  const loadPDF = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      // Download PDF from storage
      const { data: fileData, error } = await supabase.storage
        .from('medical-documents')
        .download(storagePath);

      if (error || !fileData) {
        throw new Error('Не удалось загрузить PDF из хранилища');
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      setPdfDoc(pdf);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      setLoadError(error.message || 'Ошибка загрузки PDF');
      toast.error('Ошибка загрузки PDF');
      setIsLoading(false);
    }
  };

  const renderPage = async (num: number) => {
    if (!pdfDoc || !canvasRef) return;

    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      } as any).promise;
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handlePrevPage = () => setPageNum(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setPageNum(prev => Math.min(prev + 1, pdfDoc?.numPages || 1));

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Header Controls */}
      <div className="h-14 border-b border-green-500/30 flex items-center justify-between px-4 bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevPage}
            disabled={pageNum === 1}
            className="text-green-400 hover:bg-green-500/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-green-400 font-mono">
            Page {pageNum} / {pdfDoc?.numPages || 0}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextPage}
            disabled={pageNum === pdfDoc?.numPages}
            className="text-green-400 hover:bg-green-500/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="text-green-400 hover:bg-green-500/10"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-green-400 font-mono">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className="text-green-400 hover:bg-green-500/10"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto p-4 bg-neutral-900">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-green-400 mx-auto mb-2" />
              <p className="text-sm text-green-400">Загрузка документа...</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="mb-4 p-4 border border-red-500/50 rounded-lg bg-red-500/5">
                <p className="text-red-400 mb-2">❌ Ошибка загрузки PDF</p>
                <p className="text-sm text-muted-foreground">{loadError}</p>
              </div>
              <Button 
                onClick={loadPDF}
                className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
              >
                🔄 Попробовать снова
              </Button>
            </div>
          </div>
        ) : (
          <canvas
            ref={setCanvasRef}
            className="mx-auto shadow-[0_0_20px_rgba(34,197,94,0.2)] border border-green-500/30"
          />
        )}
      </div>
    </div>
  );
};
