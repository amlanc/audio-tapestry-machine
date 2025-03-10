
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
    
    // Call the new AI-powered Supabase Edge Function
    const response = await supabase.functions.invoke('ai-extract-youtube', {
      body: { youtubeUrl }
    });
    
    if (response.error) {
      console.error("Error from ai-extract-youtube function:", response.error);
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
    
    console.log("Successfully extracted audio:", audioFile.name);
    return audioFile;
  } catch (error) {
    console.error("Error extracting audio from YouTube:", error);
    throw error;
  }
};
