
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import AudioUploader from '@/components/AudioUploader';
import YouTubeInput from '@/components/YouTubeInput';
import AudioWaveform from '@/components/AudioWaveform';
import VoiceAnalyzer from '@/components/VoiceAnalyzer';
import VoiceTag from '@/components/VoiceTag';
import VoiceMixer from '@/components/VoiceMixer';
import Footer from '@/components/Footer';
import { AudioFile, Voice } from '@/types';
import { saveVoiceCharacteristics } from '@/utils/audioHelpers';
import { useToast } from '@/components/ui/use-toast';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { toast } = useToast();
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const youtubeInputRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

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

  // Check for source query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const source = searchParams.get('source');
    
    if (source === 'youtube' && youtubeInputRef.current) {
      // Scroll to YouTube input
      youtubeInputRef.current.scrollIntoView({ behavior: 'smooth' });
      
      // Add subtle highlight animation
      youtubeInputRef.current.classList.add('highlight-pulse');
      setTimeout(() => {
        youtubeInputRef.current?.classList.remove('highlight-pulse');
      }, 2000);
    }
  }, [location.search]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Audio Tapestry Studio</h1>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AudioUploader onAudioUploaded={handleAudioFile} isLoading={isLoading || isAnalyzing} />
              <div ref={youtubeInputRef} className="transition-all">
                <YouTubeInput onAudioExtracted={handleAudioFile} isLoading={isLoading || isAnalyzing} />
              </div>
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
      
      <Footer />

      <style jsx global>{`
        .highlight-pulse {
          animation: pulse 2s ease-in-out;
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(147, 51, 234, 0); }
          100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0); }
        }
      `}</style>
    </div>
  );
};

export default Index;
