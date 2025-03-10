
import React, { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { analyzeAudioForVoices } from '@/utils/audioHelpers';
import { AudioFile, Voice } from '@/types';
import { useToast } from '@/components/ui/use-toast';

interface VoiceAnalyzerProps {
  audioFile: AudioFile | null;
  onVoicesDetected: (voices: Voice[]) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
}

const VoiceAnalyzer: React.FC<VoiceAnalyzerProps> = ({ 
  audioFile, 
  onVoicesDetected, 
  isAnalyzing,
  setIsAnalyzing
}) => {
  const { toast } = useToast();

  const handleAnalyzeVoices = async () => {
    if (!audioFile) {
      toast({
        title: 'No audio file',
        description: 'Please upload an audio file or extract from YouTube first',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsAnalyzing(true);
      
      const detectedVoices = await analyzeAudioForVoices(audioFile);
      onVoicesDetected(detectedVoices);
      
      toast({
        title: 'Analysis complete',
        description: `Detected ${detectedVoices.length} voices in the audio`,
      });
    } catch (error) {
      console.error('Error analyzing voices:', error);
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze voices',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-accent/20 p-4">
            <Wand2 className="h-8 w-8 text-accent" />
          </div>
          
          <div>
            <h3 className="font-semibold text-lg">Voice Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Detect different voices in your audio
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-center pb-6 pt-0">
        <Button 
          onClick={handleAnalyzeVoices}
          disabled={!audioFile || isAnalyzing}
          className="bg-accent hover:bg-accent/90"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>Analyze Voices</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VoiceAnalyzer;
