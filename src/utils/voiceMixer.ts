
import { AudioFile, Voice } from "../types";
import { supabase } from "@/integrations/supabase/client";

// Mix voices based on settings and generate TTS
export const mixVoices = async (
  audioFile: AudioFile,
  voices: Voice[],
  activeVoices: Record<string, boolean>,
  ttsText?: string
): Promise<{ blob: Blob, url: string }> => {
  console.log(`Mixing ${voices.length} voices from audio file: ${audioFile.name}`);
  console.log("Active voices:", activeVoices);
  
  if (ttsText) {
    console.log(`Will generate TTS for text: "${ttsText}"`);
  }
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Create a blob from the original file or a placeholder
  let mixedBlob: Blob;
  
  if (audioFile.file) {
    mixedBlob = audioFile.file;
  } else {
    // Create an empty audio file
    mixedBlob = new Blob(
      [new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0])], 
      { type: "audio/wav" }
    );
  }
  
  // Upload mixed result to Supabase
  const filePath = `mixed-${audioFile.id}-${Date.now()}.wav`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('mixed_outputs')
    .upload(filePath, mixedBlob);
    
  if (uploadError) {
    console.error("Error uploading mixed audio to Supabase Storage:", uploadError);
    throw uploadError;
  }
  
  // Get the public URL
  const { data: publicUrl } = supabase.storage
    .from('mixed_outputs')
    .getPublicUrl(filePath);
    
  const storageUrl = publicUrl.publicUrl;
  
  // Store mixed output metadata in Supabase
  const { data: storedOutput, error: storeError } = await supabase
    .from('mixed_outputs')
    .insert({
      audio_id: audioFile.id,
      voices: Object.keys(activeVoices).filter(id => activeVoices[id]),
      output_url: storageUrl,
      tts_text: ttsText || null
    })
    .select()
    .single();
    
  if (storeError) {
    console.error("Error storing mixed output in Supabase:", storeError);
    throw storeError;
  }
  
  return {
    blob: mixedBlob,
    url: storageUrl
  };
};

// Generate speech from text using TTS API
export const generateSpeechFromText = async (text: string, voice?: Voice): Promise<string> => {
  console.log(`Generating speech for text: "${text}"`);
  if (voice) {
    console.log(`Using voice characteristics:`, voice.characteristics);
  }
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // In a real implementation, you would call a TTS API like ElevenLabs
  // and return a URL to the generated audio
  
  // For now, return a placeholder URL
  return "https://example.com/generated-speech.mp3";
};
