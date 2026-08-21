import React from 'react';
import { motion } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { useCollectionStore } from '../stores/collectionStore';
import { useLeadStore } from '../stores/leadStore';
import { useUiStore } from '../stores/uiStore';

export const CollapsedPanel: React.FC = () => {
  const status = useCollectionStore((state) => state.status);
  const leads = useLeadStore((state) => state.leads);
  const setMinimized = useUiStore((state) => state.setMinimized);

  const getStatusColor = () => {
    switch (status) {
      case 'collecting':
        return 'bg-emerald-500 shadow-[0_0_6px_#10b981]';
      case 'paused':
        return 'bg-amber-500 shadow-[0_0_6px_#f59e0b]';
      case 'completed':
        return 'bg-indigo-500 shadow-[0_0_6px_#6366f1]';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.85, opacity: 0 }}
      whileHover={{ y: -1 }}
      onClick={() => setMinimized(false)}
      className="flex flex-col items-center justify-between py-5 w-[70px] h-[190px] rounded-3xl cursor-pointer select-none bg-white/80 border border-black/10 shadow-[0_15px_40px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.7)] overflow-hidden"
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      {/* Brand Icon */}
      <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-[0_3px_8px_rgba(79,70,229,0.2)]">
        <span className="text-white font-black text-sm tracking-tighter">N</span>
        <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${getStatusColor()} ${status === 'collecting' ? 'animate-pulse' : ''}`} />
      </div>

      {/* Numeric Lead counter */}
      <div className="flex flex-col items-center justify-center">
        <span className="text-sm font-black text-slate-800">{leads.length}</span>
        <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wider">Leads</span>
      </div>

      {/* Expand action */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMinimized(false);
        }}
        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 border border-slate-200/80 hover:border-slate-350 transition-all duration-300 shadow-2xs"
        title="Expand Panel"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};
