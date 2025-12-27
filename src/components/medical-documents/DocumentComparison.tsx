import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { GitCompare, Loader2 } from "lucide-react";
import { documentsApi } from "@/lib/api";
import { Card } from "@/components/ui/card";

interface MedicalDocument {
  id: string;
  file_name: string;
  document_type: string;
  document_date?: string | null;
  ai_processed?: boolean;
}

interface DocumentComparisonProps {
  documents: MedicalDocument[];
}

export const DocumentComparison = ({ documents }: DocumentComparisonProps) => {
  const { t } = useTranslation('common');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const processedDocs = documents.filter(doc => doc.ai_processed);

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleCompare = async () => {
    if (selectedDocs.length < 2) {
      toast({
        title: t('errors.generic'),
        description: t('docComparison.selectMinTwo'),
        variant: "destructive"
      });
      return;
    }

    setIsComparing(true);
    setComparisonResult(null);

    try {
      const { data, error } = await documentsApi.compare(selectedDocs);

      if (error) throw error;

      setComparisonResult(data.analysis);
      toast({
        title: t('docComparison.comparisonComplete'),
        description: t('docComparison.aiAnalysisReady')
      });
    } catch (error: any) {
      console.error('Comparison error:', error);
      toast({
        title: t('docComparison.comparisonError'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsComparing(false);
    }
  };

  if (processedDocs.length < 2) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <GitCompare className="h-4 w-4" />
          {t('docComparison.compareDocuments')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('docComparison.title')}</DialogTitle>
          <DialogDescription>
            {t('docComparison.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Card className="p-4">
            <h3 className="font-medium mb-3">{t('docComparison.selectDocuments', { count: selectedDocs.length })}:</h3>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {processedDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => toggleDocSelection(doc.id)}
                    />
                    <span className="text-sm">
                      {doc.file_name} ({doc.document_type})
                      {doc.document_date && ` - ${new Date(doc.document_date).toLocaleDateString()}`}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          <Button 
            onClick={handleCompare}
            disabled={selectedDocs.length < 2 || isComparing}
            className="gap-2"
          >
            {isComparing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('docComparison.analyzing')}
              </>
            ) : (
              <>
                <GitCompare className="h-4 w-4" />
                {t('docComparison.compare')}
              </>
            )}
          </Button>

          {comparisonResult && (
            <Card className="p-4">
              <h3 className="font-medium mb-3">{t('docComparison.result')}:</h3>
              <ScrollArea className="h-96">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {comparisonResult}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
