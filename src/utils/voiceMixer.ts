
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
  
  // If we have TTS text, generate audio for it first
  let ttsAudioBlob: Blob | null = null;
  if (ttsText && ttsText.trim()) {
    try {
      // Get the first active voice to use its characteristics for TTS
      const activeVoice = voices.find(v => activeVoices[v.id]);
      const ttsResult = await generateSpeechFromText(ttsText, activeVoice);
      
      if (ttsResult && ttsResult.blob) {
        ttsAudioBlob = ttsResult.blob;
      }
    } catch (error) {
      console.error("Error generating TTS audio:", error);
    }
  }
  
  // Simulate processing delay for the mixing part
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Create a blob from the generated TTS audio, original file, or placeholder
  let mixedBlob: Blob;
  
  if (ttsAudioBlob) {
    mixedBlob = ttsAudioBlob;
  } else if (audioFile.file) {
    mixedBlob = audioFile.file;
  } else {
    // Create an empty audio file
    mixedBlob = new Blob(
      [new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0])], 
      { type: "audio/mp3" }
    );
  }
  
  // Upload mixed result to Supabase
  const filePath = `mixed-${audioFile.id}-${Date.now()}.mp3`;
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

// Generate speech from text using ElevenLabs API
export const generateSpeechFromText = async (
  text: string, 
  voice?: Voice
): Promise<{ blob: Blob, url: string } | null> => {
  console.log(`Generating speech for text: "${text.substring(0, 50)}..."`);
  
  if (voice) {
    console.log(`Using voice characteristics:`, voice.characteristics);
  }
  
  try {
    // Map voice characteristics to an ElevenLabs voice ID
    // This is a simplified mapping - in a real implementation, you'd have more sophisticated logic
    const voiceMapping: Record<string, string> = {
      // Using some popular ElevenLabs voices
      "high_pitch": "9BWtsMINqrJLrRacOk9x", // Aria
      "medium_pitch": "TxGEqnHWrfWFTfGW9XjX", // Josh
      "low_pitch": "VR6AewLTigWG4xSOukaG", // Arnold
      "default": "pNInz6obpgDQGcFmaJgB", // Adam
    };
    
    // Determine voice ID based on pitch
    let voiceId = voiceMapping.default;
    if (voice && voice.characteristics) {
      const pitch = voice.characteristics.pitch;
      if (pitch > 0.7) voiceId = voiceMapping.high_pitch;
      else if (pitch > 0.4) voiceId = voiceMapping.medium_pitch;
      else voiceId = voiceMapping.low_pitch;
    }
    
    // Call the ElevenLabs TTS Edge Function
    const response = await supabase.functions.invoke("elevenlabs-tts", {
      body: {
        text: text,
        voiceId: voiceId,
        model: "eleven_multilingual_v2"
      }
    });
    
    if (response.error || !response.data.success) {
      console.error("Error from TTS function:", response.error || response.data.error);
      throw new Error(response.error || response.data.error || "Failed to generate speech");
    }
    
    // Convert base64 to blob
    const base64Data = response.data.audioBase64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: "audio/mp3" });
    
    // Create temporary URL for immediate playback
    const url = URL.createObjectURL(blob);
    
    return {
      blob: blob,
      url: url
    };
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

// Download audio utility
export const downloadAudio = (audioBlob: Blob, filename: string): void => {
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
