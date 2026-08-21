import { useState } from "react";
import { Globe, Code2, UploadCloud, RefreshCw, Eye, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function WebsiteGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    "Analyzing Business Profile...",
    "Generating Color Palette & Branding...",
    "Writing Premium Copywriting...",
    "Designing Sections & Layout...",
    "Writing React Components...",
    "Finalizing Production Build..."
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setStep(0);
    
    // Simulate generation process
    const interval = setInterval(() => {
      setStep(s => {
        if (s >= steps.length - 1) {
          clearInterval(interval);
          setIsGenerating(false);
          return s;
        }
        return s + 1;
      });
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div className="p-8 border-b border-border bg-card/30 backdrop-blur-sm z-10 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Globe className="w-8 h-8 text-primary" /> AI Website Factory
        </h1>
        <p className="text-muted-foreground mt-2">Generate premium, production-ready React websites for local businesses instantly.</p>
      </div>

      <div className="flex-1 p-8 grid grid-cols-[350px_1fr] gap-8 overflow-hidden">
        
        {/* Left Col - Control Panel */}
        <Card className="bg-card/40 backdrop-blur-sm border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-sidebar shrink-0">
            <h3 className="font-semibold mb-1">Target Lead</h3>
            <div className="flex items-center justify-between">
              <span className="text-primary font-medium">Premium Dental Care</span>
              <Badge variant="outline" className="text-xs">Dentist</Badge>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Style Prompt</h4>
                <div className="p-3 bg-secondary/50 rounded-lg text-sm leading-relaxed border border-border/50">
                  "Create a luxury, high-end dental practice website. Use lots of negative space, premium typography (Playfair Display for headings), and a pristine medical aesthetic. The tone should be highly professional and reassuring."
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sections</h4>
                <div className="flex flex-wrap gap-2">
                  {["Hero Landing", "Services Grid", "Testimonials", "Before/After Gallery", "Doctor Profile", "Booking CTA", "Footer"].map(s => (
                    <Badge key={s} variant="secondary" className="bg-secondary/50 hover:bg-secondary">{s}</Badge>
                  ))}
                </div>
              </div>

            </div>
          </ScrollArea>
          
          <div className="p-4 border-t border-border bg-sidebar shrink-0 space-y-3">
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-primary text-primary-foreground font-semibold gap-2">
              <Sparkles className="w-4 h-4" /> 
              {isGenerating ? "Generating..." : "Generate Website"}
            </Button>
            <Button variant="outline" disabled={isGenerating} className="w-full gap-2 hover:text-primary">
              <UploadCloud className="w-4 h-4" /> Deploy to Vercel
            </Button>
          </div>
        </Card>

        {/* Right Col - Preview Canvas */}
        <Card className="bg-card border-border flex flex-col overflow-hidden relative">
          
          {isGenerating && (
             <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-20 flex flex-col items-center justify-center">
               <div className="w-16 h-16 relative">
                 <RefreshCw className="w-full h-full text-primary animate-spin" />
               </div>
               <div className="mt-8 space-y-2 text-center w-full max-w-md">
                 <h3 className="text-xl font-semibold text-foreground">AI is Building...</h3>
                 <p className="text-muted-foreground animate-pulse">{steps[step]}</p>
                 
                 <div className="w-full h-2 bg-secondary rounded-full mt-4 overflow-hidden">
                   <div 
                     className="h-full bg-primary transition-all duration-500 ease-in-out" 
                     style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                   />
                 </div>
               </div>
             </div>
          )}

          <div className="h-12 border-b border-border bg-sidebar flex items-center px-4 gap-4">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="px-32 py-1 bg-background border border-border/50 rounded text-xs text-muted-foreground font-mono flex items-center gap-2">
                <Code2 className="w-3 h-3"/> localhost:3000 / preview
              </div>
            </div>
            <Button variant="ghost" size="icon" className="w-8 h-8"><Eye className="w-4 h-4" /></Button>
          </div>
          
          <div className="flex-1 bg-zinc-950 flex items-center justify-center p-8">
            <div className="text-center">
               <Globe className="w-16 h-16 mx-auto text-primary opacity-20 mb-4" />
               <h2 className="text-2xl font-semibold text-muted-foreground">Preview Canvas</h2>
               <p className="text-muted-foreground/60 max-w-sm mx-auto mt-2 text-sm">Click "Generate Website" to prompt Gemini to build the frontend.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
