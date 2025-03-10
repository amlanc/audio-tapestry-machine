
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
      // Instead of trying to directly store it in a 'transcripts' table that doesn't exist,
      // we can save this data in local storage or as part of the audio_files record
      console.log("Transcript data available:", data.data.transcript.id);
      
      // Optionally, store additional metadata about the audio file
      try {
        // Update or insert the audio file in the audio_files table
        await supabase.from('audio_files').upsert({
          id: audioFile.id,
          name: audioFile.name,
          duration: audioFile.duration,
          url: audioFile.url || '',
          waveform: audioFile.waveform,
          created_at: new Date().toISOString()
        });
        
        console.log("Saved audio file data to Supabase");
      } catch (error) {
        console.error("Error saving audio file data:", error);
        // Continue even if saving data fails
      }
    }
    
    console.log("Successfully extracted audio:", audioFile.name);
    return audioFile;
  } catch (error) {
    console.error("Error extracting audio from YouTube:", error);
    throw error;
  }
};
