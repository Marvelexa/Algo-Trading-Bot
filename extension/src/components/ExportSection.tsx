import React from 'react';
import { FileDown, Table, Database } from 'lucide-react';
import { useLeadStore } from '../stores/leadStore';
import { exportService } from '../services/exportService';
import { motion } from 'framer-motion';
import { useCollectionStore } from '../stores/collectionStore';

export const ExportSection: React.FC = () => {
  const leads = useLeadStore((state) => state.leads);
  const selectedLeadIds = useLeadStore((state) => state.selectedLeadIds);

  const totalCount = leads.length;
  const selectedCount = selectedLeadIds.size;

  const handleExport = (format: 'csv' | 'xlsx' | 'json', scope: 'all' | 'selected') => {
    if (totalCount === 0) return;
    
    const targets = scope === 'selected' 
      ? leads.filter((l) => selectedLeadIds.has(l.id)) 
      : leads;

    if (targets.length === 0) return;

    if (format === 'csv') {
      exportService.exportToCsv(targets, scope === 'selected' ? 'selected' : 'all');
    } else if (format === 'xlsx') {
      exportService.exportToXlsx(targets, scope === 'selected' ? 'selected' : 'all');
    } else {
      exportService.exportToJson(targets, scope === 'selected' ? 'selected' : 'all');
    }
  };

  const hasLeads = totalCount > 0;
  const hasSelected = selectedCount > 0;

  const isEnriching = useCollectionStore((state) => state.isEnriching);

  return (
    <div className="p-3.5 mb-4 rounded-2xl bg-slate-50/50 border border-slate-200/80 select-none shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-black text-slate-750 uppercase tracking-wider">
            Export Leads 
            {isEnriching && <span className="ml-2 text-[9px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">Enriching in background...</span>}
        </span>
        <span className="text-[9px] text-slate-500 font-extrabold px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
          {hasSelected ? `${selectedCount} Selected` : `${totalCount} Available`}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {/* Export All */}
          <motion.button
            whileHover={hasLeads ? { scale: 1.01 } : {}}
            whileTap={hasLeads ? { scale: 0.99 } : {}}
            disabled={!hasLeads}
            onClick={() => handleExport('xlsx', 'all')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all duration-300 border ${
              hasLeads
                ? 'bg-indigo-600/10 border-indigo-600/20 text-indigo-700 hover:bg-indigo-600/20 shadow-2xs'
                : 'bg-slate-100/50 border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Table className="w-3.5 h-3.5" /> Export All ({totalCount})
          </motion.button>

          {/* Export Selected */}
          <motion.button
            whileHover={hasSelected ? { scale: 1.01 } : {}}
            whileTap={hasSelected ? { scale: 0.99 } : {}}
            disabled={!hasSelected}
            onClick={() => handleExport('xlsx', 'selected')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all duration-300 border ${
              hasSelected
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 border-indigo-500/20 text-white hover:from-violet-500 hover:to-indigo-500 shadow-2xs'
                : 'bg-slate-100/50 border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileDown className="w-3.5 h-3.5" /> Export Selected ({selectedCount})
          </motion.button>
        </div>

        {/* Small triggers */}
        <div className="flex gap-2">
          {/* CSV File */}
          <button
            disabled={!hasLeads}
            onClick={() => handleExport('csv', hasSelected ? 'selected' : 'all')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider transition-all ${
              hasLeads
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'bg-transparent border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-slate-500" /> CSV
          </button>

          {/* Excel File */}
          <button
            disabled={!hasLeads}
            onClick={() => handleExport('xlsx', hasSelected ? 'selected' : 'all')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider transition-all ${
              hasLeads
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'bg-transparent border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500" /> Excel
          </button>

          {/* JSON File */}
          <button
            disabled={!hasLeads}
            onClick={() => handleExport('json', hasSelected ? 'selected' : 'all')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider transition-all ${
              hasLeads
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'bg-transparent border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-slate-500" /> JSON
          </button>
        </div>
      </div>
    </div>
  );
};
