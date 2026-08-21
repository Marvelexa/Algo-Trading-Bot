import React from 'react';
import { motion } from 'framer-motion';
import { Users, Globe, Flame, BarChart3 } from 'lucide-react';
import { useLeadStore } from '../stores/leadStore';

export const StatsGrid: React.FC = () => {
  const analytics = useLeadStore((state) => state.analytics);

  const stats = [
    {
      id: 'stat-leads-found',
      label: 'Leads Found',
      value: analytics.totalLeads,
      icon: Users,
      color: 'text-indigo-600',
      glow: 'rgba(99, 102, 241, 0.04)',
    },
    {
      id: 'stat-no-website',
      label: 'No Website',
      value: analytics.noWebsiteLeads,
      icon: Globe,
      color: 'text-emerald-600',
      glow: 'rgba(16, 185, 129, 0.04)',
    },
    {
      id: 'stat-hot-leads',
      label: 'Hot Leads',
      value: analytics.hotLeads,
      icon: Flame,
      color: 'text-amber-600',
      glow: 'rgba(217, 119, 6, 0.04)',
    },
    {
      id: 'stat-opportunity',
      label: 'Opp. Score',
      value: `${analytics.opportunityScore}%`,
      icon: BarChart3,
      color: 'text-pink-600',
      glow: 'rgba(219, 39, 119, 0.04)',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-4 select-none">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.id}
            whileHover={{ y: -2, scale: 1.01 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="group relative p-3.5 rounded-2xl bg-slate-50/50 hover:bg-slate-100/50 border border-slate-200/80 hover:border-slate-300 transition-all duration-300 overflow-hidden shadow-2xs"
          >
            {/* Ambient backlight glow */}
            <div 
              className="absolute -inset-10 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 -z-10 rounded-full"
              style={{ background: `radial-gradient(circle, ${stat.glow} 0%, transparent 70%)` }}
            />

            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">{stat.label}</span>
              <Icon className={`w-3.5 h-3.5 ${stat.color} opacity-80`} />
            </div>

            <motion.div 
              key={stat.value}
              initial={{ scale: 0.95, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-black text-slate-800 tracking-tight"
            >
              {stat.value}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};
