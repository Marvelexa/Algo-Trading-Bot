import { LeadContext, EnrichedData } from './types';
import { sourceRouter } from './sourceRouter';

export class EnrichmentOrchestrator {
  /**
   * Main entry point for a BullMQ Worker pulling a lead from the queue.
   */
  public async processLead(lead: LeadContext): Promise<EnrichedData | null> {
    console.log(`[Orchestrator] Beginning enrichment for: ${lead.name} (${lead.placeId})`);

    const executionChain = sourceRouter.getExecutionChain(lead);

    for (const provider of executionChain) {
      console.log(`[Orchestrator] Attempting provider: ${provider.name}`);
      
      try {
        const result = await provider.enrich(lead.placeId, lead.name, lead.category);
        
        if (this.validateResult(result)) {
          console.log(`[Orchestrator] SUCCESS with ${provider.name} for ${lead.name}`);
          return result;
        } else {
          console.log(`[Orchestrator] Provider ${provider.name} returned insufficient data. Trying fallback...`);
        }
      } catch (err) {
        console.error(`[Orchestrator] Provider ${provider.name} FAILED:`, err);
        // Continue to next provider in fallback chain
      }
    }

    console.warn(`[Orchestrator] ALL PROVIDERS EXHAUSTED for ${lead.placeId}. Enrichment Failed.`);
    return null;
  }

  /**
   * Strict validation logic. What constitutes a "successful" enrichment?
   */
  private validateResult(data: EnrichedData | null): boolean {
    if (!data) return false;
    
    // For Nexvora, we strictly require a high-confidence phone number.
    // If the provider couldn't find a phone, we consider it a failure and want to trigger the fallback.
    if (!data.phone || data.confidence < 50) return false;

    return true;
  }
}

export const enrichmentOrchestrator = new EnrichmentOrchestrator();
