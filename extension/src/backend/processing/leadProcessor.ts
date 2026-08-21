import { websiteAnalyzer } from './websiteAnalyzer';

export interface RawLead {
  name: string;
  category: string;
  rating?: number;
  reviews?: number;
  address?: string;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  coordinates?: string;
}

export interface ProcessedLead extends RawLead {
  id: string;
  leadScore: number;
  opportunityLevel: 'HOT' | 'WARM' | 'COLD';
  websiteOpportunityScore: number;
}

export class LeadProcessor {
  private existingUrls = new Set<string>();
  private existingSignatures = new Set<string>();

  public resetState() {
    this.existingUrls.clear();
    this.existingSignatures.clear();
  }

  public validateLead(raw: RawLead): boolean {
    if (!raw.name || raw.name.trim() === '') return false;
    if (!raw.address || raw.address.trim() === '') return false;
    if (!raw.mapsUrl || raw.mapsUrl.trim() === '') return false;
    
    // Ensure no obvious AI placeholder
    const lowerName = raw.name.toLowerCase();
    if (lowerName.includes('example') || lowerName.includes('placeholder')) return false;

    return true;
  }

  public isDuplicate(raw: RawLead): boolean {
    if (raw.mapsUrl && this.existingUrls.has(raw.mapsUrl)) return true;
    
    const sig = `${raw.name.toLowerCase().trim()}_${raw.address?.toLowerCase().trim()}`;
    if (this.existingSignatures.has(sig)) return true;
    
    return false;
  }

  public async processLead(raw: RawLead): Promise<ProcessedLead | null> {
    if (!this.validateLead(raw)) return null;
    if (this.isDuplicate(raw)) return null;

    if (raw.mapsUrl) this.existingUrls.add(raw.mapsUrl);
    const sig = `${raw.name.toLowerCase().trim()}_${raw.address?.toLowerCase().trim()}`;
    this.existingSignatures.add(sig);

    // Analyze website
    const webAnalysis = await websiteAnalyzer.analyze(raw.website || null);
    
    // Calculate Score (0 - 100)
    let score = 0;
    
    // 1. Website Opportunity (Up to 40 points)
    if (webAnalysis.opportunityScore === 100) score += 40; // No website
    else if (webAnalysis.opportunityScore === 80) score += 20; // Old website

    // 2. Rating > 4.0 (Up to 20 points)
    if (raw.rating && raw.rating > 4.0) score += 20;

    // 3. Reviews > 50 (Up to 20 points)
    if (raw.reviews && raw.reviews > 50) score += 20;

    // 4. Missing Online Presence (Up to 20 points)
    // For now, if no website exists, we assume missing presence
    if (!webAnalysis.exists) score += 20;

    let opportunityLevel: 'HOT' | 'WARM' | 'COLD' = 'COLD';
    if (score >= 80) opportunityLevel = 'HOT';
    else if (score >= 40) opportunityLevel = 'WARM';

    return {
      ...raw,
      id: crypto.randomUUID(),
      leadScore: score,
      opportunityLevel,
      websiteOpportunityScore: webAnalysis.opportunityScore
    };
  }
}

export const leadProcessor = new LeadProcessor();
