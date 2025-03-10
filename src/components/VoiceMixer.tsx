
import React, { useState } from 'react';
import { Sliders, Download, Loader2, Play, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AudioFile, Voice } from '@/types';
import { mixVoices, downloadAudio, generateSpeechFromText } from '@/utils/audioHelpers';
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
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [ttsText, setTtsText] = useState("");
  const [showTtsInput, setShowTtsInput] = useState(false);
  const [mixedAudioUrl, setMixedAudioUrl] = useState<string | null>(null);

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
      
      const mixResult = await mixVoices(
        audioFile, 
        voices, 
        activeVoices, 
        showTtsInput ? ttsText : undefined
      );
      
      setMixedAudioUrl(mixResult.url);
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `mixed-voice-${timestamp}.wav`;
      
      // Download the mixed audio
      downloadAudio(mixResult.blob, filename);
      
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

  const handleGenerateSpeech = async () => {
    if (!ttsText.trim()) {
      toast({
        title: 'Text required',
        description: 'Please enter text for the TTS engine',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsGeneratingSpeech(true);
      
      // Use the first active voice for TTS characteristics
      const activeVoice = voices.find(v => activeVoices[v.id]);
      
      const speechUrl = await generateSpeechFromText(ttsText, activeVoice);
      
      toast({
        title: 'Speech generated',
        description: 'Text-to-speech conversion completed',
      });

      // Play the generated speech
      const audio = new Audio(speechUrl);
      audio.play();
      
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        title: 'Speech generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate speech',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingSpeech(false);
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
        
        <Separator />
        
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mb-4"
            onClick={() => setShowTtsInput(!showTtsInput)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {showTtsInput ? 'Hide Text-to-Speech' : 'Show Text-to-Speech'}
          </Button>
          
          {showTtsInput && (
            <div className="space-y-3">
              <Textarea
                placeholder="Enter text for the mixed voice to speak..."
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                rows={3}
                className="resize-none"
              />
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={handleGenerateSpeech}
                  disabled={isGeneratingSpeech || !ttsText.trim()}
                  className="w-full"
                >
                  {isGeneratingSpeech ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Preview Speech
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {mixedAudioUrl && (
          <div className="pt-4">
            <h3 className="text-sm font-medium mb-2">Mixed Audio Preview</h3>
            <audio src={mixedAudioUrl} controls className="w-full" />
          </div>
        )}
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
