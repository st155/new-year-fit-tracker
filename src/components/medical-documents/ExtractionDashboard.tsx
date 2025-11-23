import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BiomarkerRow } from './BiomarkerRow';
import { FindingCard } from './FindingCard';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

interface ExtractionDashboardProps {
  documentId: string;
  category: string;
}

export const ExtractionDashboard = ({ documentId, category }: ExtractionDashboardProps) => {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch lab results for blood/urine
  const { data: labResults, isLoading: labLoading } = useQuery({
    queryKey: ['lab-results', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_test_results')
        .select('*, biomarker_master(*)')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: category === 'lab_blood' || category === 'lab_urine',
  });

  // Fetch imaging findings
  const { data: findings, isLoading: findingsLoading } = useQuery({
    queryKey: ['medical-findings', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_findings')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: category === 'imaging_report',
  });

  // Fetch document for AI summary
  const { data: document } = useQuery({
    queryKey: ['document-summary', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_documents')
        .select('ai_summary, processing_status')
        .eq('id', documentId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('parse-lab-report', {
        body: { documentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-results', documentId] });
      queryClient.invalidateQueries({ queryKey: ['medical-findings', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document-summary', documentId] });
      toast.success('Document reprocessed successfully');
      setIsProcessing(false);
    },
    onError: (error: any) => {
      toast.error('Failed to reprocess document: ' + error.message);
      setIsProcessing(false);
    },
  });

  if (labLoading || findingsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // LAB BLOOD/URINE VIEW
  if (category === 'lab_blood' || category === 'lab_urine') {
    const verifiedResults = labResults?.filter(r => r.biomarker_id !== null) || [];
    const unmatchedResults = labResults?.filter(r => r.biomarker_id === null) || [];
    const totalCount = labResults?.length || 0;
    const matchedCount = verifiedResults.length;
    const unmatchedCount = unmatchedResults.length;

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Stats */}
        <div className="p-4 border-b border-blue-500/30 bg-neutral-900/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-blue-400">Extraction Dashboard</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => reprocessMutation.mutate()}
              disabled={isProcessing || document?.processing_status === 'processing'}
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              Reprocess
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-blue-500/5 border-blue-500/30">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-400">{totalCount}</div>
                <div className="text-xs text-muted-foreground">Извлечено</div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/5 border-green-500/30">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-400">{matchedCount}</div>
                <div className="text-xs text-muted-foreground">
                  Сопоставлено ({totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0}%)
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-500/5 border-red-500/30">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-400">{unmatchedCount}</div>
                <div className="text-xs text-muted-foreground">Требуют проверки</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Verified Zone */}
          {verifiedResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-green-400 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                VERIFIED BIOMARKERS ({matchedCount})
              </h3>
              <div className="space-y-2">
                {verifiedResults.map((result: any) => (
                  <BiomarkerRow
                    key={result.id}
                    result={result}
                    status="verified"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Unmatched Zone */}
          {unmatchedResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-red-400 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                UNMATCHED BIOMARKERS ({unmatchedCount})
              </h3>
              <div className="space-y-2">
                {unmatchedResults.map((result: any) => (
                  <BiomarkerRow
                    key={result.id}
                    result={result}
                    status="unmatched"
                    onResolve={() => {
                      toast.info('Biomarker mapping dialog coming soon');
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {totalCount === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No results extracted yet. Click Reprocess to analyze this document.
            </div>
          )}
        </div>
      </div>
    );
  }

  // IMAGING REPORT VIEW
  if (category === 'imaging_report') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-blue-500/30 bg-neutral-900/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-blue-400">Imaging Report Analysis</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => reprocessMutation.mutate()}
              disabled={isProcessing}
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              Reprocess
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* AI Summary Card */}
          {document?.ai_summary && (
            <Card className="bg-neutral-900 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  🤖 AI Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/80 leading-relaxed">{document.ai_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Key Findings List */}
          {findings && findings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">📋 Key Findings</h3>
              {findings.map((finding: any) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          )}

          {(!findings || findings.length === 0) && !document?.ai_summary && (
            <div className="text-center py-12 text-muted-foreground">
              No findings extracted yet. Click Reprocess to analyze this imaging report.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Unsupported document category: {category}
    </div>
  );
};
