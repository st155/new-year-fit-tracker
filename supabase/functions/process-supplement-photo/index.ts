import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      throw new Error('No image provided');
    }

    console.log('[PROCESS-PHOTO] Starting AI photo processing...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Gemini 2.5 Flash Image Preview for photo processing
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Clean up this supplement bottle photo professionally:

1. Remove the background completely - make it pure white (#FFFFFF)
2. Straighten the bottle to be perfectly vertical
3. Correct any perspective distortion so the bottle looks straight-on
4. Center the bottle in the frame
5. Keep the label text sharp and readable
6. Maintain accurate colors of the product and label

Output a clean, professional product image suitable for e-commerce display.`
            },
            { 
              type: "image_url", 
              image_url: { 
                url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` 
              } 
            }
          ]
        }],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PROCESS-PHOTO] Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[PROCESS-PHOTO] Response received:', data.choices?.[0]?.finish_reason);

    // Extract processed image from response
    const processedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!processedImage) {
      throw new Error('No processed image in response');
    }

    console.log('[PROCESS-PHOTO] Successfully processed photo');

    return new Response(
      JSON.stringify({ 
        success: true,
        processedImage,
        message: 'Photo processed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[PROCESS-PHOTO] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
