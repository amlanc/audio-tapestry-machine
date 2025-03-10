
import React, { useCallback, useState } from 'react';
import { Upload, FileAudio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { processAudioFile } from '@/utils/audioHelpers';
import { AudioFile } from '@/types';

interface AudioUploaderProps {
  onAudioUploaded: (audioFile: AudioFile) => void;
  isLoading: boolean;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ onAudioUploaded, isLoading }) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      // Check if file is an audio file
      if (!file.type.startsWith('audio/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an audio file (.mp3, .wav, etc.)',
          variant: 'destructive',
        });
        return;
      }

      // Process the audio file
      const processedFile = await processAudioFile(file);
      onAudioUploaded(processedFile);
      
      toast({
        title: 'Audio uploaded',
        description: `Successfully processed ${file.name}`,
      });
    } catch (error) {
      console.error('Error processing audio file:', error);
      toast({
        title: 'Error processing audio',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  }, [onAudioUploaded, toast]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

  return (
    <Card className={`border-2 border-dashed transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}`}>
      <CardContent className="p-6">
        <div 
          className="flex flex-col items-center justify-center gap-4 py-8"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <div className="rounded-full bg-primary/10 p-4">
            <FileAudio className="h-10 w-10 text-primary" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Upload Audio</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Drag and drop an audio file, or click to browse
            </p>
          </div>
          
          <div className="mt-2">
            <label htmlFor="audio-file">
              <Button disabled={isLoading} className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Select Audio File
              </Button>
              <input 
                id="audio-file" 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={onFileInputChange}
                disabled={isLoading}
              />
            </label>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Supported formats: MP3, WAV, OGG, FLAC
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioUploader;
