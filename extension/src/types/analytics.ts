export interface CollectionAnalytics {
  totalLeads: number;
  noWebsiteLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  estimatedRevenue: number; // Potential yield in INR (₹)
  opportunityScore: number; // Overall average lead rating (0 - 100)
  categoryBreakdown: Record<string, number>;
  collectionPerformance: {
    leadsPerMinute: number;
    efficiencyRate: number; // percentage of parsed items that are duplicates
    scrollSuccessRate: number;
  };
}
