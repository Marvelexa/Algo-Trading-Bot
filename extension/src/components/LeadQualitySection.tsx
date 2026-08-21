import React from 'react';
import { useLeadStore } from '../stores/leadStore';
import { ShieldCheck, Percent, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const LeadQualitySection: React.FC = () => {
  const analytics = useLeadStore((state) => state.analytics);

  const total = analytics.totalLeads;
  const noWebsitePct = total ? Math.round((analytics.noWebsiteLeads / total) * 100) : 0;
  const websitePresentPct = total ? 100 - noWebsitePct : 0;
  const highOppPct = total ? Math.round((analytics.hotLeads / total) * 100) : 0;

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (analytics.opportunityScore / 100) * circumference;

  return (
    <div className="p-3.5 mb-4 rounded-2xl bg-slate-50/50 border border-slate-200/80 select-none shadow-2xs">
      <div className="flex items-center gap-1.5 mb-3">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-650" />
        <span className="text-xs font-black text-slate-750 uppercase tracking-wider">Lead Health Diagnostics</span>
      </div>

      <div className="flex gap-4 items-center">
        {/* SVG Circular Analytics Ring */}
        <div className="relative flex items-center justify-center w-[76px] h-[76px]">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="38"
              cy="38"
              r={radius}
              className="stroke-slate-200/60 fill-transparent"
              strokeWidth="5"
            />
            <motion.circle
              cx="38"
              cy="38"
              r={radius}
              className="stroke-indigo-600 fill-transparent"
              strokeWidth="5.5"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-xs font-black text-slate-800">{analytics.opportunityScore}%</span>
            <span className="text-[7px] text-slate-500 font-extrabold uppercase tracking-wider">Health</span>
          </div>
        </div>

        {/* Linear quality parameters */}
        <div className="flex-1 flex flex-col gap-2.5">
          {/* Website Present */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-0.5">
              <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-indigo-600" /> Website Present</span>
              <span className="text-slate-700 font-extrabold">{websitePresentPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200/60 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${websitePresentPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full bg-indigo-600"
              />
            </div>
          </div>

          {/* No Website (Web Design potential) */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-0.5">
              <span className="flex items-center gap-1"><Percent className="w-2.5 h-2.5 text-emerald-600" /> Web Design Potential</span>
              <span className="text-slate-700 font-extrabold">{noWebsitePct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200/60 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${noWebsitePct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full bg-emerald-500"
              />
            </div>
          </div>

          {/* High Opportunity ratio */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-0.5">
              <span className="flex items-center gap-1"><Percent className="w-2.5 h-2.5 text-amber-600" /> Hot Leads Ratio</span>
              <span className="text-slate-700 font-extrabold">{highOppPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200/60 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${highOppPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full bg-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
