import React, { useState } from "react";
import { MessageSquare, X, Send, Bot, User, Sparkles, AlertCircle } from "lucide-react";
import { StockRecommendation } from "../../../lib/stockEngine";

interface StockChatbotProps {
  ticker: string;
  companyName: string;
  recommendation: StockRecommendation | null;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export const StockChatbot: React.FC<StockChatbotProps> = ({ ticker, companyName, recommendation }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: `Hello! I am your Nexvora AI Research Analyst. I'm currently tracking ${companyName} (${ticker}). Ask me anything about buy/sell timing, support levels, targets, or risk factors!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const QUICK_QUESTIONS = [
    "What is the exact Buy Zone?",
    "What is the Stop-Loss invalidation?",
    "What are the main downside risks?",
    "What is the 12-month upside target?"
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/stock/${ticker}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, recommendation })
      });

      const json = await res.json();
      if (json.success && json.reply) {
        setMessages(prev => [
          ...prev,
          {
            sender: "ai",
            text: json.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: "ai",
            text: "I encountered a minor data connection error. Based on current research, please review the timing parameters on the main dashboard.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error("Chatbot request error:", err);
      setMessages(prev => [
        ...prev,
        {
          sender: "ai",
          text: `[Analyst Signal] For ${ticker}, entry near ${recommendation?.timingSignal?.buyZone?.min || "support"} is advised with strict stop-loss invalidation.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs shadow-2xl shadow-indigo-500/50 transition hover:scale-105 border border-white/20"
        >
          <Bot className="w-5 h-5 animate-pulse text-emerald-300" />
          <span>Talk with AI Analyst ({ticker})</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="w-[360px] md:w-[420px] h-[540px] rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden text-slate-100">
          {/* Header */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                  Nexvora AI Analyst
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                    {ticker}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">Live Interactive Stock Q&A</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white transition border border-slate-700/60"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "ai" && (
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/30 text-xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20"
                      : "bg-slate-800/90 text-slate-200 rounded-bl-none border border-slate-700/60"
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="block text-[9px] text-slate-400 mt-1 text-right font-mono">
                    {msg.timestamp}
                  </span>
                </div>
                {msg.sender === "user" && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30 text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 w-fit">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Evaluating real-time signals...</span>
              </div>
            )}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Ask about ${ticker}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition shadow-lg shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
