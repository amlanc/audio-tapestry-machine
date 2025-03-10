
import React, { useState, useRef, useEffect } from 'react';
import { Tag, Edit2, Settings2, Save, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Voice } from '@/types';
import { useToast } from '@/components/ui/use-toast';

interface VoiceTagProps {
  voice: Voice;
  onVoiceUpdate: (updatedVoice: Voice) => void;
}

const VoiceTag: React.FC<VoiceTagProps> = ({ voice, onVoiceUpdate }) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isCharacteristicsOpen, setIsCharacteristicsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [tag, setTag] = useState(voice.tag);
  const [characteristics, setCharacteristics] = useState({ ...voice.characteristics });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Create dummy audio context for simulation if direct audio isn't available
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const handleSave = () => {
    onVoiceUpdate({
      ...voice,
      tag,
      characteristics,
    });
    
    setIsEditing(false);
  };

  const handleCharacteristicChange = (key: keyof typeof characteristics, value: number) => {
    setCharacteristics(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    stopSimulatedAudio();
  };

  useEffect(() => {
    // Set up audio elements
    if (audioRef.current) {
      if (voice.audioUrl?.endsWith('.mp3') || voice.audioUrl?.endsWith('.wav')) {
        // Only set src if it's a proper audio file
        audioRef.current.src = voice.audioUrl;
      } else {
        // Clear src attribute when it's not a valid audio URL
        audioRef.current.removeAttribute('src');
      }
      audioRef.current.currentTime = voice.startTime;
    }
    
    return () => {
      stopSimulatedAudio();
    };
  }, [voice.audioUrl, voice.startTime]);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      } catch (err) {
        console.error('Failed to create audio context:', err);
      }
    }
  };

  const playSimulatedAudio = () => {
    initAudioContext();
    if (!audioContextRef.current || !gainNodeRef.current) return;
    
    try {
      // Stop any existing oscillator
      stopSimulatedAudio();
      
      // Create new oscillator
      oscillatorRef.current = audioContextRef.current.createOscillator();
      
      // Set frequency based on pitch characteristic (between 200-800 Hz)
      const baseFrequency = 300;
      const frequencyRange = 500;
      const frequency = baseFrequency + (characteristics.pitch * frequencyRange);
      oscillatorRef.current.frequency.value = frequency;
      
      // Set tone/type
      oscillatorRef.current.type = 'sine';
      
      // Set volume
      gainNodeRef.current.gain.value = isMuted ? 0 : 0.2;
      
      // Connect and start
      oscillatorRef.current.connect(gainNodeRef.current);
      oscillatorRef.current.start();
      
      // Schedule stop based on voice duration
      const duration = voice.endTime - voice.startTime;
      setTimeout(() => {
        stopSimulatedAudio();
        setIsPlaying(false);
      }, duration * 1000);
    } catch (err) {
      console.error('Error playing simulated audio:', err);
      stopSimulatedAudio();
    }
  };

  const stopSimulatedAudio = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      } catch (err) {
        console.error('Error stopping oscillator:', err);
      }
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      // Stop playback
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.pause();
        audioRef.current.currentTime = voice.startTime;
      }
      stopSimulatedAudio();
      setIsPlaying(false);
    } else {
      // Start playback
      if (audioRef.current && audioRef.current.src) {
        // Try to play the actual audio if we have a source
        audioRef.current.currentTime = voice.startTime;
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error("Error playing audio:", error);
            toast({
              title: "Using simulated audio",
              description: "Could not play the original audio. Using a simulated voice instead.",
              duration: 2000,
            });
            playSimulatedAudio();
            setIsPlaying(true);
          });
        }
      } else {
        // Use simulated audio when no source is available
        playSimulatedAudio();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0.2 : 0;
    }
    
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  return (
    <Card className={`border-l-4 border-l-${voice.color}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Tag className={`h-4 w-4 text-${voice.color}`} />
            {isEditing ? (
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="h-7 text-sm"
                autoFocus
              />
            ) : (
              <span>{voice.tag}</span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={toggleMute} 
              className="h-7 w-7 p-0"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={togglePlayback} 
              className="h-7 w-7 p-0"
              title="Play voice sample"
            >
              {isPlaying ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {isEditing ? (
              <Button size="sm" variant="ghost" onClick={handleSave} className="h-7 w-7 p-0">
                <Save className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-7 w-7 p-0">
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsCharacteristicsOpen(prev => !prev)} 
              className="h-7 w-7 p-0"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="text-xs text-muted-foreground mb-3">
          {Math.floor(voice.startTime / 60)}:{(voice.startTime % 60).toString().padStart(2, '0')} - {Math.floor(voice.endTime / 60)}:{(voice.endTime % 60).toString().padStart(2, '0')}
        </div>

        <audio 
          ref={audioRef}
          onEnded={handleAudioEnded}
          onTimeUpdate={(e) => {
            const audio = e.target as HTMLAudioElement;
            if (audio.currentTime >= voice.endTime) {
              audio.pause();
              audio.currentTime = voice.startTime;
              setIsPlaying(false);
            }
          }}
          style={{ display: 'none' }}
        />
        
        {isCharacteristicsOpen && (
          <div className="mt-3 space-y-3">
            <Separator />
            
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Pitch</span>
                  <span>{Math.round(characteristics.pitch * 100)}%</span>
                </div>
                <Slider 
                  value={[characteristics.pitch]} 
                  min={0} 
                  max={1} 
                  step={0.01}
                  onValueChange={([value]) => handleCharacteristicChange('pitch', value)}
                />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Tone</span>
                  <span>{Math.round(characteristics.tone * 100)}%</span>
                </div>
                <Slider 
                  value={[characteristics.tone]} 
                  min={0} 
                  max={1} 
                  step={0.01}
                  onValueChange={([value]) => handleCharacteristicChange('tone', value)}
                />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Speed</span>
                  <span>{Math.round(characteristics.speed * 100)}%</span>
                </div>
                <Slider 
                  value={[characteristics.speed]} 
                  min={0} 
                  max={1} 
                  step={0.01}
                  onValueChange={([value]) => handleCharacteristicChange('speed', value)}
                />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Clarity</span>
                  <span>{Math.round(characteristics.clarity * 100)}%</span>
                </div>
                <Slider 
                  value={[characteristics.clarity]} 
                  min={0} 
                  max={1} 
                  step={0.01}
                  onValueChange={([value]) => handleCharacteristicChange('clarity', value)}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceTag;
