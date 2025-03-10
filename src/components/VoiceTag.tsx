import React, { useState, useRef, useEffect } from 'react';
import { Tag, Edit2, Settings2, Save, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Voice } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { saveVoiceCharacteristics } from '@/utils/audioHelpers';

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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  const getWaveformType = (color: string): OscillatorType => {
    const waveformMap: Record<string, OscillatorType> = {
      'audio-blue': 'sine',
      'audio-purple': 'square',
      'audio-pink': 'sawtooth',
      'audio-green': 'triangle',
      'audio-yellow': 'sine',
    };
    return waveformMap[color] || 'sine';
  };

  const handleSave = async () => {
    const updatedVoice = {
      ...voice,
      tag,
      characteristics,
    };
    
    onVoiceUpdate(updatedVoice);
    
    try {
      const success = await saveVoiceCharacteristics(updatedVoice);
      if (success) {
        toast({
          title: "Voice updated",
          description: `"${tag}" voice characteristics saved successfully.`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error saving voice:", error);
      toast({
        title: "Save failed",
        description: "Could not save voice characteristics. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
    
    setIsEditing(false);
  };

  const handleCharacteristicChange = (key: keyof typeof characteristics, value: number) => {
    setCharacteristics(prev => ({
      ...prev,
      [key]: value,
    }));

    if (isPlaying && oscillatorRef.current && filterRef.current) {
      updateAudioParameters();
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    stopSimulatedAudio();
  };

  useEffect(() => {
    if (audioRef.current) {
      const isValidAudioUrl = voice.audioUrl && 
        (voice.audioUrl.endsWith('.mp3') || 
         voice.audioUrl.endsWith('.wav') || 
         voice.audioUrl.startsWith('blob:') ||
         voice.audioUrl.startsWith('data:audio/'));

      if (isValidAudioUrl) {
        audioRef.current.src = voice.audioUrl;
      } else {
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
        filterRef.current = audioContextRef.current.createBiquadFilter();
        filterRef.current.type = "lowpass";
        
        filterRef.current.connect(gainNodeRef.current);
        gainNodeRef.current.connect(audioContextRef.current.destination);
      } catch (err) {
        console.error('Failed to create audio context:', err);
      }
    }
  };

  const updateAudioParameters = () => {
    if (!oscillatorRef.current || !filterRef.current || !gainNodeRef.current) return;
    
    const baseFrequency = 220;
    const frequencyMultiplier = Math.pow(2, characteristics.pitch * 2);
    oscillatorRef.current.frequency.value = baseFrequency * frequencyMultiplier;
    
    const filterFrequency = 500 + (characteristics.tone * 10000);
    filterRef.current.frequency.value = filterFrequency;
    filterRef.current.Q.value = 1 + characteristics.clarity * 10;
    
    const volumeValue = isMuted ? 0 : 0.3 * voice.volume;
    gainNodeRef.current.gain.value = volumeValue;
  };

  const playSimulatedAudio = () => {
    initAudioContext();
    if (!audioContextRef.current || !filterRef.current || !gainNodeRef.current) return;
    
    try {
      stopSimulatedAudio();
      
      oscillatorRef.current = audioContextRef.current.createOscillator();
      oscillatorRef.current.type = getWaveformType(voice.color);
      
      oscillatorRef.current.connect(filterRef.current);
      
      updateAudioParameters();
      
      oscillatorRef.current.start();
      
      const duration = Math.min(voice.endTime - voice.startTime, 5);
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
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.pause();
        audioRef.current.currentTime = voice.startTime;
      }
      stopSimulatedAudio();
      setIsPlaying(false);
    } else {
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.currentTime = voice.startTime;
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error("Error playing audio:", error);
            toast({
              title: "Using simulated audio",
              description: "Playing a synthesized representation of this voice.",
              duration: 2000,
            });
            playSimulatedAudio();
            setIsPlaying(true);
          });
        }
      } else {
        playSimulatedAudio();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0.3 * voice.volume : 0;
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
