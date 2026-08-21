import React from 'react';
import { Settings, Minimize2, X, Award } from 'lucide-react';
import { useCollectionStore } from '../stores/collectionStore';
import { useUiStore } from '../stores/uiStore';

export const PanelHeader: React.FC = () => {
  const status = useCollectionStore((state) => state.status);
  const setMinimized = useUiStore((state) => state.setMinimized);
  const isSettingsOpen = useUiStore((state) => state.isSettingsOpen);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);

  const getStatusDetails = () => {
    switch (status) {
      case 'collecting':
        return { label: 'Collecting', colorClass: 'bg-emerald-500 shadow-[0_0_8px_#10b981]' };
      case 'paused':
        return { label: 'Paused', colorClass: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' };
      case 'completed':
        return { label: 'Completed', colorClass: 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' };
      case 'stopped':
        return { label: 'Stopped', colorClass: 'bg-red-500 shadow-[0_0_8px_#ef4444]' };
      default:
        return { label: 'Ready', colorClass: 'bg-slate-400' };
    }
  };

  const statusInfo = getStatusDetails();

  return (
    <div className="flex items-center justify-between border-b border-black/5 pb-4 mb-4 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-[0_3px_10px_rgba(79,70,229,0.25)]">
          <span className="text-white font-black text-sm tracking-tighter">N</span>
        </div>
        
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-800 font-extrabold text-sm tracking-[0.1em]">NEXVORA</span>
            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-600/10 text-indigo-600 border border-indigo-600/15">
              <Award className="w-2.5 h-2.5" /> PRO
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold">Lead Finder</span>
        </div>
      </div>

      {/* Live Status and Operations */}
      <div className="flex items-center gap-3">
        {/* Pulsing Status dot */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/60">
          <span className={`w-2 h-2 rounded-full ${statusInfo.colorClass} ${status === 'collecting' ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] text-slate-600 font-bold tracking-wide">{statusInfo.label}</span>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded-lg border transition-all duration-200 ${
              isSettingsOpen 
                ? 'bg-indigo-600/10 border-indigo-600/20 text-indigo-600' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title="Extraction Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => setMinimized(true)}
            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all duration-200"
            title="Minimize Panel"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => useUiStore.getState().resetLayout()}
            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-red-650 hover:bg-red-500/10 hover:border-red-500/15 transition-all duration-200"
            title="Reset Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
