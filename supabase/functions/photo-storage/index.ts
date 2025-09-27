import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'GET') {
      // Get user's storage usage stats
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      
      if (userError || !user) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }

      // Get storage statistics
      const { data: objects, error: storageError } = await supabase.storage
        .from('progress-photos')
        .list(`${user.id}/`)

      if (storageError) {
        console.error('Storage error:', storageError)
        return new Response(JSON.stringify({ error: storageError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const totalSize = objects?.reduce((sum, obj) => sum + (obj.metadata?.size || 0), 0) || 0
      const fileCount = objects?.length || 0

      return new Response(JSON.stringify({
        success: true,
        data: {
          totalFiles: fileCount,
          totalSize: totalSize,
          formattedSize: formatBytes(totalSize)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      // Handle file upload
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      
      if (userError || !user) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }

      const formData = await req.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return new Response(JSON.stringify({ error: 'Only image files are allowed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'File size must be less than 5MB' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('progress-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(filePath)

      return new Response(JSON.stringify({
        success: true,
        data: {
          path: data.path,
          publicUrl: urlData.publicUrl
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })

  } catch (error: any) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}