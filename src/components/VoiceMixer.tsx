
import React, { useState } from 'react';
import { Sliders, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { AudioFile, Voice } from '@/types';
import { mixVoices, downloadAudio } from '@/utils/audioHelpers';
import { useToast } from '@/components/ui/use-toast';

interface VoiceMixerProps {
  audioFile: AudioFile | null;
  voices: Voice[];
  onVoiceUpdate: (voice: Voice) => void;
}

const VoiceMixer: React.FC<VoiceMixerProps> = ({ audioFile, voices, onVoiceUpdate }) => {
  const { toast } = useToast();
  const [activeVoices, setActiveVoices] = useState<Record<string, boolean>>(
    voices.reduce((acc, voice) => ({ ...acc, [voice.id]: true }), {})
  );
  const [masterVolume, setMasterVolume] = useState(1);
  const [isMixing, setIsMixing] = useState(false);

  const handleVoiceToggle = (voiceId: string, isActive: boolean) => {
    setActiveVoices(prev => ({
      ...prev,
      [voiceId]: isActive,
    }));
  };

  const handleVolumeChange = (voiceId: string, volume: number) => {
    const voice = voices.find(v => v.id === voiceId);
    if (voice) {
      onVoiceUpdate({
        ...voice,
        volume,
      });
    }
  };

  const handleMixAndDownload = async () => {
    if (!audioFile) {
      toast({
        title: 'No audio file',
        description: 'Please upload an audio file first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsMixing(true);
      
      const mixedAudioBlob = await mixVoices(audioFile, voices, activeVoices);
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `mixed-voice-${timestamp}.wav`;
      
      // Download the mixed audio
      downloadAudio(mixedAudioBlob, filename);
      
      toast({
        title: 'Mix complete',
        description: 'Your mixed audio is ready for download',
      });
    } catch (error) {
      console.error('Error mixing voices:', error);
      toast({
        title: 'Mixing failed',
        description: error instanceof Error ? error.message : 'Failed to mix voices',
        variant: 'destructive',
      });
    } finally {
      setIsMixing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="h-5 w-5" />
          Voice Mixer
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Master Volume</span>
            <span>{Math.round(masterVolume * 100)}%</span>
          </div>
          <Slider 
            value={[masterVolume]} 
            min={0} 
            max={1} 
            step={0.01}
            onValueChange={([value]) => setMasterVolume(value)}
          />
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          {voices.map((voice) => (
            <div key={voice.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={activeVoices[voice.id] || false}
                    onCheckedChange={(checked) => handleVoiceToggle(voice.id, checked)}
                  />
                  <span className={`text-sm font-medium ${activeVoices[voice.id] ? `text-${voice.color}` : 'text-muted-foreground'}`}>
                    {voice.tag}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(voice.volume * 100)}%
                </span>
              </div>
              
              <Slider 
                value={[voice.volume]} 
                min={0} 
                max={1} 
                step={0.01}
                onValueChange={([value]) => handleVolumeChange(voice.id, value)}
                disabled={!activeVoices[voice.id]}
                className={activeVoices[voice.id] ? '' : 'opacity-50'}
              />
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full"
          onClick={handleMixAndDownload}
          disabled={isMixing || !audioFile || voices.length === 0}
        >
          {isMixing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mixing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Mix & Download
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VoiceMixer;
