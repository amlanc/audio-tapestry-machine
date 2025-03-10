
export interface AudioFile {
  id: string;
  name: string;
  file: File | null;
  url: string | null;
  duration: number;
  waveform: number[];
}

export interface Voice {
  id: string;
  audioId: string;
  startTime: number;
  endTime: number;
  tag: string;
  color: string;
  volume: number;
  characteristics: VoiceCharacteristics;
}

export interface VoiceCharacteristics {
  pitch: number;
  tone: number;
  speed: number;
  clarity: number;
}

export interface MixSettings {
  voices: Record<string, boolean>;
  masterVolume: number;
}
