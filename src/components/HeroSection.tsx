
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, AudioWaveform, Upload, Tag } from 'lucide-react';

const HeroSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px] opacity-40" />
      <div className="absolute top-20 right-20 w-64 h-64 bg-primary/30 rounded-full blur-[80px] opacity-30" />
      
      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
            Transform, Tag, and Mix Audio with AI
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover hidden patterns in audio, separate voices, and create custom mixes with advanced AI technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2">
              <Upload className="w-5 h-5" />
              Upload Audio
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <AudioWaveform className="w-5 h-5" />
              Try Demo
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-panel p-6 flex flex-col items-center text-center">
            <div className="bg-primary/20 p-3 rounded-full mb-4">
              <Mic className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Voice Analysis</h3>
            <p className="text-muted-foreground">Automatically detect and separate individual voices from any audio source.</p>
          </div>
          
          <div className="glass-panel p-6 flex flex-col items-center text-center">
            <div className="bg-accent/20 p-3 rounded-full mb-4">
              <Tag className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Tagging</h3>
            <p className="text-muted-foreground">Label and organize voices with custom tags for easy identification.</p>
          </div>
          
          <div className="glass-panel p-6 flex flex-col items-center text-center">
            <div className="bg-primary/20 p-3 rounded-full mb-4">
              <AudioWaveform className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Custom Mixing</h3>
            <p className="text-muted-foreground">Create personalized audio mixes by adjusting the volume of each voice.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="text-center">
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">10x</p>
            <p className="text-sm text-muted-foreground">Faster Analysis</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">99%</p>
            <p className="text-sm text-muted-foreground">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">5K+</p>
            <p className="text-sm text-muted-foreground">Daily Users</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
