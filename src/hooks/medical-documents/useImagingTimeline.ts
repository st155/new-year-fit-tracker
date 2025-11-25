import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ImagingDocument {
  id: string;
  file_name: string;
  document_date: string;
  ai_summary: string;
  category: string;
  findings: Array<{
    body_part: string;
    finding_text: string;
    severity: string;
    tags: string[];
  }>;
}

export function useImagingTimeline() {
  return useQuery({
    queryKey: ['imaging-timeline'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch imaging documents
      const { data: documents, error: docError } = await supabase
        .from('medical_documents')
        .select('id, file_name, document_date, ai_summary, category')
        .eq('user_id', user.id)
        .eq('category', 'imaging_report')
        .order('document_date', { ascending: false });

      if (docError) throw docError;

      // Fetch findings for each document
      const enrichedDocs: ImagingDocument[] = [];
      for (const doc of documents || []) {
        const { data: findings } = await supabase
          .from('medical_findings')
          .select('body_part, finding_text, severity, tags')
          .eq('document_id', doc.id);

        enrichedDocs.push({
          ...doc,
          findings: findings || [],
        });
      }

      return enrichedDocs;
    },
  });
}
