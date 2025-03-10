import { AudioFile, Voice, VoiceCharacteristics } from "../types";
import { supabase } from "@/integrations/supabase/client";

// Generate random ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Generate a random waveform for visual placeholder
export const generateRandomWaveform = (length: number = 100): number[] => {
  return Array.from({ length }, () => Math.random() * 0.8 + 0.2);
};

// Extract audio from YouTube using YouTube API (mock implementation)
export const extractAudioFromYouTube = async (youtubeUrl: string): Promise<AudioFile | null> => {
  console.log(`Extracting audio from YouTube URL: ${youtubeUrl}`);
  
  try {
    // Validate YouTube URL (basic validation)
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(youtubeUrl)) {
      throw new Error("Invalid YouTube URL");
    }
    
    // Extract video ID from the URL
    let videoId = '';
    if (youtubeUrl.includes("youtu.be")) {
      videoId = youtubeUrl.split("/").pop() || '';
    } else {
      const url = new URL(youtubeUrl);
      videoId = url.searchParams.get("v") || '';
    }
    
    if (!videoId) {
      throw new Error("Could not extract video ID from URL");
    }
    
    // In a real app, you would make a call to the YouTube API
    // For this demo, we'll simulate the API response
    
    // Mock fetch video information from YouTube API
    console.log(`Fetching data for video ID: ${videoId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a mock audio file with the video details
    const mockAudioFile: AudioFile = {
      id: generateId(),
      name: `YouTube Video ${videoId}`,
      file: null,
      url: youtubeUrl,
      duration: 180, // Mock duration of 3 minutes
      waveform: generateRandomWaveform(180),
    };
    
    // Store the audio file in Supabase
    const { data: storedAudio, error: storeError } = await supabase
      .from('audio_files')
      .insert({
        name: mockAudioFile.name,
        url: mockAudioFile.url,
        duration: mockAudioFile.duration,
        waveform: mockAudioFile.waveform
      })
      .select()
      .single();
      
    if (storeError) {
      console.error("Error storing audio in Supabase:", storeError);
      throw new Error("Failed to store audio file");
    }
    
    // Update the mockAudioFile with the stored ID
    mockAudioFile.id = storedAudio.id;
    
    // Log success
    console.log("Successfully extracted audio from YouTube and stored in Supabase");
    
    return mockAudioFile;
  } catch (error) {
    console.error("Error extracting audio from YouTube:", error);
    throw error;
  }
};

// Analyze audio file to detect voices (mock implementation)
export const analyzeAudioForVoices = async (audioFile: AudioFile): Promise<Voice[]> => {
  console.log(`Analyzing audio file: ${audioFile.name}`);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const numberOfVoices = Math.floor(Math.random() * 3) + 2;
  const voiceColors = ["audio-blue", "audio-purple", "audio-pink", "audio-green", "audio-yellow"];
  const mockVoices: Voice[] = [];
  
  for (let i = 0; i < numberOfVoices; i++) {
    const startTime = Math.floor(Math.random() * (audioFile.duration / 2));
    const endTime = startTime + Math.floor(Math.random() * (audioFile.duration - startTime - 10)) + 10;
    
    // Use the actual audio file URL for the voice preview
    const audioUrl = audioFile.url || '';
    
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
      audioUrl, // Using the actual audio file URL
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
        characteristics: voiceCharacteristics as any // Type casting to satisfy Supabase
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

// Mix voices based on settings and generate TTS
export const mixVoices = async (
  audioFile: AudioFile,
  voices: Voice[],
  activeVoices: Record<string, boolean>,
  ttsText?: string
): Promise<{ blob: Blob, url: string }> => {
  // This is a mock implementation
  // In a real application, you would use Web Audio API to mix audio
  
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

// Save voice characteristics (real implementation with Supabase)
export const saveVoiceCharacteristics = async (
  voice: Voice
): Promise<boolean> => {
  console.log(`Saving voice characteristics for voice ID ${voice.id}:`, voice.characteristics);
  
  try {
    const { error } = await supabase
      .from('voices')
      .update({
        tag: voice.tag,
        characteristics: voice.characteristics,
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

// Download mixed audio
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

// Generate speech from text using TTS API (mock implementation)
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
