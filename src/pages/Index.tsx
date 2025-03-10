
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import AudioUploader from '@/components/AudioUploader';
import YouTubeInput from '@/components/YouTubeInput';
import AudioWaveform from '@/components/AudioWaveform';
import VoiceAnalyzer from '@/components/VoiceAnalyzer';
import VoiceTag from '@/components/VoiceTag';
import VoiceMixer from '@/components/VoiceMixer';
import { AudioFile, Voice } from '@/types';
import { saveVoiceCharacteristics } from '@/utils/audioHelpers';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const { toast } = useToast();
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Handle audio file upload or extraction
  const handleAudioFile = (file: AudioFile) => {
    setAudioFile(file);
    setVoices([]);
    setCurrentTime(0);
  };

  // Handle voices detected from analysis
  const handleVoicesDetected = (detectedVoices: Voice[]) => {
    setVoices(detectedVoices);
  };

  // Handle voice update (tag, characteristics, etc.)
  const handleVoiceUpdate = async (updatedVoice: Voice) => {
    try {
      // Update voice in state
      setVoices(prev => 
        prev.map(voice => 
          voice.id === updatedVoice.id ? updatedVoice : voice
        )
      );
      
      // Save voice characteristics to database (mock)
      await saveVoiceCharacteristics(updatedVoice);
    } catch (error) {
      console.error('Error updating voice:', error);
      toast({
        title: 'Error saving voice',
        description: 'Failed to save voice characteristics',
        variant: 'destructive',
      });
    }
  };

  // Auto-increment current time for demo purposes
  useEffect(() => {
    if (!audioFile) return;
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= audioFile.duration) {
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [audioFile]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AudioUploader onAudioUploaded={handleAudioFile} isLoading={isLoading || isAnalyzing} />
              <YouTubeInput onAudioExtracted={handleAudioFile} isLoading={isLoading || isAnalyzing} />
            </div>
            
            {audioFile && (
              <AudioWaveform 
                audioFile={audioFile} 
                voices={voices} 
                currentTime={currentTime} 
                onTimeUpdate={setCurrentTime} 
              />
            )}
            
            {voices.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Detected Voices</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {voices.map((voice) => (
                    <VoiceTag 
                      key={voice.id} 
                      voice={voice} 
                      onVoiceUpdate={handleVoiceUpdate} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <VoiceAnalyzer 
              audioFile={audioFile} 
              onVoicesDetected={handleVoicesDetected} 
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
            />
            
            {voices.length > 0 && (
              <VoiceMixer 
                audioFile={audioFile} 
                voices={voices} 
                onVoiceUpdate={handleVoiceUpdate} 
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
