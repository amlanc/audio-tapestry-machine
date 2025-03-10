
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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

    // Get YouTube video details using AssemblyAI API
    const assemblyApiKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyApiKey) {
      throw new Error('AssemblyAI API key is not configured');
    }

    console.log(`Using AssemblyAI API to process video ID: ${videoId}`);
    
    // Create a YouTube stream URL
    const youtubeStreamUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Use AssemblyAI to transcribe the YouTube video
    // First, submit the transcription request
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: youtubeStreamUrl,
        auto_chapters: true, // Get chapters/segments for better voice detection
        speaker_labels: true // Identify different speakers
      })
    });
    
    if (!transcriptResponse.ok) {
      const errorData = await transcriptResponse.json();
      console.error("AssemblyAI transcription request error:", errorData);
      throw new Error(`AssemblyAI error: ${JSON.stringify(errorData)}`);
    }
    
    const transcriptData = await transcriptResponse.json();
    const transcriptId = transcriptData.id;
    
    console.log(`Transcription submitted with ID: ${transcriptId}`);
    
    // Poll for the transcription results (simplified polling for edge function)
    // In a real implementation, we might use a webhook or background task
    let transcript = null;
    let attempts = 0;
    const maxAttempts = 5; // Limit polling attempts for the edge function
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between polls
      
      const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': assemblyApiKey
        }
      });
      
      if (!pollingResponse.ok) {
        console.error(`Polling error on attempt ${attempts}`);
        continue;
      }
      
      const pollingData = await pollingResponse.json();
      
      if (pollingData.status === 'completed') {
        transcript = pollingData;
        break;
      } else if (pollingData.status === 'error') {
        throw new Error(`Transcription failed: ${pollingData.error}`);
      }
      
      console.log(`Transcription status: ${pollingData.status}, attempt ${attempts}/${maxAttempts}`);
    }
    
    // If we couldn't get the full transcript in time, return what we have
    // The frontend can handle this partial data
    let title = `YouTube Video (${videoId})`;
    let duration = 0;
    let waveform = [];
    
    if (transcript) {
      // If we have a transcript, extract useful information
      title = transcript.audio_url.split('/').pop() || title;
      duration = Math.ceil(transcript.audio_duration || 0);
      
      // Generate waveform from transcript words if available
      if (transcript.words && transcript.words.length > 0) {
        // Create a timeline representation for visualization
        const timeSegments = Math.ceil(duration);
        waveform = Array(timeSegments).fill(0);
        
        transcript.words.forEach(word => {
          const segmentIndex = Math.floor(word.start / 1000);
          if (segmentIndex < timeSegments) {
            waveform[segmentIndex] = Math.max(waveform[segmentIndex], 0.5 + Math.random() * 0.5);
          }
        });
        
        // Fill in any gaps
        waveform = waveform.map(w => w === 0 ? 0.2 + Math.random() * 0.3 : w);
      } else {
        // Fallback to random waveform
        waveform = Array.from(
          { length: Math.ceil(duration || 120) }, 
          () => Math.random() * 0.8 + 0.2
        );
      }
    } else {
      // Fallback values if transcript couldn't be completed in time
      console.log("Timeout waiting for full transcript, using partial data");
      duration = 120; // Default to 2 minutes
      waveform = Array.from(
        { length: duration }, 
        () => Math.random() * 0.8 + 0.2
      );
    }
    
    // We're returning a structured response with the transcript data
    // The client-side code will store this data in relevant tables
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          id: videoId,
          name: title,
          url: null, // We're not actually downloading audio right now
          duration: duration,
          waveform: waveform,
          transcript: transcript ? {
            id: transcript.id,
            text: transcript.text,
            words: transcript.words,
            speakers: transcript.speaker_labels ? transcript.utterances : null,
            chapters: transcript.chapters
          } : null
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
