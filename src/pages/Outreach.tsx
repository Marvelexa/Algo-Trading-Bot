import { useState, useEffect } from "react";
import { MessageSquare, Send, Bot, CheckCheck, FileText, Video, Settings, Lock, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Outreach() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Hi! I made this sample website for your business — saw your awesome reviews. If you like it, I can customize this and make it live in 2 days!");
  const [videoUrl, setVideoUrl] = useState("");
  
  // Custom API configuration stored in localStorage
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("WACRM_TEST_API_KEY") || "");
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem("WACRM_TEST_API_URL") || "");
  const [showSettings, setShowSettings] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<{ time: string; type: "info" | "success" | "error"; msg: string }[]>([]);

  useEffect(() => {
    localStorage.setItem("WACRM_TEST_API_KEY", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("WACRM_TEST_API_URL", apiUrl);
  }, [apiUrl]);

  const addLog = (type: "info" | "success" | "error", msg: string) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type, msg }]);
  };

  const clearLogs = () => setLogs([]);

  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const handleCreateChat = async () => {
    if (!phone.trim()) {
      addLog("error", "Validation error: Recipient phone number is required to initialize chat.");
      return;
    }

    setIsCreatingChat(true);
    addLog("info", `Initiating keyless database sync to create chat for "${phone.trim()}"...`);

    try {
      const response = await fetch("/api/whatsapp/create_chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: phone.trim(),
          name: phone.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status} Error`);
      }

      addLog("success", `Successfully created chat in WACRM inbox! Contact ID: ${data.contactId || "N/A"}`);
    } catch (err: any) {
      addLog("error", `Error creating chat: ${err.message || String(err)}`);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleSend = async () => {
    if (!phone.trim()) {
      addLog("error", "Validation error: Recipient phone number is required.");
      return;
    }
    if (!message.trim()) {
      addLog("error", "Validation error: Message content is required.");
      return;
    }

    setIsSending(true);
    addLog("info", `Initiating WhatsApp message transfer to "${phone}"...`);
    
    try {
      const payload: any = {
        phone: phone.trim(),
        message: message.trim(),
      };
      if (videoUrl.trim()) {
        payload.videoUrl = videoUrl.trim();
      }
      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }
      if (apiUrl.trim()) {
        payload.apiUrl = apiUrl.trim();
      }

      addLog("info", `Sending POST request to /api/whatsapp/send...`);
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status} Error`);
      }

      addLog("success", `Successfully sent! Message ID: ${data.messageId || "N/A"}`);
    } catch (err: any) {
      addLog("error", `Error: ${err.message || String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c10] text-gray-100 overflow-hidden relative font-sans">
      {/* Decorative gradient headers */}
      <div className="p-8 border-b border-gray-800 bg-[#0f1219]/60 backdrop-blur-md z-10 shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
            <MessageSquare className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> WhatsApp Outreach Portal
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Send personalized bulk videos and sales copy directly to your CRM leads.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSettings(!showSettings)} 
            className={`border-gray-800 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${showSettings ? "bg-gray-800 text-white" : "bg-transparent text-gray-300"}`}
          >
            <Settings className={`w-4 h-4 mr-2 ${showSettings ? "rotate-45" : ""} transition-transform duration-300`} /> 
            API Settings
          </Button>
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 flex items-center gap-1.5 rounded-full">
            <Bot className="w-3.5 h-3.5" /> Live REST Client
          </Badge>
        </div>
      </div>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto">
        {/* Left Column - Configuration & Form */}
        <div className="space-y-6 flex flex-col">
          {/* Settings Collapsible Panel */}
          {showSettings && (
            <Card className="bg-[#111622] border-gray-800 shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-200">
              <div className="p-4 border-b border-gray-800 bg-[#161c2c] flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" /> Custom API Key Overrides
                </span>
                <span className="text-xs text-gray-500">Saves locally in browser</span>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-url" className="text-xs font-semibold text-gray-400">CRM API URL Override</Label>
                  <Input 
                    id="api-url"
                    placeholder="e.g. http://localhost:3000/api/v1 (Defaults to env URL)"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="bg-[#0b0e14] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-xs font-semibold text-gray-400">CRM Authorization Token Override</Label>
                  <Input 
                    id="api-key"
                    type="password"
                    placeholder="Enter custom CRM API Key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-[#0b0e14] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form */}
          <Card className="bg-[#111622]/40 backdrop-blur-sm border-gray-800 flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-800 bg-[#111622]/80 flex justify-between items-center">
              <h3 className="font-semibold text-white">Outreach Composer</h3>
              <span className="text-xs text-gray-500">Form fields bind in real time</span>
            </div>
            
            <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Phone number */}
                <div className="space-y-2">
                  <Label htmlFor="recipient-phone" className="text-sm font-semibold text-gray-300">Recipient Phone Number</Label>
                  <Input 
                    id="recipient-phone"
                    placeholder="e.g. +91 99999 88888 or +1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-[#0a0d14] border-gray-800 text-white placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Format: Numbers will be auto-cleaned to E.164. Indian numbers without a country code will automatically fallback to prefixing <strong>+91</strong>.
                  </p>
                </div>

                {/* Media URL */}
                <div className="space-y-2">
                  <Label htmlFor="media-url" className="text-sm font-semibold text-gray-300">Video / Media URL <span className="text-gray-500 font-normal">(Optional)</span></Label>
                  <Input 
                    id="media-url"
                    placeholder="e.g. /videos/premium-saree-center.webm or https://example.com/video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="bg-[#0a0d14] border-gray-800 text-white placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Provide a relative server path (e.g. <code>videos/lead-id.webm</code>) or any external video file URL.
                  </p>
                </div>

                {/* Message Body */}
                <div className="space-y-2">
                  <Label htmlFor="message-body" className="text-sm font-semibold text-gray-300">Message Body</Label>
                  <Textarea 
                    id="message-body"
                    className="min-h-[140px] font-sans text-sm bg-[#0a0d14] border-gray-800 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your personalized pitch message here..."
                  />
                </div>
              </div>
              
              <div className="pt-6 space-y-3">
                <Button 
                  onClick={handleSend} 
                  disabled={isSending || isCreatingChat} 
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold gap-2 py-6 text-base rounded-lg transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-white" />
                      Sending API Payload...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" /> 
                      Send WhatsApp via CRM
                    </>
                  )}
                </Button>

                <Button 
                  onClick={handleCreateChat} 
                  disabled={isSending || isCreatingChat} 
                  className="w-full bg-transparent hover:bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:border-sky-500 font-semibold gap-2 py-6 text-base rounded-lg transition-all duration-300 transform active:scale-[0.98]"
                >
                  {isCreatingChat ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
                      Creating Chat in Inbox...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5 text-sky-400" /> 
                      Create Chat in WACRM Inbox (No Message)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Live WhatsApp Preview & Terminal logs */}
        <div className="flex flex-col gap-6">
          {/* WhatsApp Preview Card */}
          <Card className="bg-[#111622]/40 backdrop-blur-sm border-gray-800 overflow-hidden flex flex-col shadow-xl">
            <div className="p-4 border-b border-gray-800 bg-[#111622]/80 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-sky-400" /> WhatsApp Live Mockup
              </span>
              <span className="text-xs text-sky-400/80 font-medium">Outreach Preview</span>
            </div>
            
            <div className="p-6 bg-[#0b141a] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-[0.06] bg-repeat min-h-[220px] relative flex flex-col justify-end">
              <div className="absolute inset-0 bg-[#0b141a]/95" />
              
              <div className="relative z-10 ml-auto max-w-[85%] bg-[#005c4b] text-white p-3.5 rounded-xl rounded-tr-none text-sm shadow-md border border-emerald-500/10 space-y-2">
                {videoUrl.trim() && (
                  <div className="w-full bg-black/40 rounded-lg p-2 border border-white/5 flex flex-col items-center justify-center min-h-[120px] relative overflow-hidden group">
                    <Video className="w-8 h-8 text-emerald-400/80 mb-2 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)] animate-pulse" />
                    <span className="text-xs text-gray-300 font-mono text-center truncate max-w-full px-2 bg-black/20 py-0.5 rounded">
                      {videoUrl.split("/").pop()}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">Embedded Video Media Attachment</span>
                  </div>
                )}
                
                <p className="whitespace-pre-wrap leading-relaxed">{message || <em className="text-white/40">Empty message body...</em>}</p>
                
                <div className="text-[10px] text-white/50 text-right mt-1.5 flex items-center justify-end gap-1">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> 
                  <CheckCheck className="w-3.5 h-3.5 text-sky-400 inline" />
                </div>
              </div>
            </div>
          </Card>

          {/* Terminal Console Logs */}
          <Card className="bg-[#0b0e14] border-gray-800 flex-1 flex flex-col overflow-hidden shadow-2xl rounded-lg">
            <div className="p-4 border-b border-gray-900 bg-[#0d121c] flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400"/> API Session Terminal Logs
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearLogs} 
                className="text-[10px] text-gray-500 hover:text-white px-2 py-0.5 h-auto hover:bg-gray-800"
              >
                Clear Console
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4 bg-[#07090e] font-mono text-xs leading-normal">
              {logs.length === 0 ? (
                <div className="text-gray-600 italic flex items-center gap-2 p-2 select-none">
                  <AlertCircle className="w-4 h-4 text-gray-700" />
                  Console ready. Type configurations and press "Send WhatsApp via CRM" above to dispatch API events...
                </div>
              ) : (
                <div className="space-y-2.5">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#3b82f6] shrink-0">[{log.time}]</span> 
                      <span className={
                        log.type === "success" ? "text-emerald-400" :
                        log.type === "error" ? "text-rose-400 font-semibold" : 
                        "text-gray-300"
                      }>
                        {log.msg}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
