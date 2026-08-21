/**
 * Nexvora Business Resolver
 * Merges raw extracted data from multiple sources (Network, DOM, Page State),
 * applying confidence scores to pick the most accurate fields.
 */

import { ConfidenceEngine } from './confidenceEngine';

export interface FinalBusinessRecord {
  placeId: string;
  name: string;
  phone?: string;
  website?: string;
  category: string;
  // Metadata about where the data came from
  meta: {
    phoneConfidence: number;
    phoneSource: string;
    websiteConfidence: number;
    websiteSource: string;
  }
}

export class BusinessResolver {
  
  public static resolve(placeId: string, name: string, category: string, incomingData: {phone?: string, website?: string, source: string}, existingRecord?: FinalBusinessRecord): FinalBusinessRecord {
    
    const record: FinalBusinessRecord = existingRecord || {
      placeId,
      name,
      category,
      meta: {
        phoneConfidence: 0,
        phoneSource: 'none',
        websiteConfidence: 0,
        websiteSource: 'none'
      }
    };

    // Evaluate Phone
    if (incomingData.phone) {
      const newConfidence = ConfidenceEngine.scorePhone(incomingData.phone, incomingData.source);
      if (newConfidence > record.meta.phoneConfidence) {
        record.phone = incomingData.phone;
        record.meta.phoneConfidence = newConfidence;
        record.meta.phoneSource = incomingData.source;
      }
    }

    // Evaluate Website
    if (incomingData.website) {
      const newConfidence = ConfidenceEngine.scoreWebsite(incomingData.website, incomingData.source);
      if (newConfidence > record.meta.websiteConfidence) {
        record.website = incomingData.website;
        record.meta.websiteConfidence = newConfidence;
        record.meta.websiteSource = incomingData.source;
      }
    }

    return record;
  }
}
