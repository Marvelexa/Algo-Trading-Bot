import React from 'react';
import { useLeadStore } from '../stores/leadStore';
import { generateAiOpportunityInsights } from '../ai/auditEngine';
import { BrainCircuit, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AiInsights: React.FC = () => {
  const leads = useLeadStore((state) => state.leads);
  const insights = generateAiOpportunityInsights(leads);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'website':
        return Sparkles;
      case 'reputation':
        return TrendingUp;
      case 'local_seo':
        return BrainCircuit;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="mb-4 select-none">
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <BrainCircuit className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
        <span className="text-xs font-black text-slate-750 uppercase tracking-wider">AI Outreach Intelligence</span>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-slate-50/50 border border-slate-200">
          <BrainCircuit className="w-8 h-8 text-slate-400 mb-2" />
          <span className="text-xs font-bold text-slate-550">Awaiting data injection...</span>
          <span className="text-[10px] text-slate-400 mt-1">Start collecting leads to compile insights</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
          <AnimatePresence>
            {insights.map((insight) => {
              const Icon = getInsightIcon(insight.type);
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3.5 rounded-2xl bg-slate-50/50 hover:bg-slate-100/50 border border-slate-200 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-indigo-600/10 text-indigo-650 border border-indigo-500/15">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black text-slate-800">{insight.title}</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shadow-xs">
                      {insight.financialOpportunityFormatted}
                    </span>
                  </div>

                  <p className="text-[10px] font-bold text-slate-750 leading-relaxed mb-1">
                    {insight.highlightText}
                  </p>
                  <p className="text-[9.5px] text-slate-500 leading-relaxed font-semibold">
                    {insight.description}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
export default AiInsights;
