
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    console.log("Analyzing YouTube URL with OpenAI...");
    // First, use OpenAI to validate and extract info from the YouTube URL
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

    // Generate a simulated audio file since we don't actually download it in this version
    // This simulates what the youtube_dl would have done
    const videoId = analysisResult.videoId;
    const videoTitle = analysisResult.title || `YouTube Video ${videoId}`;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create an audio placeholder in the storage
    // Since we're not actually downloading the audio, we'll create a simple marker file
    const audioBytes = new TextEncoder().encode(`Audio placeholder for ${videoTitle}`);
    const filename = `${videoId}-${Date.now()}.txt`;

    // Ensure 'youtube_audio' bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      
      const bucketExists = buckets.some(bucket => bucket.name === 'youtube_audio');
      
      if (!bucketExists) {
        console.log("Creating 'youtube_audio' bucket...");
        await supabase.storage.createBucket('youtube_audio', {
          public: true
        });
      }
    } catch (error) {
      console.error("Error checking/creating bucket:", error);
      throw new Error(`Failed to prepare storage: ${error.message}`);
    }

    // Upload placeholder to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('youtube_audio')
      .upload(filename, audioBytes, {
        contentType: 'text/plain',
        cacheControl: '3600'
      });

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('youtube_audio')
      .getPublicUrl(filename);

    // Calculate simulated duration (1-3 minutes)
    const duration = Math.floor(Math.random() * 120) + 60;
    
    // Generate random waveform for visualization
    const waveform = Array.from(
      { length: Math.ceil(duration) },
      () => Math.random() * 0.8 + 0.2
    );

    // Store metadata
    const { data: storedAudio, error: storeError } = await supabase
      .from('audio_files')
      .insert({
        name: videoTitle,
        url: publicUrlData.publicUrl,
        duration: duration,
        waveform: waveform
      })
      .select()
      .single();

    if (storeError) {
      throw new Error(`Failed to store audio metadata: ${storeError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: storedAudio.id,
          name: storedAudio.name,
          url: publicUrlData.publicUrl,
          duration: storedAudio.duration,
          waveform: storedAudio.waveform
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
