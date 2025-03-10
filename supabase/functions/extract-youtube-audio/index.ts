
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { ytdl } from "https://deno.land/x/ytdl_core/mod.ts";
import { decode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

// Configure CORS headers for cross-origin requests
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
    // Get request data
    const requestData = await req.json();
    const { youtubeUrl, apiKey } = requestData;

    if (!youtubeUrl) {
      return new Response(
        JSON.stringify({ error: 'YouTube URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing YouTube URL: ${youtubeUrl}`);

    // Extract video ID from the URL
    let videoId = '';
    if (youtubeUrl.includes("youtu.be")) {
      videoId = youtubeUrl.split("/").pop() || '';
    } else {
      const url = new URL(youtubeUrl);
      videoId = url.searchParams.get("v") || '';
    }
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Could not extract video ID from URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get video info to get title
    const videoInfo = await ytdl.getInfo(youtubeUrl);
    const videoTitle = videoInfo.videoDetails.title || `YouTube Video ${videoId}`;
    
    // Download audio only stream
    const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audioonly');
    if (audioFormats.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No audio formats found for this video' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Use the highest quality audio format
    const audioFormat = audioFormats[0];
    const audioStream = ytdl.downloadFromInfo(videoInfo, { format: audioFormat });
    
    // Collect chunks of audio data
    const chunks: Uint8Array[] = [];
    const reader = audioStream.getReader();
    
    // Set a time limit for extraction (3 minutes of audio)
    const startTime = Date.now();
    const timeLimit = 3 * 60 * 1000; // 3 minutes in milliseconds
    
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      
      if (value) {
        chunks.push(value);
      }
      
      // Check if we've reached the time limit
      if (Date.now() - startTime > timeLimit) {
        console.log("Reached 3-minute time limit for extraction");
        done = true;
      }
    }
    
    // Create a new audio file with the first 3 minutes of audio
    const audioData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Generate a filename
    const filename = `${videoId}-${Date.now()}.mp3`;
    
    // Upload the audio file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('youtube_audio')
      .upload(filename, audioData, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });
      
    if (uploadError) {
      console.error("Error uploading audio:", uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('youtube_audio')
      .getPublicUrl(filename);
      
    const audioUrl = publicUrlData.publicUrl;
    
    // Calculate approximate duration (could be less than 3 minutes if video is shorter)
    const duration = Math.min(180, videoInfo.videoDetails.lengthSeconds); // Maximum 3 minutes
    
    // Generate random waveform data
    const waveform = Array.from(
      { length: Math.ceil(duration) }, 
      () => Math.random() * 0.8 + 0.2
    );
    
    // Store audio file metadata in Supabase
    const { data: storedAudio, error: storeError } = await supabase
      .from('audio_files')
      .insert({
        name: videoTitle,
        url: audioUrl,
        duration: parseInt(duration),
        waveform: waveform
      })
      .select()
      .single();
      
    if (storeError) {
      console.error("Error storing audio metadata:", storeError);
      return new Response(
        JSON.stringify({ error: 'Failed to store audio metadata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          id: storedAudio.id,
          name: storedAudio.name,
          url: audioUrl,
          duration: storedAudio.duration,
          waveform: storedAudio.waveform
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error processing YouTube URL:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
