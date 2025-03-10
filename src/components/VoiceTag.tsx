
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
    
    if (voice.audioUrl) {
      // Make sure we have a valid URL
      const validUrl = voice.audioUrl.startsWith('http') ? voice.audioUrl : null;
      
      if (validUrl) {
        console.log(`Set audio source to: ${validUrl}`);
        audio.src = validUrl;
        
        // Add event listeners  
        const handleCanPlayThrough = () => {
          console.log("Audio can play through");
          setAudioLoaded(true);
          setAudioError(false);
        };
        
        const handleError = (e: Event) => {
          console.error("Audio error:", e);
          setAudioError(true);
          setAudioLoaded(false);
          
          // Enable play button despite error for better UX - we'll show error message on play attempt
          setTimeout(() => {
            setAudioLoaded(true);
          }, 500);
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

        return () => {
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
      } else {
        setAudioError(true);
        setAudioLoaded(true); // Enable button for better UX
        console.error("Invalid audio URL:", voice.audioUrl);
      }
    } else {
      setAudioError(true);
      setAudioLoaded(true); // Enable button for better UX
      console.error("No audio URL available for voice:", voice.id);
    }
    
    // Always enable play button after a short delay
    // This helps in cases where audio loading fails silently
    const fallbackTimer = setTimeout(() => {
      if (!audioLoaded) {
        console.log("Using fallback to enable play button");
        setAudioLoaded(true);
      }
    }, 1000);
    
    return () => clearTimeout(fallbackTimer);
  }, [voice.audioUrl, voice.id]);

  const handleTimeUpdate = (e: Event) => {
    const audio = e.target as HTMLAudioElement;
    if (audio.currentTime >= voice.endTime) {
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
        toast({
          title: "Audio processing unavailable",
          description: "Your browser may not support advanced audio processing features.",
          variant: "destructive",
        });
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
    
    // Handle known audio error with a helpful message
    if (audioError) {
      toast({
        title: "Audio source unavailable",
        description: "The audio file could not be loaded. This could be due to network issues or the audio file being unavailable.",
        variant: "destructive",
      });
      return;
    }
    
    // Try to initialize audio context
    const contextInitialized = initAudioContext();
    if (!contextInitialized && !audioContextRef.current) {
      // Fallback to basic playback without audio processing
      try {
        audioRef.current.currentTime = voice.startTime || 0;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error("Error playing audio:", error);
          toast({
            title: "Playback error",
            description: "Could not play the audio. The audio may be unavailable or your browser doesn't support this audio format.",
            variant: "destructive",
          });
        });
        return;
      } catch (err) {
        console.error("Error during fallback playback:", err);
        toast({
          title: "Playback failed",
          description: "Could not play the audio segment. Please try again later.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Set starting position
    audioRef.current.currentTime = voice.startTime || 0;
    updateAudioParameters();
    
    // Play audio
    audioRef.current.play().then(() => {
      console.log(`Playing voice ${voice.tag} from ${voice.startTime}s to ${voice.endTime}s`);
      setIsPlaying(true);
    }).catch(error => {
      console.error("Error playing audio:", error);
      setAudioError(true);
      toast({
        title: "Playback error",
        description: "Could not play the audio segment. The audio may be unavailable.",
        variant: "destructive",
      });
    });
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
              <AlertTriangle className="h-4 w-4 text-amber-500" title="Audio source unavailable" />
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
              title={isPlaying ? "Stop" : "Play voice sample"}
            >
              {isPlaying ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className={`h-4 w-4 ${audioError ? "text-amber-500" : ""}`} />
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
