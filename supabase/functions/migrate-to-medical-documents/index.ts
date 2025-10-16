import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action } = await req.json();

    if (action === 'migrate_inbody') {
      const result = await migrateInBodyData(supabase, user.id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'migrate_progress_photos') {
      const result = await migrateProgressPhotos(supabase, user.id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'migrate_all') {
      const inbodyResult = await migrateInBodyData(supabase, user.id);
      const photosResult = await migrateProgressPhotos(supabase, user.id);
      
      return new Response(JSON.stringify({
        inbody: inbodyResult,
        photos: photosResult,
        total_migrated: inbodyResult.migrated + photosResult.migrated
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function migrateInBodyData(supabase: any, userId: string) {
  console.log('Starting InBody migration for user:', userId);
  
  // Get all InBody uploads that haven't been migrated
  const { data: uploads, error: uploadsError } = await supabase
    .from('inbody_uploads')
    .select(`
      id,
      user_id,
      storage_path,
      file_name,
      file_size,
      uploaded_at,
      analysis_id,
      inbody_analyses(
        id,
        test_date,
        weight,
        percent_body_fat,
        skeletal_muscle_mass,
        parsed_data,
        ai_summary,
        ai_insights
      )
    `)
    .eq('user_id', userId)
    .is('migrated_to_document_id', null);

  if (uploadsError) {
    console.error('Error fetching uploads:', uploadsError);
    throw uploadsError;
  }

  let migratedCount = 0;
  const errors: any[] = [];

  for (const upload of uploads || []) {
    try {
      const oldPath = upload.storage_path;
      const fileName = upload.file_name || oldPath.split('/').pop();
      const newPath = `${userId}/inbody/${fileName}`;

      // Copy file from old bucket to new bucket
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('inbody-pdfs')
        .download(oldPath);

      if (downloadError) {
        console.error(`Error downloading file ${oldPath}:`, downloadError);
        errors.push({ upload_id: upload.id, error: downloadError.message });
        continue;
      }

      // Upload to new bucket
      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(newPath, fileData, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error(`Error uploading file ${newPath}:`, uploadError);
        errors.push({ upload_id: upload.id, error: uploadError.message });
        continue;
      }

      // Extract data from analysis if available
      const analysis = upload.inbody_analyses?.[0];
      const extractedData: any = {};
      
      if (analysis) {
        extractedData.weight = analysis.weight;
        extractedData.body_fat_percentage = analysis.percent_body_fat;
        extractedData.skeletal_muscle_mass = analysis.skeletal_muscle_mass;
        extractedData.parsed_data = analysis.parsed_data;
      }

      // Create medical document record
      const { data: medicalDoc, error: docError } = await supabase
        .from('medical_documents')
        .insert({
          user_id: userId,
          file_name: fileName,
          storage_path: newPath,
          document_type: 'inbody',
          file_size: upload.file_size,
          mime_type: 'application/pdf',
          document_date: analysis?.test_date || upload.uploaded_at?.split('T')[0],
          uploaded_at: upload.uploaded_at,
          ai_processed: !!analysis?.ai_summary,
          ai_summary: analysis?.ai_summary,
          ai_extracted_data: Object.keys(extractedData).length > 0 ? extractedData : null,
          tags: ['migrated', 'inbody']
        })
        .select()
        .single();

      if (docError) {
        console.error('Error creating medical document:', docError);
        errors.push({ upload_id: upload.id, error: docError.message });
        continue;
      }

      // Update old records with migration reference
      await supabase
        .from('inbody_uploads')
        .update({ migrated_to_document_id: medicalDoc.id })
        .eq('id', upload.id);

      if (analysis) {
        await supabase
          .from('inbody_analyses')
          .update({ migrated_to_document_id: medicalDoc.id })
          .eq('id', analysis.id);
      }

      migratedCount++;
      console.log(`Migrated InBody document: ${fileName}`);

    } catch (error) {
      console.error('Error migrating upload:', error);
      errors.push({ upload_id: upload.id, error: error.message });
    }
  }

  return {
    migrated: migratedCount,
    total: uploads?.length || 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function migrateProgressPhotos(supabase: any, userId: string) {
  console.log('Starting progress photos migration for user:', userId);
  
  // Get all body composition records with photos
  const { data: records, error: recordsError } = await supabase
    .from('body_composition')
    .select('*')
    .eq('user_id', userId)
    .or('photo_before_url.not.is.null,photo_after_url.not.is.null');

  if (recordsError) {
    console.error('Error fetching body composition:', recordsError);
    throw recordsError;
  }

  let migratedCount = 0;
  const errors: any[] = [];

  for (const record of records || []) {
    try {
      // Migrate "before" photo
      if (record.photo_before_url && !record.migrated_photo_before_id) {
        const beforeId = await migratePhoto(
          supabase,
          userId,
          record.photo_before_url,
          record.measurement_date,
          'before'
        );
        
        if (beforeId) {
          await supabase
            .from('body_composition')
            .update({ migrated_photo_before_id: beforeId })
            .eq('id', record.id);
          migratedCount++;
        }
      }

      // Migrate "after" photo
      if (record.photo_after_url && !record.migrated_photo_after_id) {
        const afterId = await migratePhoto(
          supabase,
          userId,
          record.photo_after_url,
          record.measurement_date,
          'after'
        );
        
        if (afterId) {
          await supabase
            .from('body_composition')
            .update({ migrated_photo_after_id: afterId })
            .eq('id', record.id);
          migratedCount++;
        }
      }

    } catch (error) {
      console.error('Error migrating photos for record:', error);
      errors.push({ record_id: record.id, error: error.message });
    }
  }

  return {
    migrated: migratedCount,
    total: (records || []).reduce((acc, r) => {
      return acc + (r.photo_before_url ? 1 : 0) + (r.photo_after_url ? 1 : 0);
    }, 0),
    errors: errors.length > 0 ? errors : undefined
  };
}

async function migratePhoto(
  supabase: any,
  userId: string,
  photoUrl: string,
  measurementDate: string,
  type: 'before' | 'after'
): Promise<string | null> {
  try {
    // Extract bucket and path from URL
    const urlParts = photoUrl.split('/storage/v1/object/public/');
    if (urlParts.length < 2) {
      console.error('Invalid photo URL:', photoUrl);
      return null;
    }

    const [bucket, ...pathParts] = urlParts[1].split('/');
    const oldPath = pathParts.join('/');

    // Download from old location
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(oldPath);

    if (downloadError) {
      console.error('Error downloading photo:', downloadError);
      return null;
    }

    // Generate new filename
    const extension = oldPath.split('.').pop() || 'jpg';
    const timestamp = new Date(measurementDate).getTime();
    const fileName = `${timestamp}_${type}.${extension}`;
    const newPath = `${userId}/progress_photo/${fileName}`;

    // Upload to new bucket
    const { error: uploadError } = await supabase.storage
      .from('medical-documents')
      .upload(newPath, fileData, {
        contentType: `image/${extension}`,
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading photo:', uploadError);
      return null;
    }

    // Create medical document record
    const { data: medicalDoc, error: docError } = await supabase
      .from('medical_documents')
      .insert({
        user_id: userId,
        file_name: fileName,
        storage_path: newPath,
        document_type: 'progress_photo',
        mime_type: `image/${extension}`,
        document_date: measurementDate,
        ai_processed: false,
        tags: ['migrated', 'progress', type]
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating medical document for photo:', docError);
      return null;
    }

    console.log(`Migrated progress photo: ${fileName}`);
    return medicalDoc.id;

  } catch (error) {
    console.error('Error in migratePhoto:', error);
    return null;
  }
}
