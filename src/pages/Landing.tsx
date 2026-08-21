import React from "react";
import { useNavigate } from "react-router-dom";
import { Search, Globe, Video, MessageSquare } from "lucide-react";

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center pt-24 text-center">
      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-6 mb-20">
        <Step icon={<Search size={18} />} label="Lead Discovery" active />
        <div className="w-8 h-px bg-gray-300"></div>
        <Step icon={<Globe size={18} fill="currentColor" />} label="Demo Website" active />
        <div className="w-8 h-px bg-gray-300"></div>
        <Step icon={<Video size={18} fill="currentColor" />} label="Screen Recording" active />
        <div className="w-8 h-px bg-gray-200"></div>
        <Step icon={<MessageSquare size={18} />} label="WhatsApp Message" inactive />
      </div>

      {/* Main Title */}
      <h1 className="text-7xl font-extrabold tracking-tight mb-6">
        Freelance <span className="text-gold">Goldmine</span>
      </h1>
      
      <p className="text-sm font-semibold tracking-[0.3em] text-gray-500 mb-20 uppercase">
        Find <span className="mx-2">&bull;</span> Build <span className="mx-2">&bull;</span> Record <span className="mx-2">&bull;</span> Send
      </p>

      {/* Action Button */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-6 flex-wrap justify-center">
          <button 
            onClick={() => navigate("/discovery")}
            className="bg-[#111] hover:bg-black text-white px-10 py-4 text-lg font-medium rounded-[2rem] transition-transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
          >
            Get Started
          </button>
          <button 
            onClick={() => navigate("/pipeline")}
            className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 px-10 py-4 text-lg font-medium rounded-[2rem] transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
          >
            View Pipeline
          </button>
          <button 
            onClick={() => navigate("/leadverse")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white px-10 py-4 text-lg font-medium rounded-[2rem] transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/10 cursor-pointer"
          >
            Leadverse AI Guide
          </button>
        </div>
        <span className="text-sm text-gray-400 font-medium">Beta Access Only</span>
      </div>

      {/* Footer */}
      <div className="mt-24 text-xs font-medium text-gray-400 tracking-wider uppercase flex items-center gap-6">
        <span>&copy; 2026 Goldmine Corp</span>
        <span>Privacy</span>
        <span>Terms</span>
      </div>
    </div>
  );
}

function Step({ icon, label, active, inactive }: { icon: React.ReactNode, label: string, active?: boolean, inactive?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${inactive ? 'opacity-40 grayscale' : ''}`}>
      <div className={`relative w-12 h-12 flex items-center justify-center rounded-full ${inactive ? 'bg-gray-100 text-gray-400' : 'bg-[#111] text-white shadow-md'}`}>
        {icon}
        {active && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        )}
      </div>
      <div className="text-left leading-tight hidden text-sm font-medium sm:block w-20">
        {label.split(' ').map((word, i) => (
          <div key={i}>{word}</div>
        ))}
      </div>
    </div>
  );
}
