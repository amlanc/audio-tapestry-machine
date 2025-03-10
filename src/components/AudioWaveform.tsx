
import React, { useEffect, useRef } from 'react';
import { AudioFile, Voice } from '@/types';

interface AudioWaveformProps {
  audioFile: AudioFile;
  voices: Voice[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ 
  audioFile, 
  voices, 
  currentTime, 
  onTimeUpdate 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { waveform, duration } = audioFile;

  // Handle click to set current time
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const percentage = clickPosition / rect.width;
    const newTime = Math.max(0, Math.min(percentage * duration, duration));
    
    onTimeUpdate(newTime);
  };

  // Determine bar color based on voices
  const getBarColor = (index: number): string => {
    const timePoint = (index / waveform.length) * duration;
    
    for (const voice of voices) {
      if (timePoint >= voice.startTime && timePoint <= voice.endTime) {
        return `bg-${voice.color}`;
      }
    }
    
    return 'bg-primary';
  };

  return (
    <div className="w-full audio-container p-4">
      <div className="text-sm font-medium mb-2 flex justify-between">
        <span>{audioFile.name}</span>
        <span>{Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
      </div>
      
      <div 
        ref={containerRef}
        className="w-full h-32 flex items-end cursor-pointer relative"
        onClick={handleClick}
      >
        {waveform.map((height, index) => (
          <div
            key={index}
            className={`waveform-bar ${getBarColor(index)}`}
            style={{ 
              height: `${height * 100}%`,
              opacity: index / waveform.length < currentTime / duration ? 1 : 0.5
            }}
          />
        ))}
        
        {/* Current time indicator */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-white"
          style={{ 
            left: `${(currentTime / duration) * 100}%`,
            opacity: 0.7
          }}
        />
        
        {/* Voice region indicators */}
        {voices.map((voice) => (
          <div 
            key={voice.id}
            className={`absolute h-2 bottom-0 rounded-full bg-${voice.color}`}
            style={{ 
              left: `${(voice.startTime / duration) * 100}%`,
              width: `${((voice.endTime - voice.startTime) / duration) * 100}%`,
              opacity: 0.8
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AudioWaveform;
