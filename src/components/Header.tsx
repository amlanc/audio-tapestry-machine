
import React from 'react';
import { Mic } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-4 border-b border-border/50 mb-8">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            Audio Tapestry Machine
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Analyze, Tag, and Mix Voices
        </div>
      </div>
    </header>
  );
};

export default Header;
