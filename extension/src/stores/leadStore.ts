import { create } from 'zustand';
import { Lead } from '../types/lead';
import { CollectionAnalytics } from '../types/analytics';

interface LeadState {
  leads: Lead[];
  selectedLeadIds: Set<string>;
  searchQuery: string;
  filterOpportunity: 'ALL' | 'HOT' | 'WARM' | 'COLD';
  filterWebsite: 'ALL' | 'HAS_WEBSITE' | 'NO_WEBSITE';
  analytics: CollectionAnalytics;
  addLead: (lead: Lead) => void;
  addLeads: (newLeads: Lead[]) => void;
  toggleSelectLead: (id: string) => void;
  toggleSelectAllLeads: () => void;
  clearLeads: () => void;
  deleteSelectedLeads: () => void;
  setSearchQuery: (query: string) => void;
  setFilterOpportunity: (filter: 'ALL' | 'HOT' | 'WARM' | 'COLD') => void;
  setFilterWebsite: (filter: 'ALL' | 'HAS_WEBSITE' | 'NO_WEBSITE') => void;
  recalculateAnalytics: () => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
}

const initialAnalytics: CollectionAnalytics = {
  totalLeads: 0,
  noWebsiteLeads: 0,
  hotLeads: 0,
  warmLeads: 0,
  coldLeads: 0,
  estimatedRevenue: 0,
  opportunityScore: 0,
  categoryBreakdown: {},
  collectionPerformance: {
    leadsPerMinute: 0,
    efficiencyRate: 0,
    scrollSuccessRate: 100,
  },
};

const syncLeadWithWebApp = (lead: Lead) => {
  fetch('http://localhost:3000/api/leads/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads: [lead] })
  }).catch((err) => console.log('[Nexvora Sync] Web App inactive:', err));
};

const syncLeadsWithWebApp = (leads: Lead[]) => {
  fetch('http://localhost:3000/api/leads/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads })
  }).catch((err) => console.log('[Nexvora Sync] Web App inactive:', err));
};

export const useLeadStore = create<LeadState>((set, get) => ({
  leads: [],
  selectedLeadIds: new Set<string>(),
  searchQuery: '',
  filterOpportunity: 'ALL',
  filterWebsite: 'ALL',
  analytics: { ...initialAnalytics },

  addLead: (lead) => {
    // Check for duplicates
    const currentLeads = get().leads;
    if (currentLeads.some((l) => l.id === lead.id)) {
      return;
    }
    set((state) => ({ leads: [lead, ...state.leads] }));
    get().recalculateAnalytics();
    syncLeadWithWebApp(lead);
  },

  addLeads: (newLeads) => {
    const currentLeads = get().leads;
    const currentIds = new Set(currentLeads.map((l) => l.id));

    const uniqueNewLeads = newLeads.filter((lead) => {
      if (currentIds.has(lead.id)) return false;
      return true;
    });

    if (uniqueNewLeads.length === 0) return;

    set((state) => ({ leads: [...uniqueNewLeads, ...state.leads] }));
    get().recalculateAnalytics();
    syncLeadsWithWebApp(uniqueNewLeads);
  },

  toggleSelectLead: (id) => {
    set((state) => {
      const nextSelected = new Set(state.selectedLeadIds);
      if (nextSelected.has(id)) {
        nextSelected.delete(id);
      } else {
        nextSelected.add(id);
      }
      return { selectedLeadIds: nextSelected };
    });
  },

  toggleSelectAllLeads: () => {
    set((state) => {
      const nextSelected = new Set<string>();
      // Toggle select all on currently filtered list or entire list? Standard is all leads
      if (state.selectedLeadIds.size === state.leads.length) {
        // Clear selection
      } else {
        state.leads.forEach((l) => nextSelected.add(l.id));
      }
      return { selectedLeadIds: nextSelected };
    });
  },

  clearLeads: () => {
    set({ leads: [], selectedLeadIds: new Set<string>(), analytics: { ...initialAnalytics } });
  },

  deleteSelectedLeads: () => {
    const selected = get().selectedLeadIds;
    set((state) => ({
      leads: state.leads.filter((l) => !selected.has(l.id)),
      selectedLeadIds: new Set<string>(),
    }));
    get().recalculateAnalytics();
  },

  updateLead: (id, updates) => {
    set((state) => ({
      leads: state.leads.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead)),
    }));
    get().recalculateAnalytics();
    const updatedLead = get().leads.find((l) => l.id === id);
    if (updatedLead) {
      syncLeadWithWebApp(updatedLead);
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterOpportunity: (filterOpportunity) => set({ filterOpportunity }),
  setFilterWebsite: (filterWebsite) => set({ filterWebsite }),

  recalculateAnalytics: () => {
    const leads = get().leads;
    if (leads.length === 0) {
      set({ analytics: { ...initialAnalytics } });
      return;
    }

    let noWebsite = 0;
    let hot = 0;
    let warm = 0;
    let cold = 0;
    let revenue = 0;
    let totalScoreSum = 0;
    const categories: Record<string, number> = {};

    leads.forEach((lead) => {
      if (!lead.hasWebsite) noWebsite++;
      
      if (lead.opportunityLevel === 'HOT') hot++;
      else if (lead.opportunityLevel === 'WARM') warm++;
      else if (lead.opportunityLevel === 'COLD') cold++;

      revenue += lead.estimatedRevenue;
      totalScoreSum += lead.opportunityScore;

      categories[lead.category] = (categories[lead.category] || 0) + 1;
    });

    const averageOpportunity = Math.round(totalScoreSum / leads.length);

    set((state) => ({
      analytics: {
        ...state.analytics,
        totalLeads: leads.length,
        noWebsiteLeads: noWebsite,
        hotLeads: hot,
        warmLeads: warm,
        coldLeads: cold,
        estimatedRevenue: revenue,
        opportunityScore: averageOpportunity,
        categoryBreakdown: categories,
      },
    }));
  },
}));
