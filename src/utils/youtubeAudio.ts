
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
    
    // Call our Supabase Edge Function for YouTube extraction and segment detection
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
    
    console.log("Successfully extracted audio:", audioFile.name);
    return audioFile;
  } catch (error) {
    console.error("Error extracting audio from YouTube:", error);
    throw error;
  }
};

// Delete all voices associated with an audio file
export const deleteAllVoices = async (audioId: string): Promise<boolean> => {
  try {
    console.log(`Deleting all voices for audio ID: ${audioId}`);
    
    // First, fetch the voices to be deleted (for logging purposes)
    const { data: voicesToDelete, error: fetchError } = await supabase
      .from('voices')
      .select('id, tag')
      .eq('audio_id', audioId);
      
    if (fetchError) {
      console.error("Error fetching voices to delete:", fetchError);
    } else {
      console.log(`Found ${voicesToDelete?.length || 0} voices to delete:`, voicesToDelete);
    }
    
    // Now delete the voices
    const { data, error } = await supabase
      .from('voices')
      .delete()
      .eq('audio_id', audioId);
      
    if (error) {
      console.error("Error deleting voices:", error);
      throw error;
    }
    
    console.log(`Successfully deleted voices for audio ID: ${audioId}`);
    return true;
  } catch (error) {
    console.error("Error deleting all voices:", error);
    return false;
  }
};
