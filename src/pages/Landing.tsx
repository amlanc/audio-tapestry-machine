
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mic, Headphones, AudioWaveform, Download, Youtube } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      
      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our powerful AI analyzes audio in four simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 relative">
              <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold">1</div>
              <div className="mb-4 text-center">
                <Youtube className="w-10 h-10 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-center">Upload Audio</h3>
              <p className="text-muted-foreground text-center">Upload audio files or paste YouTube links to extract audio</p>
            </div>
            
            <div className="glass-panel p-6 relative">
              <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold">2</div>
              <div className="mb-4 text-center">
                <Mic className="w-10 h-10 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-center">Analyze Voices</h3>
              <p className="text-muted-foreground text-center">AI identifies and separates individual voices in the audio</p>
            </div>
            
            <div className="glass-panel p-6 relative">
              <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold">3</div>
              <div className="mb-4 text-center">
                <Headphones className="w-10 h-10 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-center">Tag & Mix</h3>
              <p className="text-muted-foreground text-center">Label voices and adjust their levels in the mix</p>
            </div>
            
            <div className="glass-panel p-6 relative">
              <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold">4</div>
              <div className="mb-4 text-center">
                <Download className="w-10 h-10 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-center">Download</h3>
              <p className="text-muted-foreground text-center">Save your customized audio mix in high quality</p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link to="/app">
              <Button size="lg" className="gap-2">
                Try It Now
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20 bg-card/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Advanced Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed for audio professionals and enthusiasts
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-4">
              <AudioWaveform className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-semibold">Advanced Waveform Display</h3>
              <p className="text-muted-foreground">Visualize audio with interactive waveforms that highlight voice sections</p>
            </div>
            
            <div className="flex flex-col gap-4">
              <Mic className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-semibold">Voice Characteristics</h3>
              <p className="text-muted-foreground">Extract and analyze voice characteristics like pitch, tone, and clarity</p>
            </div>
            
            <div className="flex flex-col gap-4">
              <Download className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-semibold">Custom Audio Export</h3>
              <p className="text-muted-foreground">Export your custom mixes in high-quality formats ready for production</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that works for your needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="glass-panel p-8 border-border/80 flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <p className="text-4xl font-bold mb-6">$0<span className="text-muted-foreground text-sm font-normal">/month</span></p>
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Up to 5 minutes of audio</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Basic voice detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Standard quality export</span>
                </li>
              </ul>
              <Link to="/app">
                <Button variant="outline" className="w-full">Start Free</Button>
              </Link>
            </div>
            
            <div className="glass-panel p-8 border-primary/50 border-2 flex flex-col relative">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 transform translate-y-0 translate-x-0">POPULAR</div>
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <p className="text-4xl font-bold mb-6">$19<span className="text-muted-foreground text-sm font-normal">/month</span></p>
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Up to 60 minutes of audio</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Advanced voice detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>High quality export</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Priority processing</span>
                </li>
              </ul>
              <Link to="/app">
                <Button className="w-full">Start Pro Trial</Button>
              </Link>
            </div>
            
            <div className="glass-panel p-8 border-border/80 flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
              <p className="text-4xl font-bold mb-6">$49<span className="text-muted-foreground text-sm font-normal">/month</span></p>
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Unlimited audio processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Premium voice detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Lossless quality export</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>API access</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>24/7 premium support</span>
                </li>
              </ul>
              <Link to="/app">
                <Button variant="outline" className="w-full">Contact Sales</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/30 rounded-full blur-[80px] opacity-30" />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Audio?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of professionals who trust Audio Tapestry for their voice analysis needs
            </p>
            <Link to="/app">
              <Button size="lg" className="gap-2">
                Get Started Now
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Landing;
