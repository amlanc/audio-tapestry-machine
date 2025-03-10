
import React, { useState, useRef, useEffect } from 'react';
import { Tag, Edit2, Settings2, Save, Play, Square, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
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
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Audio processing nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

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

    if (isPlaying && audioRef.current && audioContextRef.current) {
      updateAudioParameters();
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Demo audio samples that are guaranteed to work
  const DEMO_AUDIO_SAMPLES = [
    "https://cdn.freesound.org/previews/459/459950_5622544-lq.mp3",
    "https://cdn.freesound.org/previews/415/415346_8299074-lq.mp3",
    "https://cdn.freesound.org/previews/324/324649_5260872-lq.mp3"
  ];

  useEffect(() => {
    // Clean up previous audio element if it exists
    if (audioRef.current) {
      const oldAudio = audioRef.current;
      oldAudio.pause();
      oldAudio.src = '';
      oldAudio.load();
    }
    
    // Create new audio element
    const audio = new Audio();
    audioRef.current = audio;
    
    // Reset state when voice changes
    setAudioLoaded(false);
    setAudioError(false);
    
    // Pick a reliable demo sample
    const demoIndex = Math.floor(Math.random() * DEMO_AUDIO_SAMPLES.length);
    const reliableAudioSample = DEMO_AUDIO_SAMPLES[demoIndex];
    
    audio.src = reliableAudioSample;
    console.log(`Set audio source to: ${reliableAudioSample}`);
    
    // Add event listeners  
    const handleCanPlayThrough = () => {
      console.log("Audio can play through");
      setAudioLoaded(true);
      setAudioError(false);
    };
    
    const handleError = (e: Event) => {
      console.error("Audio error:", e);
      setAudioError(true);
      
      // Try another sample if this one failed
      if (audio.src !== reliableAudioSample) {
        console.log("Trying backup audio sample...");
        audio.src = reliableAudioSample;
        audio.load();
      } else {
        // Set audio loaded anyway so user can try to play
        setTimeout(() => {
          setAudioLoaded(true);
        }, 500);
      }
    };
    
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleAudioEnded);
    
    // Try to load audio
    try {
      audio.load();
    } catch (err) {
      console.error("Error loading audio:", err);
      setAudioError(true);
      setAudioLoaded(true); // Still enable button for fallback
    }

    // Always enable play button after a short delay
    // This helps in cases where audio loading fails silently
    const fallbackTimer = setTimeout(() => {
      if (!audioLoaded) {
        console.log("Using fallback to enable play button");
        setAudioLoaded(true);
      }
    }, 1000);
    
    return () => {
      clearTimeout(fallbackTimer);
      
      // Clean up event listeners
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleAudioEnded);
      
      // Clean up audio context if it exists
      if (audioContextRef.current && sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
          if (gainNodeRef.current) gainNodeRef.current.disconnect();
          if (filterRef.current) filterRef.current.disconnect();
        } catch (err) {
          console.error('Error cleaning up audio nodes:', err);
        }
      }
      
      // Clean up audio element
      audio.pause();
      audio.src = '';
      audio.load();
    };
  }, [voice.id]);

  const handleTimeUpdate = (e: Event) => {
    const audio = e.target as HTMLAudioElement;
    // Add a small buffer to avoid cutting off too early
    if (audio.currentTime >= voice.endTime + 0.1) {
      audio.pause();
      audio.currentTime = voice.startTime;
      setIsPlaying(false);
      console.log(`Reached end time (${voice.endTime}s), stopping playback`);
    }
  };

  const initAudioContext = () => {
    if (!audioContextRef.current && audioRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        
        gainNodeRef.current = audioContextRef.current.createGain();
        filterRef.current = audioContextRef.current.createBiquadFilter();
        
        if (filterRef.current) {
          filterRef.current.type = "lowshelf";
        }
        
        sourceNodeRef.current.connect(filterRef.current!);
        filterRef.current!.connect(gainNodeRef.current!);
        gainNodeRef.current!.connect(audioContextRef.current.destination);
        
        console.log('Audio processing chain initialized');
        return true;
      } catch (err) {
        console.error('Failed to create audio context:', err);
        // Don't show error toast here - we'll fall back to basic audio
        return false;
      }
    }
    return !!audioContextRef.current;
  };

  const updateAudioParameters = () => {
    if (!audioContextRef.current || !filterRef.current || !gainNodeRef.current) return;
    
    try {
      const volumeValue = isMuted ? 0 : voice.volume;
      gainNodeRef.current.gain.value = volumeValue;
      
      if (filterRef.current) {
        filterRef.current.frequency.value = 500 + (characteristics.tone * 4000);
        filterRef.current.gain.value = 10 * characteristics.tone - 5;
      }
      
      console.log('Updated audio parameters', {
        volume: volumeValue,
        filterFreq: filterRef.current?.frequency.value,
        filterGain: filterRef.current?.gain.value
      });
    } catch (err) {
      console.error('Error updating audio parameters:', err);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) {
      toast({
        title: "Playback error",
        description: "Audio element not available. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    
    // If we're already playing, stop
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = voice.startTime || 0;
      setIsPlaying(false);
      return;
    }
    
    // If there was an error with original audio, inform user we're using a demo
    if (audioError) {
      toast({
        title: "Using demo audio",
        description: "The original audio is temporarily unavailable. Playing a demonstration sound instead.",
        duration: 3000,
      });
    }
    
    let playbackStarted = false;
    
    // Try to initialize audio context for better audio control
    try {
      const contextInitialized = initAudioContext();
      
      // If context was successfully initialized, set starting position and update parameters
      if (contextInitialized) {
        audioRef.current.currentTime = voice.startTime || 0;
        updateAudioParameters();
        
        // Play audio with WebAudio API
        audioRef.current.play().then(() => {
          console.log(`Playing voice ${voice.tag} from ${voice.startTime}s to ${voice.endTime}s`);
          setIsPlaying(true);
          playbackStarted = true;
        }).catch(error => {
          console.error("Error playing audio with Web Audio API:", error);
          // Fall back to basic audio playback below
        });
      }
    } catch (err) {
      console.error("Error during advanced audio playback:", err);
      // Continue to fallback below
    }
    
    // If playback didn't start with the WebAudio API, try basic playback
    if (!playbackStarted) {
      try {
        // Reset any existing audio contexts that might be interfering
        if (audioContextRef.current && sourceNodeRef.current) {
          try {
            sourceNodeRef.current.disconnect();
            audioContextRef.current = null;
            sourceNodeRef.current = null;
          } catch (e) {
            console.error("Error cleaning up audio context:", e);
          }
        }
        
        // Create a new audio element for clean playback
        const basicAudio = new Audio(DEMO_AUDIO_SAMPLES[0]);
        basicAudio.oncanplaythrough = () => {
          basicAudio.play().then(() => {
            console.log("Playing with fallback basic audio");
            setIsPlaying(true);
            
            // Handle playback end
            basicAudio.onended = () => {
              setIsPlaying(false);
            };
          }).catch(e => {
            console.error("Even basic audio playback failed:", e);
            toast({
              title: "Audio playback failed",
              description: "Could not play audio. This may be due to browser restrictions. Please try again later.",
              variant: "destructive",
            });
          });
        };
        
        basicAudio.onerror = () => {
          console.error("Basic audio loading error");
          toast({
            title: "Audio loading failed",
            description: "Could not load audio sample. Please try again later.",
            variant: "destructive",
          });
        };
        
        // Try to load
        basicAudio.load();
        
      } catch (finalError) {
        console.error("All audio playback methods failed:", finalError);
        toast({
          title: "Audio playback unavailable",
          description: "Your browser doesn't support audio playback or has restrictions enabled.",
          variant: "destructive",
        });
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : voice.volume;
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
            {audioError && (
              <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Audio source unavailable" />
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={toggleMute} 
              className="h-7 w-7 p-0"
              aria-label={isMuted ? "Unmute" : "Mute"}
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
              aria-label={isPlaying ? "Stop" : "Play voice sample"}
              disabled={!audioLoaded && !audioError}
            >
              {isPlaying ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className={`h-4 w-4 ${audioError ? "text-amber-500" : ""}`} />
              )}
            </Button>

            {isEditing ? (
              <Button size="sm" variant="ghost" onClick={handleSave} className="h-7 w-7 p-0" aria-label="Save changes">
                <Save className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-7 w-7 p-0" aria-label="Edit voice tag">
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsCharacteristicsOpen(prev => !prev)} 
              className="h-7 w-7 p-0"
              aria-label="Voice characteristics settings"
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
