
// Basic audio utility functions

// Generate random ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Generate a random waveform for visual placeholder
export const generateRandomWaveform = (length: number = 100): number[] => {
  return Array.from({ length }, () => Math.random() * 0.8 + 0.2);
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
