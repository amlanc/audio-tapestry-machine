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
  const [audioError, setAudioError] = useState(false);
  const [embedVisible, setEmbedVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
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
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setEmbedVisible(false);
  };

  const handleError = (e: Event) => {
    console.error("Audio error:", e);
    setAudioError(true);
    setIsPlaying(false);
    toast({
      title: "Audio Error",
      description: "Unable to play audio. Trying alternative playback method.",
      variant: "destructive",
    });
    
    if (voice.audioUrl && voice.audioUrl.includes('youtube.com')) {
      setEmbedVisible(true);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('ended', handleAudioEnded);
      audioRef.current.removeEventListener('error', handleError);
    }
    
    const audio = new Audio();
    audioRef.current = audio;
    
    setAudioError(false);
    
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleAudioEnded);
    
    return () => {
      audio.pause();
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleAudioEnded);
      setEmbedVisible(false);
    };
  }, [voice.id, toast]);

  const togglePlayback = () => {
    if (embedVisible) {
      setEmbedVisible(false);
      setIsPlaying(false);
      return;
    }
    
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    
    const isYoutubeUrl = voice.audioUrl && 
      (voice.audioUrl.includes('youtube.com') || voice.audioUrl.includes('youtu.be'));
    
    if (isYoutubeUrl) {
      setEmbedVisible(true);
      setIsPlaying(true);
      return;
    }
    
    if (!audioRef.current) {
      return;
    }
    
    if (voice.audioUrl) {
      audioRef.current.src = voice.audioUrl;
      audioRef.current.volume = isMuted ? 0 : 1;
      
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(error => {
          console.error("Error playing audio:", error);
          setAudioError(true);
          
          if (isYoutubeUrl) {
            setEmbedVisible(true);
            setIsPlaying(true);
          } else {
            toast({
              title: "Playback error",
              description: "Could not play the audio sample. Please try again later.",
              variant: "destructive",
            });
          }
        });
    } else {
      setAudioError(true);
      toast({
        title: "Missing audio",
        description: "No audio source available for this voice.",
        variant: "destructive",
      });
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 1 : 0;
    }
  };

  const getYouTubeEmbedUrl = (url: string): string => {
    try {
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        let startTime = 0;
        
        if (url.includes('start=')) {
          const startParam = url.split('start=')[1].split('&')[0];
          startTime = parseInt(startParam) || 0;
        }
        
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startTime}&enablejsapi=1`;
      }
      
      if (url.includes('youtube.com')) {
        if (url.includes('/embed/')) {
          return url.includes('autoplay=1') ? url : `${url}&autoplay=1`;
        }
        
        if (url.includes('watch?v=')) {
          const videoId = new URL(url).searchParams.get('v');
          let startTime = 0;
          
          if (url.includes('start=')) {
            const startParam = new URL(url).searchParams.get('start');
            startTime = parseInt(startParam || '0');
          }
          
          return `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startTime}&enablejsapi=1`;
        }
      }
      
      return url;
    } catch {
      return url;
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
            {audioError && !embedVisible && (
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
              disabled={embedVisible}
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
            >
              {isPlaying ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
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
        
        {embedVisible && voice.audioUrl && (
          <div className="my-2 rounded overflow-hidden aspect-video">
            <iframe 
              ref={iframeRef}
              src={getYouTubeEmbedUrl(voice.audioUrl)}
              title={`${voice.tag} sample`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => console.log("YouTube iframe loaded")}
            ></iframe>
          </div>
        )}
        
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
