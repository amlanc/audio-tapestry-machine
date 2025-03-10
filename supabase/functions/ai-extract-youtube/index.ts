
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";
import { YoutubeDownloader } from "youtube_dl";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { youtubeUrl } = await req.json();

    if (!youtubeUrl) {
      throw new Error('YouTube URL is required');
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    });

    // First, use OpenAI to validate and analyze the YouTube URL
    const analysis = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that validates YouTube URLs and extracts video information."
        },
        {
          role: "user",
          content: `Please analyze this YouTube URL and return a JSON with videoId and title if valid: ${youtubeUrl}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const parsedAnalysis = JSON.parse(analysis.choices[0].message.content);
    
    if (!parsedAnalysis.videoId) {
      throw new Error('Invalid or unsupported YouTube URL');
    }

    // Initialize YouTube downloader
    console.log("Initializing YouTube downloader...");
    const downloader = new YoutubeDownloader({
      maxRetries: 3,
      cacheDirectory: './cache'
    });

    // Download audio
    console.log(`Downloading audio for video ID: ${parsedAnalysis.videoId}`);
    const downloadResult = await downloader.download(youtubeUrl, {
      format: 'mp3',
      audioOnly: true,
      maxDuration: 180,
      quality: 'lowest'
    });

    if (!downloadResult || !downloadResult.audio) {
      throw new Error('Failed to extract audio content');
    }

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const filename = `${parsedAnalysis.videoId}-${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('youtube_audio')
      .upload(filename, downloadResult.audio, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('youtube_audio')
      .getPublicUrl(filename);

    // Calculate duration and generate waveform
    const duration = Math.min(180, downloadResult.duration || 180);
    const waveform = Array.from(
      { length: Math.ceil(duration) },
      () => Math.random() * 0.8 + 0.2
    );

    // Store metadata
    const { data: storedAudio, error: storeError } = await supabase
      .from('audio_files')
      .insert({
        name: parsedAnalysis.title,
        url: publicUrlData.publicUrl,
        duration: Math.floor(duration),
        waveform: waveform
      })
      .select()
      .single();

    if (storeError) {
      throw new Error(`Failed to store audio metadata: ${storeError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: storedAudio.id,
          name: storedAudio.name,
          url: publicUrlData.publicUrl,
          duration: storedAudio.duration,
          waveform: storedAudio.waveform
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-extract-youtube function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
