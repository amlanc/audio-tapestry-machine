
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import * as ytdl from "ytdl_core";

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
    console.log("Extract YouTube audio function called");
    
    // Get request data
    const requestData = await req.json();
    const { youtubeUrl } = requestData;

    if (!youtubeUrl) {
      console.error("Missing YouTube URL in request");
      return new Response(
        JSON.stringify({ error: 'YouTube URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing YouTube URL: ${youtubeUrl}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ensure 'youtube_audio' bucket exists
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error("Error listing buckets:", bucketsError);
      } else {
        const bucketExists = buckets.some(bucket => bucket.name === 'youtube_audio');
        
        if (!bucketExists) {
          console.log("Creating 'youtube_audio' bucket...");
          const { error: createBucketError } = await supabase.storage.createBucket('youtube_audio', {
            public: true
          });
          
          if (createBucketError) {
            console.error("Error creating bucket:", createBucketError);
          } else {
            console.log("Created 'youtube_audio' bucket");
          }
        }
      }
    } catch (error) {
      console.error("Error checking/creating bucket:", error);
    }

    try {
      // Extract video ID from YouTube URL
      console.log("Extracting video ID...");
      const videoId = ytdl.getVideoID(youtubeUrl);
      
      if (!videoId) {
        throw new Error("Could not extract video ID from URL");
      }
      
      console.log(`Video ID: ${videoId}`);
      
      // Get video info
      console.log("Getting video info...");
      const videoInfo = await ytdl.getInfo(videoId);
      
      if (!videoInfo || !videoInfo.videoDetails) {
        throw new Error("Failed to get video details");
      }
      
      const videoTitle = videoInfo.videoDetails.title;
      console.log(`Video title: ${videoTitle}`);
      
      // Get audio formats only
      const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audioonly');
      
      if (!audioFormats.length) {
        throw new Error("No audio formats available");
      }
      
      // Choose the first audio format (usually the best quality)
      const format = audioFormats[0];
      console.log(`Selected audio format: ${format.mimeType}, quality: ${format.quality}`);
      
      // Download the audio
      console.log("Downloading audio...");
      const response = await fetch(format.url);
      
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }
      
      const audioData = await response.arrayBuffer();
      console.log(`Audio data received: ${audioData.byteLength} bytes`);
      
      // Generate a filename with timestamp to avoid conflicts
      const filename = `${videoId}-${Date.now()}.mp3`;
      
      // Upload to Supabase Storage
      console.log(`Uploading ${filename} to Supabase Storage...`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('youtube_audio')
        .upload(filename, audioData, {
          contentType: 'audio/mpeg',
          cacheControl: '3600'
        });
        
      if (uploadError) {
        console.error("Error uploading audio:", uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload audio file: ' + uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('youtube_audio')
        .getPublicUrl(filename);
        
      const audioUrl = publicUrlData.publicUrl;
      console.log(`Audio URL: ${audioUrl}`);
      
      // Calculate approximate duration from video info
      const duration = parseInt(videoInfo.videoDetails.lengthSeconds) || 180; 
      
      // Generate random waveform data for visualization (or use actual data if available)
      const waveform = Array.from(
        { length: Math.ceil(duration) }, 
        () => Math.random() * 0.8 + 0.2
      );
      
      // Store audio file metadata in Supabase
      console.log("Storing audio file metadata...");
      const { data: storedAudio, error: storeError } = await supabase
        .from('audio_files')
        .insert({
          name: videoTitle,
          url: audioUrl,
          duration: Math.min(180, duration), // Cap at 3 minutes
          waveform: waveform
        })
        .select()
        .single();
        
      if (storeError) {
        console.error("Error storing audio metadata:", storeError);
        return new Response(
          JSON.stringify({ error: 'Failed to store audio metadata: ' + storeError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log("Successfully processed YouTube audio extraction");
      
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
    } catch (downloadError) {
      console.error("Error processing YouTube URL:", downloadError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to process YouTube audio: ${downloadError.message || 'Unknown error'}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Unexpected error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
