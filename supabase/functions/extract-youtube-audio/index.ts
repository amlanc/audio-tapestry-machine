
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

    // Get YouTube video details using Google Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key is not configured');
    }

    console.log(`Using Gemini API to get information for video ID: ${videoId}`);
    
    // Get video title and other details from Gemini API
    const videoDetails = await getYouTubeVideoDetails(geminiApiKey, videoId, youtubeUrl);
    
    if (!videoDetails) {
      throw new Error('Failed to get video details from Gemini API');
    }
    
    // Generate random waveform data for visualization (based on the video duration)
    const duration = videoDetails.duration || Math.floor(Math.random() * 120) + 60; // 1-3 minute duration if not provided
    const waveform = Array.from(
      { length: Math.ceil(duration) }, 
      () => Math.random() * 0.8 + 0.2
    );
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          id: videoId,
          name: videoDetails.title,
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

// Function to get YouTube video details using Google Gemini API
async function getYouTubeVideoDetails(apiKey: string, videoId: string, youtubeUrl: string) {
  try {
    const prompt = `
      Extract information from this YouTube video: ${youtubeUrl} with ID: ${videoId}
      
      Please provide the following in valid JSON format:
      1. The video title
      2. The approximate duration in seconds (your best guess)
      3. The creator/channel name
      
      Format your response ONLY as a valid JSON object with the following keys:
      {
        "title": "Video Title",
        "duration": 180,
        "channel": "Channel Name"
      }
    `;
    
    console.log("Sending request to Gemini API");
    
    const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-experimental:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log("Gemini API response:", JSON.stringify(responseData, null, 2));
    
    // Extract JSON from the text response
    let jsonResponseText = '';
    if (responseData.candidates && 
        responseData.candidates[0] && 
        responseData.candidates[0].content &&
        responseData.candidates[0].content.parts) {
      
      jsonResponseText = responseData.candidates[0].content.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('');
    }
    
    // Find and extract JSON from the text
    const jsonMatch = jsonResponseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from Gemini response", jsonResponseText);
      // Fallback to default values
      return {
        title: `YouTube Video (${videoId})`,
        duration: 120,
        channel: "Unknown"
      };
    }
    
    const extractedJson = JSON.parse(jsonMatch[0]);
    console.log("Extracted video details:", extractedJson);
    
    return {
      title: extractedJson.title || `YouTube Video (${videoId})`,
      duration: extractedJson.duration || 120,
      channel: extractedJson.channel || "Unknown"
    };
  } catch (error) {
    console.error("Error getting YouTube video details:", error);
    // Return default values in case of error
    return {
      title: `YouTube Video (${videoId})`,
      duration: 120,
      channel: "Unknown"
    };
  }
}
