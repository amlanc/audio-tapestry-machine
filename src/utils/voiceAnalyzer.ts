
import { AudioFile, Voice, VoiceCharacteristics } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { generateId } from "./audioCore";

// Analyze audio file to detect voices and create segments
export const analyzeAudioForVoices = async (audioFile: AudioFile): Promise<Voice[]> => {
  console.log(`Analyzing audio file: ${audioFile.name}`);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // For demonstration, we'll create segments of the original audio
  const numberOfVoices = Math.floor(Math.random() * 3) + 2;
  const voiceColors = ["audio-blue", "audio-purple", "audio-pink", "audio-green", "audio-yellow"];
  const mockVoices: Voice[] = [];
  
  // Get the audio URL from the original audio file
  // In a real implementation, we'd analyze the audio and extract segment audio
  const audioUrl = audioFile.url || "https://assets.mixkit.co/active_storage/sfx/939/939-preview.mp3";
  
  // Divide the audio into segments for different "voices"
  const segmentLength = Math.floor(audioFile.duration / (numberOfVoices + 1));
  
  for (let i = 0; i < numberOfVoices; i++) {
    // Create segments that don't overlap too much
    const startTime = i * segmentLength;
    const endTime = startTime + segmentLength + 5; // Slight overlap
    
    const voiceCharacteristics: VoiceCharacteristics = {
      pitch: Math.random(),
      tone: Math.random(),
      speed: Math.random(),
      clarity: Math.random(),
    };
    
    const mockVoice: Voice = {
      id: generateId(),
      audioId: audioFile.id,
      startTime,
      endTime,
      tag: `Voice ${i + 1}`,
      color: voiceColors[i % voiceColors.length],
      volume: 1.0,
      audioUrl: audioUrl, // Use the original audio URL
      characteristics: voiceCharacteristics,
    };
    
    // Store the voice in Supabase
    const { data: storedVoice, error: storeError } = await supabase
      .from('voices')
      .insert({
        audio_id: audioFile.id,
        tag: mockVoice.tag,
        start_time: mockVoice.startTime,
        end_time: mockVoice.endTime,
        color: mockVoice.color,
        volume: mockVoice.volume,
        audio_url: mockVoice.audioUrl,
        characteristics: {
          pitch: voiceCharacteristics.pitch,
          tone: voiceCharacteristics.tone,
          speed: voiceCharacteristics.speed,
          clarity: voiceCharacteristics.clarity,
        }
      })
      .select()
      .single();
      
    if (storeError) {
      console.error("Error storing voice in Supabase:", storeError);
    } else {
      mockVoice.id = storedVoice.id;
    }
    
    mockVoices.push(mockVoice);
  }
  
  return mockVoices;
};

// Save voice characteristics
export const saveVoiceCharacteristics = async (voice: Voice): Promise<boolean> => {
  console.log(`Saving voice characteristics for voice ID ${voice.id}:`, voice.characteristics);
  
  try {
    const { error } = await supabase
      .from('voices')
      .update({
        tag: voice.tag,
        characteristics: {
          pitch: voice.characteristics.pitch,
          tone: voice.characteristics.tone,
          speed: voice.characteristics.speed,
          clarity: voice.characteristics.clarity,
        },
        volume: voice.volume,
        updated_at: new Date().toISOString()
      })
      .eq('id', voice.id);
      
    if (error) {
      console.error("Error updating voice in Supabase:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error saving voice characteristics:", error);
    return false;
  }
};
