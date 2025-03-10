
import { AudioFile } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { generateId } from "./audioCore";

export const extractAudioFromYouTube = async (youtubeUrl: string): Promise<AudioFile | null> => {
  console.log(`Extracting audio from YouTube URL: ${youtubeUrl}`);
  
  try {
    // Validate YouTube URL (basic validation)
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(youtubeUrl)) {
      throw new Error("Invalid YouTube URL");
    }
    
    // Call our Supabase Edge Function for YouTube extraction
    const response = await supabase.functions.invoke('extract-youtube-audio', {
      body: { youtubeUrl }
    });
    
    if (response.error) {
      console.error("Error from extract-youtube-audio function:", response.error);
      throw new Error(`Failed to extract audio: ${response.error.message || response.error}`);
    }
    
    const data = response.data;
    
    if (!data || !data.success) {
      const errorMessage = data?.error || "Failed to extract audio from YouTube";
      console.error("Function returned error:", errorMessage);
      throw new Error(errorMessage);
    }
    
    // Create an audio file object from the edge function response
    const audioFile: AudioFile = {
      id: data.data.id,
      name: data.data.name,
      file: null,
      url: data.data.url,
      duration: data.data.duration,
      waveform: data.data.waveform,
    };
    
    // Store the transcript data if available (makes it available for voice analysis)
    if (data.data.transcript) {
      try {
        // Save transcript data to Supabase for later voice analysis
        await supabase.from('transcripts').upsert({
          id: data.data.transcript.id,
          audio_id: audioFile.id,
          text: data.data.transcript.text,
          words: data.data.transcript.words,
          speakers: data.data.transcript.speakers,
          chapters: data.data.transcript.chapters,
          created_at: new Date().toISOString()
        });
        
        console.log("Saved transcript data to Supabase");
      } catch (error) {
        console.error("Error saving transcript data:", error);
        // Continue even if saving transcript fails
      }
    }
    
    console.log("Successfully extracted audio:", audioFile.name);
    return audioFile;
  } catch (error) {
    console.error("Error extracting audio from YouTube:", error);
    throw error;
  }
};
