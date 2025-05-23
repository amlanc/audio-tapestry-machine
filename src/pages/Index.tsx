
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import AudioUploader from '@/components/AudioUploader';
import YouTubeInput from '@/components/YouTubeInput';
import AudioWaveform from '@/components/AudioWaveform';
import VoiceTag from '@/components/VoiceTag';
import VoiceMixer from '@/components/VoiceMixer';
import Footer from '@/components/Footer';
import { AudioFile, Voice, VoiceCharacteristics } from '@/types';
import { saveVoiceCharacteristics, analyzeAudioForVoices, deleteAllVoices } from '@/utils/audioHelpers';
import { useToast } from '@/components/ui/use-toast';
import { Home, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const sanitizeYouTubeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be') {
      urlObj.searchParams.set('autoplay', '0');
      return urlObj.toString();
    }
    return url;
  } catch {
    return url;
  }
};

const Index = () => {
  const { toast } = useToast();
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const youtubeInputRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const handleAudioFile = async (file: AudioFile) => {
    setAudioFile(file);
    setVoices([]);
    setCurrentTime(0);
    
    await analyzeVoices(file);
  };

  const handleDeleteAllVoices = async () => {
    if (!audioFile) return;
    
    try {
      setIsLoading(true);
      toast({
        title: 'Deleting voices',
        description: 'Removing all detected voices...',
      });
      
      const success = await deleteAllVoices(audioFile.id);
      
      if (success) {
        setVoices([]);
        toast({
          title: 'Voices deleted',
          description: 'All voices have been removed successfully.',
        });
      } else {
        throw new Error('Failed to delete voices');
      }
    } catch (error) {
      console.error('Error deleting voices:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete voices',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyzeAudio = async () => {
    if (!audioFile) return;
    
    try {
      await handleDeleteAllVoices();
      await analyzeVoices(audioFile);
      
      toast({
        title: 'Audio reanalyzed',
        description: 'The audio has been reanalyzed for voices.',
      });
    } catch (error) {
      console.error('Error reanalyzing audio:', error);
      toast({
        title: 'Reanalysis failed',
        description: error instanceof Error ? error.message : 'Failed to reanalyze audio',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVoice = async (voiceId: string) => {
    setVoices(prev => prev.filter(voice => voice.id !== voiceId));
  };

  const analyzeVoices = async (file: AudioFile) => {
    try {
      setIsAnalyzing(true);
      toast({
        title: 'Analyzing audio',
        description: 'Detecting voices and creating segments...',
      });
      
      const { data: existingVoices, error: fetchError } = await supabase
        .from('voices')
        .select('*')
        .eq('audio_id', file.id);
        
      if (fetchError) {
        console.error('Error fetching existing voices:', fetchError);
        throw fetchError;
      }
      
      let detectedVoices: Voice[];
      
      if (existingVoices && existingVoices.length > 0) {
        // Use existing voices from the database
        detectedVoices = existingVoices.map(v => {
          const characteristics: VoiceCharacteristics = {
            pitch: typeof v.characteristics === 'object' && v.characteristics !== null ? 
              (v.characteristics as any).pitch || 0 : 0,
            tone: typeof v.characteristics === 'object' && v.characteristics !== null ? 
              (v.characteristics as any).tone || 0 : 0,
            speed: typeof v.characteristics === 'object' && v.characteristics !== null ? 
              (v.characteristics as any).speed || 0 : 0,
            clarity: typeof v.characteristics === 'object' && v.characteristics !== null ? 
              (v.characteristics as any).clarity || 0 : 0
          };
          
          return {
            id: v.id,
            audioId: v.audio_id,
            startTime: v.start_time,
            endTime: v.end_time,
            tag: v.tag,
            color: v.color,
            volume: v.volume,
            audioUrl: v.audio_url || file.url, // Use the stored audio URL or fall back to the original file URL
            characteristics: characteristics
          };
        });
        
        toast({
          title: 'Voices retrieved',
          description: `Found ${detectedVoices.length} previously analyzed voices. Try playing them to hear the audio segments.`,
        });
      } else {
        console.log('No existing voices found, analyzing audio file...');
        detectedVoices = await analyzeAudioForVoices(file);
        
        toast({
          title: 'Analysis complete',
          description: `Detected ${detectedVoices.length} voices in the audio. Click the play button to hear each segment.`,
        });
      }
      
      setVoices(detectedVoices);
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

  const handleVoiceUpdate = async (updatedVoice: Voice) => {
    try {
      setVoices(prev => 
        prev.map(voice => 
          voice.id === updatedVoice.id ? {
            ...updatedVoice,
            characteristics: {
              pitch: updatedVoice.characteristics.pitch || 0,
              tone: updatedVoice.characteristics.tone || 0,
              speed: updatedVoice.characteristics.speed || 0,
              clarity: updatedVoice.characteristics.clarity || 0
            }
          } : voice
        )
      );
      
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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const source = searchParams.get('source');
    
    if (source === 'youtube' && youtubeInputRef.current) {
      youtubeInputRef.current.scrollIntoView({ behavior: 'smooth' });
      
      youtubeInputRef.current.classList.add('highlight-pulse');
      setTimeout(() => {
        youtubeInputRef.current?.classList.remove('highlight-pulse');
      }, 2000);
    }
  }, [location.search]);

  useEffect(() => {
    const iframes = document.querySelectorAll('iframe');
    
    iframes.forEach(iframe => {
      if (iframe.src && (
        iframe.src.includes('youtube.com') || 
        iframe.src.includes('youtu.be')
      )) {
        iframe.src = sanitizeYouTubeUrl(iframe.src);
      }
    });
  }, []);

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
            
            {isAnalyzing && (
              <div className="flex justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Analyzing voices...</p>
                </div>
              </div>
            )}
            
            {voices.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Detected Voices</h2>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleReanalyzeAudio}
                      disabled={isLoading || isAnalyzing || !audioFile}
                      className="gap-1"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reanalyze
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDeleteAllVoices}
                      disabled={isLoading || isAnalyzing || !audioFile || voices.length === 0}
                      className="gap-1 border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete All
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {voices.map((voice) => (
                    <VoiceTag 
                      key={voice.id} 
                      voice={voice} 
                      onVoiceUpdate={handleVoiceUpdate} 
                      onDelete={handleDeleteVoice}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-6">
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

      <style>
        {`
        .highlight-pulse {
          animation: pulse 2s ease-in-out;
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(147, 51, 234, 0); }
          100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0); }
        }
        `}
      </style>
    </div>
  );
};

export default Index;
