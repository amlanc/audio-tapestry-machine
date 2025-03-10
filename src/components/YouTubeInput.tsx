
import React, { useState } from 'react';
import { Youtube } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { extractAudioFromYouTube } from '@/utils/audioHelpers';
import { AudioFile } from '@/types';

interface YouTubeInputProps {
  onAudioExtracted: (audioFile: AudioFile) => void;
  isLoading: boolean;
}

const YouTubeInput: React.FC<YouTubeInputProps> = ({ onAudioExtracted, isLoading }) => {
  const { toast } = useToast();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtractAudio = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter a YouTube URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsExtracting(true);
      const result = await extractAudioFromYouTube(youtubeUrl);
      setIsExtracting(false);
      
      if (!result) {
        throw new Error('Failed to extract audio');
      }
      
      onAudioExtracted(result);
      
      toast({
        title: 'Audio extracted',
        description: 'Successfully extracted audio from YouTube',
      });
    } catch (error) {
      setIsExtracting(false);
      console.error('Error extracting audio from YouTube:', error);
      toast({
        title: 'Error extracting audio',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 h-full">
          <div className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold">Extract from YouTube</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Paste YouTube URL here"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="flex-1"
              disabled={isLoading || isExtracting}
            />
            <Button 
              onClick={handleExtractAudio} 
              disabled={isLoading || isExtracting || !youtubeUrl.trim()}
              className="min-w-[120px]"
            >
              {isExtracting ? 'Extracting...' : 'Extract Audio'}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-auto">
            Enter a YouTube URL (e.g., https://youtube.com/watch?v=XXXX) and click "Extract Audio". The system will automatically analyze the voices.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default YouTubeInput;
