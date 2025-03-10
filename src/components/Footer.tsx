
import React from 'react';
import { Mic, Github, Twitter, Mail, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-card mt-20 border-t border-border/50 py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mic className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Audio Tapestry</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Advanced AI-powered audio analysis, tagging, and mixing platform.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github size={18} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail size={18} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Features</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Pricing</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">API</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Integrations</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Documentation</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Guides</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Support</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">API Status</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">About</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Blog</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Careers</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Audio Tapestry. All rights reserved.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
