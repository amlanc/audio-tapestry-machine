
import React, { useState } from 'react';
import { Mic, Menu, X, Github, Twitter, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="w-full py-4 px-4 border-b border-border/50 sticky top-0 z-50 backdrop-blur-lg bg-background/80">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            Audio Tapestry
          </h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <Button size="sm">
            Get Started
            <Headphones className="ml-1 h-4 w-4" />
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-muted-foreground" 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Navigation */}
        <div className={cn(
          "fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-8 transition-all duration-300 md:hidden",
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}>
          <button 
            className="absolute top-4 right-4 text-muted-foreground" 
            onClick={toggleMenu}
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
          <a href="#features" className="text-xl" onClick={toggleMenu}>Features</a>
          <a href="#how-it-works" className="text-xl" onClick={toggleMenu}>How It Works</a>
          <a href="#pricing" className="text-xl" onClick={toggleMenu}>Pricing</a>
          <Button size="lg" onClick={toggleMenu}>
            Get Started
            <Headphones className="ml-1 h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
