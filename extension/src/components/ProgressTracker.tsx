import React from 'react';
import { useCollectionStore } from '../stores/collectionStore';
import { RefreshCw, Timer, Copy, Hourglass } from 'lucide-react';
import { motion } from 'framer-motion';

export const ProgressTracker: React.FC = () => {
  const businessesLoaded = useCollectionStore((state) => state.businessesLoaded);
  const duplicatesRemoved = useCollectionStore((state) => state.duplicatesRemoved);
  const scrollProgress = useCollectionStore((state) => state.scrollProgress);
  const lpm = useCollectionStore((state) => state.leadsPerMinute);
  const remainingSeconds = useCollectionStore((state) => state.estimatedTimeRemaining);
  const status = useCollectionStore((state) => state.status);

  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '0s';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const isCollecting = status === 'collecting';

  return (
    <div className="p-3.5 mb-4 rounded-2xl bg-slate-50/50 border border-slate-200/80 select-none shadow-2xs">
      {/* Ticker Row */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <div className="flex items-center justify-center gap-1 mb-0.5 text-[9px] text-slate-400 font-black uppercase tracking-wider">
            <RefreshCw className={`w-2.5 h-2.5 text-slate-450 ${isCollecting ? 'animate-spin' : ''}`} />
            Loaded
          </div>
          <div className="text-sm font-black text-slate-800">{businessesLoaded}</div>
        </div>

        <div className="border-x border-slate-200">
          <div className="flex items-center justify-center gap-1 mb-0.5 text-[9px] text-slate-400 font-black uppercase tracking-wider">
            <Copy className="w-2.5 h-2.5 text-slate-450" />
            Filtered
          </div>
          <div className="text-sm font-black text-slate-800">{duplicatesRemoved}</div>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1 mb-0.5 text-[9px] text-slate-400 font-black uppercase tracking-wider">
            <Hourglass className="w-2.5 h-2.5 text-slate-450" />
            Remaining
          </div>
          <div className="text-sm font-black text-slate-800">
            {isCollecting ? formatTime(remainingSeconds) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-500">
          <span>Maps Scroll Depth</span>
          <span className="text-indigo-600 font-black">{scrollProgress}%</span>
        </div>
        
        <div className="relative w-full h-2 rounded-full bg-slate-200/60 border border-slate-300/40 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${scrollProgress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-500"
          />
          {isCollecting && (
            <div className="absolute top-0 right-0 bottom-0 w-2.5 bg-white/40 blur-xs animate-pulse" />
          )}
        </div>
      </div>

      {/* Telemetry */}
      {isCollecting && (
        <div className="flex justify-between items-center text-[9px] text-slate-450 font-bold px-0.5">
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3 text-slate-400" /> Velocity
          </span>
          <span className="text-slate-700 font-extrabold">{lpm} leads / min</span>
        </div>
      )}
    </div>
  );
};
