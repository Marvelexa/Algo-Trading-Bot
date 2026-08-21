import { useState } from "react";
import { Video, PlayCircle, Loader2, Mic, Film, HardDriveDownload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function VideoGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(0);
  
  const steps = [
    "Spinning up headless browser...",
    "Navigating to deployed website...",
    "Recording smooth scrolling walkthrough...",
    "Generating AI Voiceover using Google TTS...",
    "Merging Audio & Video track via FFmpeg...",
    "Exporting MP4 payload..."
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setStep(0);
    const interval = setInterval(() => {
      setStep(s => {
        if (s >= steps.length - 1) {
          clearInterval(interval);
          setIsGenerating(false);
          return s;
        }
        return s + 1;
      });
    }, 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div className="p-8 border-b border-border bg-card/30 backdrop-blur-sm z-10 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Video className="w-8 h-8 text-purple-500" /> Automated Video Factory
        </h1>
        <p className="text-muted-foreground mt-2">Generate hyper-personalized outreach videos using Puppeteer & AI voiceovers.</p>
      </div>

      <div className="flex-1 p-8 grid grid-cols-[350px_1fr] gap-8 overflow-hidden">
        {/* Left Col - Control Panel */}
        <Card className="bg-card/40 backdrop-blur-sm border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-sidebar shrink-0">
             <h3 className="font-semibold mb-1">Target Lead</h3>
            <div className="flex items-center justify-between">
              <span className="text-purple-500 font-medium">Premium Dental Care</span>
              <Badge variant="outline" className="text-xs">Website Generated</Badge>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
               <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Voice Profile</h4>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-secondary/50">en-US-Standard-D</Badge>
                  <Badge variant="secondary" className="bg-secondary/50">Male</Badge>
                  <Badge variant="secondary" className="bg-secondary/50">Professional</Badge>
                </div>
               </div>

               <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Auto-Script</h4>
                <div className="p-4 bg-secondary/30 rounded-lg text-sm leading-relaxed border border-border/50 text-foreground/80 italic relative">
                  <div className="absolute top-2 right-2"><Mic className="w-4 h-4 text-muted-foreground" /></div>
                  "Hi Premium Dental Care team, I noticed your current site wasn't converting as many patients as it could. So I took the liberty of building you a brand new, luxury practice website. Look at how clean this looks..."
                </div>
               </div>
            </div>
          </ScrollArea>
           
          <div className="p-4 border-t border-border bg-sidebar shrink-0 space-y-3">
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-2">
              <Film className="w-4 h-4" /> 
              {isGenerating ? "Processing Video..." : "Render Final Video"}
            </Button>
          </div>
        </Card>
        
        {/* Right Col - Render Canvas */}
        <Card className="bg-card border-border flex flex-col overflow-hidden relative">
          {isGenerating && (
             <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-20 flex flex-col items-center justify-center">
               <div className="w-16 h-16 relative">
                 <Loader2 className="w-full h-full text-purple-500 animate-spin" />
               </div>
               <div className="mt-8 space-y-2 text-center w-full max-w-md">
                 <h3 className="text-xl font-semibold text-foreground">Rendering Pipeline Active</h3>
                 <p className="text-purple-400 font-mono text-sm">{steps[step]}</p>
                 
                 <div className="w-full h-2 bg-secondary rounded-full mt-4 overflow-hidden">
                   <div 
                     className="h-full bg-purple-500 transition-all duration-500 ease-in-out" 
                     style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                   />
                 </div>
               </div>
             </div>
          )}
          
          <div className="flex-1 bg-black flex flex-col items-center justify-center p-8 relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 transition-opacity"></div>
             <PlayCircle className="w-20 h-20 text-white/40 cursor-pointer hover:text-white transition-colors z-20 hover:scale-110 duration-300" />
             <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-mono text-xs text-white/70">preview-render.mp4</span>
                <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur"><HardDriveDownload className="w-4 h-4 mr-2"/> Download</Button>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
