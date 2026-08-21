import { Lead } from '../types/lead';
import { CollectionAnalytics } from '../types/analytics';

export class AnalyticsService {
  /**
   * Evaluates the duplicate yield ratio.
   * If we parse 100 items but 20 are duplicates, efficiency is 80%.
   */
  public calculateEfficiency(loaded: number, duplicates: number): number {
    if (loaded === 0) return 100;
    const efficiency = ((loaded - duplicates) / loaded) * 100;
    return Math.round(Math.max(0, Math.min(100, efficiency)));
  }

  /**
   * Compiles detailed performance logs.
   */
  public compileTelemetry(
    leads: Lead[],
    duplicatesCount: number,
    elapsedSeconds: number
  ): CollectionAnalytics {
    let noWebsite = 0;
    let hot = 0;
    let warm = 0;
    let cold = 0;
    let revenue = 0;
    let scoreSum = 0;
    const categories: Record<string, number> = {};

    leads.forEach((l) => {
      if (!l.hasWebsite) noWebsite++;
      if (l.opportunityLevel === 'HOT') hot++;
      else if (l.opportunityLevel === 'WARM') warm++;
      else if (l.opportunityLevel === 'COLD') cold++;

      revenue += l.estimatedRevenue;
      scoreSum += l.opportunityScore;
      categories[l.category] = (categories[l.category] || 0) + 1;
    });

    const totalLeads = leads.length;
    const minutes = elapsedSeconds / 60 || 0.01;
    const leadsPerMinute = Math.round((totalLeads / minutes) * 10) / 10;
    const efficiencyRate = this.calculateEfficiency(totalLeads + duplicatesCount, duplicatesCount);

    return {
      totalLeads,
      noWebsiteLeads: noWebsite,
      hotLeads: hot,
      warmLeads: warm,
      coldLeads: cold,
      estimatedRevenue: revenue,
      opportunityScore: totalLeads ? Math.round(scoreSum / totalLeads) : 0,
      categoryBreakdown: categories,
      collectionPerformance: {
        leadsPerMinute,
        efficiencyRate,
        scrollSuccessRate: 100,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
