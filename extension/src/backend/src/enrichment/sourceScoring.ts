import { EnrichmentProvider, LeadContext } from './types';

export class SourceScoring {
  /**
   * Scores a provider based on the lead context.
   * Higher score = Better fit.
   */
  public scoreProvider(provider: EnrichmentProvider, lead: LeadContext): number {
    let score = 100;

    // Penalty for cost
    score -= provider.costPerRequest * 100;

    // Bonus for high-value categories prioritizing premium sources
    const highValueCategories = ['dentist', 'lawyer', 'plumber', 'electrician', 'contractor'];
    const isHighValue = highValueCategories.some(cat => lead.category.toLowerCase().includes(cat));

    if (isHighValue && provider.id === 'google_places_api') {
      score += 50; // We are willing to spend more on valuable leads
    }

    if (!isHighValue && provider.id === 'website_scraper') {
      score += 50; // Use cheap scraping for low-value or massive bulk queries
    }

    return Math.max(0, score);
  }

  /**
   * Sorts providers from Best to Worst for a given lead.
   */
  public rankProviders(providers: EnrichmentProvider[], lead: LeadContext): EnrichmentProvider[] {
    const available = providers.filter(p => p.isAvailable);
    return available.sort((a, b) => this.scoreProvider(b, lead) - this.scoreProvider(a, lead));
  }
}

export const sourceScoring = new SourceScoring();
