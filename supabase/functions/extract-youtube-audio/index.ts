
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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

    // Extract video ID from YouTube URL
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Invalid YouTube URL, could not extract video ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a mock response for now
    // In a real implementation, we would use YouTube Data API or another reliable method
    // to get actual video metadata and audio
    
    // Generate random waveform data for visualization
    const duration = Math.floor(Math.random() * 120) + 60; // 1-3 minute duration
    const waveform = Array.from(
      { length: Math.ceil(duration) }, 
      () => Math.random() * 0.8 + 0.2
    );
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          id: videoId,
          name: `YouTube Video (${videoId})`,
          url: null, // We're not actually downloading audio right now
          duration: duration,
          waveform: waveform
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Unexpected error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
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
