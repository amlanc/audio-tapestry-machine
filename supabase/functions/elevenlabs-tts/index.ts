
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    // Get request data
    const { text, voiceId, model } = await req.json();

    if (!text || !text.trim()) {
      throw new Error('Text is required for text-to-speech conversion');
    }

    console.log(`Generating speech for text: "${text.substring(0, 50)}..."`);
    console.log(`Using voice ID: ${voiceId || 'pNInz6obpgDQGcFmaJgB'}`); // Default to "Adam"

    // Set default model if not provided
    const ttsModel = model || 'eleven_multilingual_v2';
    console.log(`Using model: ${ttsModel}`);

    // Call ElevenLabs API
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || 'pNInz6obpgDQGcFmaJgB'}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: ttsModel,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          }
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API error: ${ttsResponse.status} ${ttsResponse.statusText}`);
    }

    // Get the audio content
    const audioBuffer = await ttsResponse.arrayBuffer();
    
    // Create a Blob URL from the audio buffer
    const audioBase64 = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    // Return the successful response with the base64 audio content
    return new Response(
      JSON.stringify({ 
        success: true, 
        audioBase64: audioBase64,
        format: 'mp3',
        message: 'Successfully generated speech'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error("Error generating speech:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred during speech generation' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
