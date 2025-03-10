
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

    // Initialize OpenAI client for metadata extraction
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Get video metadata using OpenAI
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Analyze YouTube videos to extract accurate metadata. Return only factual information about the video's chapters or segments. Do not make up or guess segment names or timestamps if they're not clearly available in the video metadata."
        },
        {
          role: "user",
          content: `Extract chapter information for YouTube video with ID: ${videoId}. ONLY return chapters/timestamps that are explicitly available in the video's description or chapter markers. If no explicit timestamps are available, return an empty array for segments. Return as JSON with fields: title, estimatedDuration, and segments (array with startTime, endTime, and label fields). DO NOT MAKE UP OR GUESS segment information.`
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

    // Define colors for the segments
    const voiceColors = ["audio-blue", "audio-purple", "audio-pink", "audio-green", "audio-yellow"];

    // Check if there's already an audio file with this video ID to avoid duplicates
    const { data: existingFiles, error: existingFilesError } = await supabase
      .from('audio_files')
      .select('id')
      .ilike('url', `%${videoId}%`);
      
    if (existingFilesError) {
      console.error("Error checking existing files:", existingFilesError);
    }
    
    let audioFileId;
    
    // If file exists, use it, otherwise create a new one
    if (existingFiles && existingFiles.length > 0) {
      audioFileId = existingFiles[0].id;
      console.log(`Using existing audio file with ID: ${audioFileId}`);
      
      // Delete existing voice segments to recreate them
      const { error: deleteError } = await supabase
        .from('voices')
        .delete()
        .eq('audio_id', audioFileId);
        
      if (deleteError) {
        console.error("Error deleting existing voices:", deleteError);
      } else {
        console.log("Successfully deleted existing voices");
      }
      
      // Update the existing file with new metadata
      await supabase
        .from('audio_files')
        .update({
          name: title,
          duration: duration,
          waveform: waveform,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        })
        .eq('id', audioFileId);
    } else {
      // Store audio file metadata
      const { data: audioFile, error: audioFileError } = await supabase
        .from('audio_files')
        .insert({
          name: title,
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
      
      audioFileId = audioFile.id;
    }

    // Create segments based on analysis
    const voiceSegments = [];
    
    if (analysis.segments && Array.isArray(analysis.segments) && analysis.segments.length > 0) {
      // Use the actual segments from the video metadata
      for (let i = 0; i < analysis.segments.length; i++) {
        const segment = analysis.segments[i];
        
        // Generate random characteristics for each segment
        const characteristics = {
          pitch: Math.random(),
          tone: Math.random(),
          speed: Math.random(),
          clarity: Math.random()
        };
        
        const startTime = segment.startTime || 0;
        const endTime = segment.endTime || (startTime + 30); // Default 30 seconds if no end time
        
        // Use the actual segment label if available, otherwise use generic Voice label
        const segmentLabel = segment.label || `Voice ${i+1}`;
        
        // Ensure startTime is an integer for better YouTube embedding
        const startTimeInt = Math.floor(startTime);
        
        // Use direct YouTube watch URL with timestamp
        const youtubeWatchUrl = `https://www.youtube.com/watch?v=${videoId}&t=${startTimeInt}`;
        
        console.log(`Creating segment "${segmentLabel}" at ${startTimeInt}s with URL: ${youtubeWatchUrl}`);
        
        // Store voice segment in Supabase
        const { data: voice, error: voiceError } = await supabase
          .from('voices')
          .insert({
            audio_id: audioFileId,
            tag: segmentLabel,
            start_time: startTime,
            end_time: endTime,
            color: voiceColors[i % voiceColors.length],
            volume: 1.0,
            audio_url: youtubeWatchUrl,
            characteristics: characteristics
          })
          .select()
          .single();
          
        if (voiceError) {
          console.error("Error storing voice segment:", voiceError);
        } else {
          console.log(`Created segment: ${voice.tag} (${startTime}s - ${endTime}s)`);
          voiceSegments.push(voice);
        }
      }
    } else {
      // Fallback: create generic voice segments if no segments were found in metadata
      const numberOfSegments = Math.floor(Math.random() * 2) + 2; // 2-3 segments
      
      for (let i = 0; i < numberOfSegments; i++) {
        const segmentLength = Math.floor(duration / numberOfSegments);
        const startTime = i * segmentLength;
        const endTime = startTime + segmentLength;
        const startTimeInt = Math.floor(startTime);
        
        const characteristics = {
          pitch: Math.random(),
          tone: Math.random(),
          speed: Math.random(),
          clarity: Math.random(),
        };
        
        // Use generic Voice label
        const voiceLabel = `Voice ${i + 1}`;
        
        // Use direct YouTube watch URL with timestamp
        const youtubeWatchUrl = `https://www.youtube.com/watch?v=${videoId}&t=${startTimeInt}`;
        
        console.log(`Creating fallback segment ${voiceLabel} at ${startTimeInt}s with URL: ${youtubeWatchUrl}`);
        
        // Store voice segment in Supabase
        const { data: voice, error: voiceError } = await supabase
          .from('voices')
          .insert({
            audio_id: audioFileId,
            tag: voiceLabel,
            start_time: startTime,
            end_time: endTime,
            color: voiceColors[i % voiceColors.length],
            volume: 1.0,
            audio_url: youtubeWatchUrl,
            characteristics: characteristics
          })
          .select()
          .single();
          
        if (voiceError) {
          console.error("Error storing voice segment:", voiceError);
        } else {
          console.log(`Created fallback segment: ${voice.tag} (${startTime}s - ${endTime}s)`);
          voiceSegments.push(voice);
        }
      }
    }
    
    console.log(`Created ${voiceSegments.length} segments`);
    
    // Get the file data after all operations
    const { data: finalAudioFile, error: fetchError } = await supabase
      .from('audio_files')
      .select('*')
      .eq('id', audioFileId)
      .single();
      
    if (fetchError) {
      console.error("Error fetching audio file:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to retrieve updated audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("Returning success response with audio file:", finalAudioFile.id);
    
    // Return success response with the audio file data
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          id: finalAudioFile.id,
          name: finalAudioFile.name,
          url: finalAudioFile.url,
          duration: finalAudioFile.duration,
          waveform: finalAudioFile.waveform,
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
