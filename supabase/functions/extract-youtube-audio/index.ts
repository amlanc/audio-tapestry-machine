
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { download } from "youtube_dl";

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

    // Download YouTube video using youtube_dl
    console.log("Starting YouTube download...");
    try {
      const downloadOptions = {
        maxRetries: 3,
        format: "bestaudio[ext=mp3]",
        maxFileSizeMb: 20,
        timeout: 60000,
      };
      
      const result = await download(youtubeUrl, downloadOptions);
      
      if (!result.videoDetails || !result.videoDetails.title || !result.videoDetails.id) {
        return new Response(
          JSON.stringify({ error: 'Failed to get video details' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!result.audioContent) {
        return new Response(
          JSON.stringify({ error: 'No audio content found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const videoTitle = result.videoDetails.title;
      const videoId = result.videoDetails.id;
      const audioData = result.audioContent;
      
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
          JSON.stringify({ error: 'Failed to upload audio file: ' + uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('youtube_audio')
        .getPublicUrl(filename);
        
      const audioUrl = publicUrlData.publicUrl;
      
      // Calculate approximate duration (could be less than 3 minutes if video is shorter)
      const duration = Math.min(180, result.videoDetails.lengthSeconds || 180); // Maximum 3 minutes
      
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
          JSON.stringify({ error: 'Failed to store audio metadata: ' + storeError.message }),
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
    } catch (downloadError) {
      console.error("Error downloading from YouTube:", downloadError);
      return new Response(
        JSON.stringify({ error: `Failed to download YouTube audio: ${downloadError.message || 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Error processing YouTube URL:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
