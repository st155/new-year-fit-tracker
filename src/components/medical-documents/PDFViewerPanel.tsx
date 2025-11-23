import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from 'sonner';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerPanelProps {
  documentId: string;
  storagePath: string;
}

export const PDFViewerPanel = ({ documentId, storagePath }: PDFViewerPanelProps) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
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
      
      // Download PDF from storage
      const { data: fileData, error } = await supabase.storage
        .from('medical-documents')
        .download(storagePath);

      if (error || !fileData) {
        toast.error('Failed to load PDF');
        console.error('PDF download error:', error);
        return;
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      setPdfDoc(pdf);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Error loading PDF');
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
            <Loader2 className="h-8 w-8 animate-spin text-green-400" />
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
