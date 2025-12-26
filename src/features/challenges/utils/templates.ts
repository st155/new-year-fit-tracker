/**
 * Challenge Templates
 * Create, export, import, and manage challenge templates
 */

import { supabase } from '@/integrations/supabase/client';

export interface ChallengeTemplate {
  id?: string;
  template_name: string;
  description?: string;
  category?: string;
  duration_weeks?: number;
  difficulty_level?: number;
  target_audience?: number;
  preset_id?: string;
  template_data: {
    titleTemplate: string;
    descriptionTemplate?: string;
    disciplines: Array<{
      discipline_name: string;
      discipline_type: string;
      benchmark_value: number | null;
      unit: string;
      benchmarkKey?: string;
      direction?: 'higher' | 'lower' | 'target';
      position?: number;
    }>;
  };
  is_public?: boolean;
  use_count?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create a template from an existing challenge
 */
export async function createTemplateFromChallenge(
  challengeId: string,
  templateName: string,
  description?: string,
  makePublic: boolean = false
): Promise<{ success: boolean; template?: ChallengeTemplate; error?: string }> {
  try {
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (challengeError) throw challengeError;

    const { data: disciplines, error: disciplinesError } = await supabase
      .from('challenge_disciplines')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('position', { ascending: true });

    if (disciplinesError) throw disciplinesError;

    const startDate = new Date(challenge.start_date);
    const endDate = new Date(challenge.end_date);
    const durationWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    const category = inferCategory(disciplines || []);

    const templateData: ChallengeTemplate = {
      template_name: templateName,
      description: description || challenge.description,
      category,
      duration_weeks: durationWeeks,
      template_data: {
        titleTemplate: challenge.title,
        descriptionTemplate: challenge.description,
        disciplines: (disciplines || []).map((d, idx) => ({
          discipline_name: d.discipline_name,
          discipline_type: d.discipline_type,
          benchmark_value: d.benchmark_value,
          unit: d.unit,
          position: d.position || idx,
        })),
      },
      is_public: makePublic,
    };

    const { data: savedTemplate, error: saveError } = await supabase
      .from('challenge_templates')
      .insert(templateData as any)
      .select()
      .single();

    if (saveError) throw saveError;

    return { success: true, template: savedTemplate as ChallengeTemplate };
  } catch (error: any) {
    console.error('Error creating template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export template as JSON file
 */
export function exportTemplateAsJSON(template: ChallengeTemplate): void {
  const exportData = {
    ...template,
    exported_at: new Date().toISOString(),
    version: '1.0',
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.template_name.replace(/\s+/g, '_')}_template.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Import template from JSON file
 */
export async function importTemplateFromJSON(
  file: File
): Promise<{ success: boolean; template?: Partial<ChallengeTemplate>; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const template = JSON.parse(e.target?.result as string);
        
        if (!template.template_name || !template.template_data?.disciplines) {
          throw new Error('Invalid template format: missing required fields');
        }

        const cleanTemplate: Partial<ChallengeTemplate> = {
          template_name: template.template_name,
          description: template.description,
          category: template.category,
          duration_weeks: template.duration_weeks,
          difficulty_level: template.difficulty_level,
          target_audience: template.target_audience,
          preset_id: template.preset_id,
          template_data: template.template_data,
          is_public: false,
        };

        resolve({ success: true, template: cleanTemplate });
      } catch (error: any) {
        resolve({ success: false, error: error.message });
      }
    };
    
    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read file' });
    };
    
    reader.readAsText(file);
  });
}

/**
 * Save imported template to database
 */
export async function saveImportedTemplate(
  template: Partial<ChallengeTemplate>
): Promise<{ success: boolean; template?: ChallengeTemplate; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('challenge_templates')
      .insert(template as any)
      .select()
      .single();

    if (error) throw error;

    return { success: true, template: data as ChallengeTemplate };
  } catch (error: any) {
    console.error('Error saving template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch user's templates
 */
export async function fetchUserTemplates(userId: string): Promise<ChallengeTemplate[]> {
  const { data, error } = await supabase
    .from('challenge_templates')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ChallengeTemplate[];
}

/**
 * Fetch public templates
 */
export async function fetchPublicTemplates(): Promise<ChallengeTemplate[]> {
  const { data, error } = await supabase
    .from('challenge_templates')
    .select('*')
    .eq('is_public', true)
    .order('use_count', { ascending: false });

  if (error) throw error;
  return data as ChallengeTemplate[];
}

/**
 * Delete template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('challenge_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

/**
 * Update template
 */
export async function updateTemplate(
  templateId: string, 
  updates: Partial<ChallengeTemplate>
): Promise<ChallengeTemplate> {
  const { data, error } = await supabase
    .from('challenge_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data as ChallengeTemplate;
}

/**
 * Increment template use count
 */
export async function incrementTemplateUseCount(templateId: string): Promise<void> {
  const { data: template } = await supabase
    .from('challenge_templates')
    .select('use_count')
    .eq('id', templateId)
    .single();

  if (template) {
    await supabase
      .from('challenge_templates')
      .update({ use_count: (template.use_count || 0) + 1 })
      .eq('id', templateId);
  }
}

/**
 * Helper to infer category from disciplines
 */
function inferCategory(disciplines: any[]): string {
  const names = disciplines.map(d => d.discipline_name.toLowerCase()).join(' ');
  
  if (names.includes('pull') || names.includes('push') || names.includes('squat') || 
      names.includes('bench') || names.includes('deadlift')) {
    return 'Fitness & Strength';
  }
  
  if (names.includes('run') || names.includes('cardio') || names.includes('vo2') || 
      names.includes('distance')) {
    return 'Cardio & Endurance';
  }
  
  if (names.includes('sleep') || names.includes('hrv') || names.includes('resting') || 
      names.includes('recovery')) {
    return 'Recovery & Sleep';
  }
  
  if (names.includes('protein') || names.includes('water') || names.includes('vegetable')) {
    return 'Nutrition & Detox';
  }
  
  if (names.includes('stretch') || names.includes('flexibility') || names.includes('mobility')) {
    return 'Flexibility & Mobility';
  }
  
  return 'General';
}
