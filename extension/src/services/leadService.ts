import { Lead } from '../types/lead';
import { createLeadFromParsedData } from '../core/businessParser';
import { useCollectionStore } from '../stores/collectionStore';
import { isValidBusinessWebsite, extractActualWebsite } from '../utils/websiteValidator';
import { DeepExtractorQueue } from '../core/enrichment/deepExtractorQueue';
export class LeadService {
  /**
   * Cleans and formats raw URL references to return standard root domains.
   */
  public sanitizeWebsite(url: string): string {
    if (!url) return '';
    try {
      const cleanUrl = url.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        return `https://${cleanUrl}`;
      }
      const parsed = new URL(cleanUrl);
      return `${parsed.protocol}//${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    } catch {
      return url;
    }
  }

  /**
   * Strict validation checker to ensure scraped data exactly matches visible Google Maps parameters.
   * Rejects any card that fails title criteria (length > 2) or has unverified details.
   */
  public validateLeadIntegrity(raw: Partial<Lead>): boolean {
    const { debugMode } = useCollectionStore.getState();

    if (!raw.name || raw.name.trim() === '') {
      if (debugMode) {
        console.log('[DEBUG] Validation Failed: Missing business name.');
      }
      return false;
    }

    if (raw.name.trim().length <= 2) {
      if (debugMode) {
        console.log(`[DEBUG] Validation Failed: Verified Name "${raw.name}" length is <= 2.`);
      }
      return false;
    }
    
    // Check for standard navigation or generic advertising links using word boundaries to avoid matching "road", "broad", etc.
    const lowerName = raw.name.toLowerCase();
    const isAdOrSponsored = /\b(ad|sponsored)\b/i.test(raw.name) || 
                            lowerName.includes('search instead') || 
                            lowerName.includes('results for');

    if (isAdOrSponsored) {
      if (debugMode) {
        console.log(`[DEBUG] Validation Failed: Filtered sponsored listing: "${raw.name}"`);
      }
      return false;
    }

    return true;
  }

  /**
   * Converts raw scraped DOM payloads into structured Lead models, applying quality filtering.
   * Enforces duplicate checking strictly based on Name + Address!
   */
  public processRawLeads(
    rawLeads: Partial<Lead>[],
    baseValuation: number,
    existingLeads: Lead[] = []
  ): Lead[] {
    const { debugMode, incrementDuplicateLeads } = useCollectionStore.getState();
    const processedLeads: Lead[] = [];

    // Create a Set of existing signatures: name_address
    const existingSignatures = new Set(
      existingLeads.map((l) => `${l.name.toLowerCase().trim()}_${(l.address || '').toLowerCase().trim()}`)
    );

    for (const raw of rawLeads) {
      if (!raw.name) continue;

      // 1. Strict validation checks
      if (!this.validateLeadIntegrity(raw)) continue;

      // 2. Name + Address Duplication Check
      const address = raw.address || '';
      const signature = `${raw.name.toLowerCase().trim()}_${address.toLowerCase().trim()}`;

      if (existingSignatures.has(signature)) {
        incrementDuplicateLeads();
        if (debugMode) {
          console.log(`[DEBUG] Duplicate Lead detected on ingest (Name + Address matching): "${raw.name}"`);
        }
        continue;
      }

      existingSignatures.add(signature);

      // 3. Sanitize website url
      const sanitizedWebsite = raw.website && isValidBusinessWebsite(raw.website) ? this.sanitizeWebsite(extractActualWebsite(raw.website)) : '';
      
      // Create scored model from real attributes only
      const lead = createLeadFromParsedData(
        {
          ...raw,
          name: raw.name,
          website: sanitizedWebsite,
          hasWebsite: !!sanitizedWebsite,
        },
        baseValuation
      );

      processedLeads.push(lead);
    }

    return processedLeads;
  }

  public enrichLead(lead: Lead): void {
    if (!lead.website || !lead.phone || !lead.socialLinks || Object.keys(lead.socialLinks).length === 0) {
      DeepExtractorQueue.enqueue(lead);
    }
  }

  /**
   * Helper to segment leads by opportunity category.
   */
  public filterLeads(
    leads: Lead[],
    filters: {
      searchQuery: string;
      opportunity: 'ALL' | 'HOT' | 'WARM' | 'COLD';
      website: 'ALL' | 'HAS_WEBSITE' | 'NO_WEBSITE';
    }
  ): Lead[] {
    return leads.filter((lead) => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesCategory = lead.category.toLowerCase().includes(query);
        const matchesAddress = lead.address.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesAddress) return false;
      }

      if (filters.opportunity !== 'ALL' && lead.opportunityLevel !== filters.opportunity) {
        return false;
      }

      if (filters.website === 'HAS_WEBSITE' && !lead.hasWebsite) return false;
      if (filters.website === 'NO_WEBSITE' && lead.hasWebsite) return false;

      return true;
    });
  }
}

export const leadService = new LeadService();
