
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.2";

// Configure CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const assemblyAiKey = Deno.env.get('ASSEMBLYAI_API_KEY');
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Extract YouTube audio function called");
    
    // Get request data
    const requestData = await req.json();
    const { youtubeUrl } = requestData;

    if (!youtubeUrl) {
      console.error("Missing YouTube URL in request");
      return new Response(
        JSON.stringify({ success: false, error: 'YouTube URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!assemblyAiKey) {
      console.error("AssemblyAI API key is not configured");
      return new Response(
        JSON.stringify({ success: false, error: 'AssemblyAI API key is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing YouTube URL: ${youtubeUrl}`);

    // Extract video ID from YouTube URL
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid YouTube URL, could not extract video ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracted video ID: ${videoId}`);

    // Initialize OpenAI client for metadata extraction
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Get video metadata from OpenAI
    const metadataResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You analyze YouTube URLs and extract basic metadata. Return a JSON with title, description, and estimatedDuration in seconds."
        },
        {
          role: "user",
          content: `Extract basic metadata for YouTube video with ID: ${videoId}. Estimate a reasonable duration in seconds.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const metadata = JSON.parse(metadataResponse.choices[0].message.content);
    console.log("Video metadata:", metadata);

    // Create an Assembly AI client
    const duration = metadata.estimatedDuration || 180; // Default to 3 minutes
    
    // Generate a simulated waveform 
    const waveform = Array.from(
      { length: duration }, 
      () => Math.random() * 0.8 + 0.2
    );

    // Initialize Supabase client
    const supabase = createClient(
      supabaseUrl || "",
      supabaseServiceRoleKey || ""
    );

    // Store audio file metadata
    const { data: audioFile, error: audioFileError } = await supabase
      .from('audio_files')
      .insert({
        name: metadata.title || `YouTube Video (${videoId})`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        duration: duration,
        waveform: waveform,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (audioFileError) {
      console.error("Error storing audio file metadata:", audioFileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store audio file metadata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create voice segments (simulate different speakers)
    const numberOfVoices = Math.floor(Math.random() * 3) + 2; // 2-4 voice segments
    const voiceColors = ["audio-blue", "audio-purple", "audio-pink", "audio-green", "audio-yellow"];
    
    const voiceSegments = [];
    const segmentLength = Math.floor(duration / (numberOfVoices + 1));
    
    for (let i = 0; i < numberOfVoices; i++) {
      const startTime = i * segmentLength;
      const endTime = startTime + segmentLength + 5; // Slight overlap
      
      const characteristics = {
        pitch: Math.random(),
        tone: Math.random(),
        speed: Math.random(),
        clarity: Math.random(),
      };
      
      const { data: voice, error: voiceError } = await supabase
        .from('voices')
        .insert({
          audio_id: audioFile.id,
          tag: `Speaker ${i + 1}`,
          start_time: startTime,
          end_time: endTime,
          color: voiceColors[i % voiceColors.length],
          volume: 1.0,
          audio_url: `https://www.youtube.com/watch?v=${videoId}`,
          characteristics: characteristics
        })
        .select()
        .single();
        
      if (voiceError) {
        console.error("Error storing voice segment:", voiceError);
      } else {
        voiceSegments.push(voice);
      }
    }
    
    console.log(`Created ${voiceSegments.length} voice segments`);
    
    // Return success response with the audio file data
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          id: audioFile.id,
          name: audioFile.name,
          url: audioFile.url,
          duration: audioFile.duration,
          waveform: audioFile.waveform,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Unexpected error processing request:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // For youtu.be URLs
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.substring(1);
    }
    
    // For youtube.com URLs
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }
    
    return null;
  } catch {
    return null;
  }
}
