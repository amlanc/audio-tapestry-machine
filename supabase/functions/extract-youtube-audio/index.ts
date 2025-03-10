
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { load } from "youtube_dl";

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
    const { youtubeUrl } = requestData;

    if (!youtubeUrl) {
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

    try {
      // Check if 'youtube_audio' bucket exists, if not create it
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.error("Error listing buckets:", bucketsError);
      } else {
        const bucketExists = buckets.some(bucket => bucket.name === 'youtube_audio');
        if (!bucketExists) {
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

    // Load YouTube video using youtube_dl
    const youtube = await load(youtubeUrl);
    const info = await youtube.info();
    
    if (!info) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video information' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const videoTitle = info.title || `YouTube Video ${info.id}`;
    const videoId = info.id;

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Could not extract video ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find audio format with highest quality
    const audioFormats = info.formats.filter(format => 
      format.acodec !== 'none' && 
      !format.vcodec && 
      format.url
    );
    
    if (audioFormats.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No audio formats found for this video' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Sort by audio quality and take the best one
    const bestAudioFormat = audioFormats.sort((a, b) => {
      const aQuality = a.abr || 0;
      const bQuality = b.abr || 0;
      return bQuality - aQuality;
    })[0];
    
    if (!bestAudioFormat.url) {
      return new Response(
        JSON.stringify({ error: 'Could not find a valid audio URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Download the audio
    console.log(`Downloading audio from ${bestAudioFormat.url.substring(0, 50)}...`);
    const audioResponse = await fetch(bestAudioFormat.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!audioResponse.ok) {
      const errorMessage = `Failed to download audio: ${audioResponse.statusText}`;
      console.error(errorMessage);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the audio content
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioData = new Uint8Array(audioBuffer);
    
    // Generate a filename
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
    const duration = Math.min(180, info.duration || 180); // Maximum 3 minutes
    
    // Generate random waveform data for visualization
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
        duration: Math.floor(duration),
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
