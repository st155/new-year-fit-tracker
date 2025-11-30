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

      // First, find all document IDs that have medical findings
      const { data: findingsData } = await supabase
        .from('medical_findings')
        .select('document_id')
        .eq('user_id', user.id);

      const docIdsWithFindings = [...new Set(findingsData?.map(f => f.document_id) || [])];

      // Build the OR condition including documents with findings
      let orCondition = `category.eq.imaging_report,file_name.ilike.%узи%,file_name.ilike.%мрт%,file_name.ilike.%кт%,file_name.ilike.%рентген%,file_name.ilike.%ultrasound%,file_name.ilike.%mri%,file_name.ilike.%ct scan%,file_name.ilike.%x-ray%,file_name.ilike.%органов%,file_name.ilike.%gastro%,file_name.ilike.%эндоскопия%,file_name.ilike.%endoscopy%,file_name.ilike.%колоноскопия%,file_name.ilike.%эхокг%`;
      
      // Add document IDs with findings to the OR condition
      if (docIdsWithFindings.length > 0) {
        orCondition += `,id.in.(${docIdsWithFindings.join(',')})`;
      }

      // Fetch imaging documents - expanded filter to catch misclassified documents
      const { data: documents, error: docError } = await supabase
        .from('medical_documents')
        .select('id, file_name, document_date, ai_summary, category')
        .eq('user_id', user.id)
        .or(orCondition)
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
