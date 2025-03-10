
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Configure CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (!openaiApiKey) {
      console.error("OpenAI API key is not configured");
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key is not configured' }),
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

    // Initialize Supabase client
    const supabase = createClient(
      supabaseUrl || "",
      supabaseServiceRoleKey || ""
    );

    // Initialize OpenAI client for metadata extraction and voice analysis
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Get video metadata and analyze potential voices using OpenAI
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You analyze YouTube videos to extract metadata and detect different voices and speakers. For a simulated voice analysis, generate realistic speaker details."
        },
        {
          role: "user",
          content: `Analyze this YouTube video with ID: ${videoId}. Provide: 1) title, 2) description, 3) estimatedDuration in seconds (limit to 180 seconds max), and 4) detect 2-4 different speakers/voices with distinct characteristics. For each speaker, provide a speakerId, name, startTime and endTime (in seconds), and characteristics (vocal qualities like pitch, tone, gender, accent). Return as JSON.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(analysisResponse.choices[0].message.content);
    console.log("Video analysis:", analysis);

    // For demonstration purposes, limit to 3 minutes (180 seconds)
    const maxDuration = 180;
    const duration = Math.min(analysis.estimatedDuration || 120, maxDuration);
    const title = analysis.title || `YouTube Video (${videoId})`;
    
    // Generate a simulated waveform for visualization
    const waveform = Array.from(
      { length: Math.ceil(duration) },
      () => Math.random() * 0.8 + 0.2
    );

    // Define colors for the voices
    const voiceColors = ["audio-blue", "audio-purple", "audio-pink", "audio-green", "audio-yellow"];

    // Store audio file metadata
    const { data: audioFile, error: audioFileError } = await supabase
      .from('audio_files')
      .insert({
        name: title,
        url: `https://www.youtube.com/embed/${videoId}?autoplay=0`,
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

    // Create voice segments based on OpenAI analysis
    const voiceSegments = [];
    
    if (analysis.speakers && Array.isArray(analysis.speakers)) {
      for (let i = 0; i < analysis.speakers.length; i++) {
        const speaker = analysis.speakers[i];
        
        // Normalize characteristics to values between 0 and 1
        const normalizeValue = (value) => {
          // Convert subjective values to numbers between 0 and 1
          if (typeof value === 'string') {
            const lowValues = ['low', 'deep', 'slow', 'quiet', 'soft'];
            const highValues = ['high', 'sharp', 'fast', 'loud', 'clear'];
            
            if (lowValues.some(v => value.toLowerCase().includes(v))) {
              return Math.random() * 0.4; // Low range: 0 - 0.4
            } else if (highValues.some(v => value.toLowerCase().includes(v))) {
              return 0.6 + Math.random() * 0.4; // High range: 0.6 - 1.0
            }
          }
          
          return Math.random(); // Default to random value
        };
        
        const characteristics = {
          pitch: normalizeValue(speaker.characteristics?.pitch),
          tone: normalizeValue(speaker.characteristics?.tone),
          speed: normalizeValue(speaker.characteristics?.speed),
          clarity: normalizeValue(speaker.characteristics?.clarity)
        };
        
        // Store voice segment in Supabase
        const { data: voice, error: voiceError } = await supabase
          .from('voices')
          .insert({
            audio_id: audioFile.id,
            tag: speaker.name || `Speaker ${i + 1}`,
            start_time: speaker.startTime || (i * (duration / analysis.speakers.length)),
            end_time: speaker.endTime || ((i + 1) * (duration / analysis.speakers.length)),
            color: voiceColors[i % voiceColors.length],
            volume: 1.0,
            audio_url: `https://www.youtube.com/embed/${videoId}?autoplay=0&start=${Math.floor(speaker.startTime || (i * (duration / analysis.speakers.length)))}`,
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
    } else {
      // Fallback if no speakers were detected
      const numberOfVoices = Math.floor(Math.random() * 2) + 2; // 2-3 voices
      
      for (let i = 0; i < numberOfVoices; i++) {
        const segmentLength = Math.floor(duration / numberOfVoices);
        const startTime = i * segmentLength;
        const endTime = startTime + segmentLength;
        
        const characteristics = {
          pitch: Math.random(),
          tone: Math.random(),
          speed: Math.random(),
          clarity: Math.random(),
        };
        
        // Store voice segment in Supabase
        const { data: voice, error: voiceError } = await supabase
          .from('voices')
          .insert({
            audio_id: audioFile.id,
            tag: `Speaker ${i + 1}`,
            start_time: startTime,
            end_time: endTime,
            color: voiceColors[i % voiceColors.length],
            volume: 1.0,
            audio_url: `https://www.youtube.com/embed/${videoId}?autoplay=0&start=${startTime}`,
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
