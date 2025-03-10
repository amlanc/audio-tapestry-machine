
import { AudioFile } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { generateId, generateRandomWaveform } from "./audioCore";

// Process an audio file to create an AudioFile object
export const processAudioFile = async (file: File): Promise<AudioFile> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        if (!e.target?.result) {
          reject(new Error("Failed to read file"));
          return;
        }
        
        // Process the audio file to extract duration
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Convert the FileReader result to an ArrayBuffer
        const arrayBuffer = e.target.result as ArrayBuffer;
        
        // Decode the audio data
        audioContext.decodeAudioData(
          arrayBuffer,
          async (audioBuffer) => {
            const duration = Math.ceil(audioBuffer.duration);
            const waveform = generateRandomWaveform(duration);
            
            // Create a blob URL for the file
            const url = URL.createObjectURL(file);
            
            // Upload file to Supabase Storage
            const filePath = `${generateId()}-${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('audio_files')
              .upload(filePath, file);
              
            if (uploadError) {
              console.error("Error uploading to Supabase Storage:", uploadError);
              reject(uploadError);
              return;
            }
            
            // Get the public URL
            const { data: publicUrl } = supabase.storage
              .from('audio_files')
              .getPublicUrl(filePath);
              
            const storageUrl = publicUrl.publicUrl;
            
            // Store audio file metadata in Supabase
            const { data: storedAudio, error: storeError } = await supabase
              .from('audio_files')
              .insert({
                name: file.name,
                url: storageUrl,
                duration,
                waveform
              })
              .select()
              .single();
              
            if (storeError) {
              console.error("Error storing audio in Supabase:", storeError);
              reject(storeError);
              return;
            }
            
            const audioFile: AudioFile = {
              id: storedAudio.id,
              name: file.name,
              file,
              url: storageUrl,
              duration,
              waveform,
            };
            
            resolve(audioFile);
          },
          (error) => {
            reject(new Error(`Failed to decode audio data: ${error}`));
          }
        );
      };
      
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      reject(error);
    }
  });
};
