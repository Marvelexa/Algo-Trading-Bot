import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLeadStore } from '../stores/leadStore';
import { Globe, AlertTriangle, CheckCircle, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ITEM_HEIGHT = 54;
const BUFFER_SIZE = 6;

export const RecentLeads: React.FC = () => {
  const leads = useLeadStore((state) => state.leads);
  const selectedLeadIds = useLeadStore((state) => state.selectedLeadIds);
  const toggleSelectLead = useLeadStore((state) => state.toggleSelectLead);
  const deleteSelected = useLeadStore((state) => state.deleteSelectedLeads);
  const clearLeads = useLeadStore((state) => state.clearLeads);

  // Filters
  const searchQuery = useLeadStore((state) => state.searchQuery);
  const setSearchQuery = useLeadStore((state) => state.setSearchQuery);
  const filterOpportunity = useLeadStore((state) => state.filterOpportunity);
  const setFilterOpportunity = useLeadStore((state) => state.setFilterOpportunity);
  const filterWebsite = useLeadStore((state) => state.filterWebsite);
  const setFilterWebsite = useLeadStore((state) => state.setFilterWebsite);

  // Virtualization
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(250);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight || 250);
    }
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesCategory = lead.category.toLowerCase().includes(query);
        const matchesAddress = lead.address.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesAddress) return false;
      }

      if (filterOpportunity !== 'ALL' && lead.opportunityLevel !== filterOpportunity) {
        return false;
      }

      if (filterWebsite === 'HAS_WEBSITE' && !lead.hasWebsite) return false;
      if (filterWebsite === 'NO_WEBSITE' && lead.hasWebsite) return false;

      return true;
    });
  }, [leads, searchQuery, filterOpportunity, filterWebsite]);

  const totalCount = filteredLeads.length;
  const totalHeight = totalCount * ITEM_HEIGHT;

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
  const endIndex = Math.min(totalCount - 1, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE);

  const visibleLeads = useMemo(() => {
    return filteredLeads.slice(startIndex, endIndex + 1);
  }, [filteredLeads, startIndex, endIndex]);

  const offsetTop = startIndex * ITEM_HEIGHT;

  const getScoreBadgeStyles = (score: number) => {
    if (score >= 75) return 'text-amber-700 bg-amber-500/10 border-amber-500/20';
    if (score >= 45) return 'text-indigo-650 bg-indigo-650/10 border-indigo-500/20';
    return 'text-slate-500 bg-slate-500/10 border-slate-500/25';
  };

  return (
    <div className="flex flex-col h-full select-none text-slate-850">
      {/* Search and Filters */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, category..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-450 focus:outline-hidden focus:border-indigo-500/35 transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterOpportunity}
            onChange={(e) => setFilterOpportunity(e.target.value as any)}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-650 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Scores</option>
            <option value="HOT">Hot Leads</option>
            <option value="WARM">Warm Leads</option>
            <option value="COLD">Cold Leads</option>
          </select>

          <select
            value={filterWebsite}
            onChange={(e) => setFilterWebsite(e.target.value as any)}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-650 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Domains</option>
            <option value="NO_WEBSITE">No Website</option>
            <option value="HAS_WEBSITE">Has Website</option>
          </select>

          {selectedLeadIds.size > 0 ? (
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-650/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-bold text-red-600 transition-all"
              title="Delete Selected Leads"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            leads.length > 0 && (
              <button
                onClick={clearLeads}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-red-500/10 border border-slate-200 hover:border-red-500/20 text-[10px] font-bold text-slate-500 hover:text-red-600 transition-all shadow-2xs"
                title="Wipe Data"
              >
                Clear
              </button>
            )
          )}
        </div>
      </div>

      {/* Scroll Viewport */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto max-h-[300px] border border-slate-200/80 rounded-2xl bg-white/40 shadow-2xs"
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: 'auto 300px',
        }}
      >
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <Globe className="w-8 h-8 text-slate-350 mb-2" />
            <span className="text-xs font-semibold">No results match filters</span>
            <span className="text-[10px] text-slate-400 mt-1">Refine filters or verify scraper states</span>
          </div>
        ) : (
          <div 
            className="relative w-full overflow-hidden" 
            style={{ height: totalHeight }}
          >
            <div 
              className="absolute top-0 left-0 right-0 w-full flex flex-col"
              style={{ transform: `translate3d(0, ${offsetTop}px, 0)` }}
            >
              {visibleLeads.map((lead) => {
                const isSelected = selectedLeadIds.has(lead.id);
                return (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between px-3.5 border-b border-slate-200/60 hover:bg-slate-50/50 transition-colors"
                    style={{ height: ITEM_HEIGHT }}
                  >
                    {/* Left details */}
                    <div className="flex items-center gap-3 overflow-hidden">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectLead(lead.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-650 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-black text-slate-800 truncate pr-2" title={lead.name}>
                          {lead.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500">
                          {lead.category}
                        </span>
                      </div>
                    </div>

                    {/* Right details */}
                    <div className="flex items-center gap-4">
                      {/* Website */}
                      <div className="flex gap-2 items-center">
                        {lead.email && (
                          <div className="flex items-center gap-1 text-blue-600" title={`Email: ${lead.email}`}>
                            <span className="text-[8px] font-black uppercase tracking-wider hidden sm:inline">@</span>
                          </div>
                        )}
                        {lead.hasWebsite ? (
                          <div className="flex items-center gap-1 text-emerald-600" title={`Has Website: ${lead.website}`}>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="text-[8px] font-black uppercase tracking-wider hidden sm:inline">Web</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600" title="Missing Website">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-[8px] font-black uppercase tracking-wider hidden sm:inline">No Web</span>
                          </div>
                        )}
                      </div>

                      {/* Lead Score */}
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold tracking-wide ${getScoreBadgeStyles(lead.leadScore)}`}>
                        {lead.leadScore}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default RecentLeads;
