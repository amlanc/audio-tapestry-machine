
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { YoutubeDownloader } from "youtube_dl";

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
      // Initialize YouTube downloader with configuration
      console.log("Initializing YouTube downloader...");
      const downloader = new YoutubeDownloader({
        maxRetries: 3,
        cacheDirectory: './cache'
      });
      
      // Get video info first
      console.log("Getting video info...");
      const videoInfo = await downloader.getInfo(youtubeUrl).catch(error => {
        console.error("Error getting video info:", error);
        throw new Error(`Failed to get video info: ${error.message}`);
      });
      
      if (!videoInfo || !videoInfo.title) {
        console.error("Failed to get valid video details");
        return new Response(
          JSON.stringify({ error: 'Failed to get valid video details' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Video info received: ${videoInfo.title} (${videoInfo.id || 'unknown id'})`);
      
      const videoTitle = videoInfo.title;
      const videoId = videoInfo.id || `video-${Date.now()}`;
      
      console.log(`Downloading audio for video: ${videoTitle} (${videoId})...`);
      
      // Download audio only with more explicit options
      const downloadResult = await downloader.download(youtubeUrl, {
        format: 'mp3',
        audioOnly: true,
        maxDuration: 180,  // 3 minutes max
        quality: 'lowest'  // Use lowest quality to speed up processing
      }).catch(error => {
        console.error("Error downloading audio:", error);
        throw new Error(`Failed to download audio: ${error.message}`);
      });
      
      if (!downloadResult || !downloadResult.audio) {
        console.error("No audio content found in download result");
        return new Response(
          JSON.stringify({ error: 'No audio content found in download result' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const audioData = downloadResult.audio;
      console.log(`Audio data received: ${audioData.byteLength} bytes`);
      
      if (audioData.byteLength === 0) {
        console.error("Empty audio data received");
        return new Response(
          JSON.stringify({ error: 'Empty audio data received' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
      
      // Calculate approximate duration
      const duration = Math.min(180, videoInfo.duration || 180); // Maximum 3 minutes
      
      // Generate random waveform data for visualization
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
