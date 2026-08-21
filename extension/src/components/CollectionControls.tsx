import React, { useState } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { useCollectionStore } from '../stores/collectionStore';
import { mapsService } from '../services/mapsService';
import { motion } from 'framer-motion';

export const CollectionControls: React.FC = () => {
  const status = useCollectionStore((state) => state.status);
  
  const [country, setCountry] = useState('India');
  const [category, setCategory] = useState('Cafe');

  const handleStart = () => {
    mapsService.startCollection(country, category);
  };

  const handlePause = () => {
    mapsService.pauseCollection();
  };

  const handleResume = () => {
    mapsService.resumeCollection();
  };

  const handleStop = () => {
    mapsService.stopCollection();
  };

  const isCollecting = status === 'collecting';
  const isPaused = status === 'paused';
  const isIdle = status === 'idle' || status === 'stopped' || status === 'completed';

  return (
    <div className="flex flex-col gap-2 mb-4 select-none">
      {/* Input Fields */}
      <div className="flex gap-2 mb-2">
        <input 
          type="text" 
          placeholder="Country (e.g. India)" 
          value={country} 
          onChange={(e) => setCountry(e.target.value)}
          disabled={!isIdle}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
        />
        <input 
          type="text" 
          placeholder="Category (e.g. Cafe)" 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          disabled={!isIdle}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Primary Action Button */}
        {isIdle && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs tracking-wider uppercase border border-indigo-400/20 shadow-[0_4px_15px_rgba(79,70,229,0.2)] transition-all duration-300"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Start Discovery Engine
          </motion.button>
        )}

        {isCollecting && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePause}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-amber-600 font-black text-xs tracking-wider uppercase border border-slate-200 shadow-2xs transition-all duration-300"
          >
            <Pause className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
            Pause
          </motion.button>
        )}

        {isPaused && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleResume}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs tracking-wider uppercase border border-emerald-450/20 shadow-[0_4px_15px_rgba(16,185,129,0.2)] transition-all duration-300"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Resume
          </motion.button>
        )}

        {/* Stop Button */}
        {!isIdle && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStop}
            className="p-2.5 rounded-xl bg-red-650/10 hover:bg-red-500/25 text-red-600 border border-red-500/20 transition-all duration-300 shadow-2xs"
            title="Stop and Save"
          >
            <Square className="w-3.5 h-3.5 fill-red-600/10" />
          </motion.button>
        )}
      </div>
    </div>
  );
};
