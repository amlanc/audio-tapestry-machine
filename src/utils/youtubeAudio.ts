
import { AudioFile } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { generateId } from "./audioCore";

// Extract audio from YouTube using Supabase Edge Function
export const extractAudioFromYouTube = async (youtubeUrl: string): Promise<AudioFile | null> => {
  console.log(`Extracting audio from YouTube URL: ${youtubeUrl}`);
  
  try {
    // Validate YouTube URL (basic validation)
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(youtubeUrl)) {
      throw new Error("Invalid YouTube URL");
    }
    
    // Call the Supabase Edge Function to extract audio
    const { data, error } = await supabase.functions.invoke('extract-youtube-audio', {
      body: { youtubeUrl }
    });
    
    if (error) {
      console.error("Error invoking extract-youtube-audio function:", error);
      throw new Error(`Failed to extract audio: ${error.message}`);
    }
    
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
    
    console.log("Successfully extracted audio:", audioFile.name);
    return audioFile;
  } catch (error) {
    console.error("Error extracting audio from YouTube:", error);
    throw error;
  }
};
