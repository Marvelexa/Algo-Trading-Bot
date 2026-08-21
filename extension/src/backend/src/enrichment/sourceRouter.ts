import { EnrichmentProvider, LeadContext } from './types';
import { sourceManager } from './sourceManager';
import { sourceScoring } from './sourceScoring';

export class SourceRouter {
  /**
   * Determines the optimal chain of execution for a lead.
   * Returns an array of providers ordered from primary choice to final fallback.
   */
  public getExecutionChain(lead: LeadContext): EnrichmentProvider[] {
    const allProviders = sourceManager.getAllProviders();
    const rankedChain = sourceScoring.rankProviders(allProviders, lead);

    if (rankedChain.length === 0) {
      console.warn(`[SourceRouter] CRITICAL: No available enrichment providers for ${lead.placeId}`);
    } else {
      const chainNames = rankedChain.map(p => p.name).join(' -> ');
      console.log(`[SourceRouter] Route selected for ${lead.placeId}: ${chainNames}`);
    }

    return rankedChain;
  }
}

export const sourceRouter = new SourceRouter();
