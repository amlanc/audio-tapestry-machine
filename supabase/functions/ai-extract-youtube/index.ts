
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import OpenAI from "openai";

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
    const { youtubeUrl } = await req.json();

    if (!youtubeUrl) {
      throw new Error('YouTube URL is required');
    }

    // Initialize OpenAI client
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey
    });

    console.log("Analyzing YouTube URL:", youtubeUrl);
    
    // Use the gpt-4o-mini model for analysis
    const analysis = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You're a helper that validates YouTube URLs and extracts information. Return a JSON object with videoId, title, and isValid fields."
        },
        {
          role: "user",
          content: `Extract information from this YouTube URL: ${youtubeUrl}. Return a JSON with videoId, title, and isValid fields.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysisResult = JSON.parse(analysis.choices[0].message.content);
    console.log("OpenAI analysis result:", analysisResult);

    if (!analysisResult.isValid) {
      throw new Error('Invalid or unsupported YouTube URL');
    }

    const videoId = analysisResult.videoId;
    const videoTitle = analysisResult.title || `YouTube Video ${videoId}`;
    
    // Generate random waveform for visualization (1-3 minute duration)
    const duration = Math.floor(Math.random() * 120) + 60;
    const waveform = Array.from(
      { length: Math.ceil(duration) },
      () => Math.random() * 0.8 + 0.2
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: videoId,
          name: videoTitle,
          duration: duration,
          waveform: waveform
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-extract-youtube function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'An unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
