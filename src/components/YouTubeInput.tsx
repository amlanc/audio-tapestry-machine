
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
      const result = await extractAudioFromYouTube(youtubeUrl);
      
      if (!result) {
        throw new Error('Failed to extract audio');
      }
      
      onAudioExtracted(result);
      
      toast({
        title: 'Audio extracted',
        description: 'Successfully extracted audio from YouTube',
      });
    } catch (error) {
      console.error('Error extracting audio from YouTube:', error);
      toast({
        title: 'Error extracting audio',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
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
              disabled={isLoading}
            />
            <Button 
              onClick={handleExtractAudio} 
              disabled={isLoading || !youtubeUrl.trim()}
            >
              Extract Audio
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Note: This is a demonstration. In a production app, you would need server-side processing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default YouTubeInput;
