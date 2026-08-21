/**
 * Nexvora Confidence Engine
 * Scores the reliability of extracted fields based on their source and structure.
 */

export type ConfidenceScore = number; // 0 to 100

export class ConfidenceEngine {
  
  public static scorePhone(phoneCandidate: string, source: string): ConfidenceScore {
    if (!phoneCandidate) return 0;
    
    let score = 0;
    
    // E.164 or solid international format
    if (/^\+?[1-9]\d{1,14}$/.test(phoneCandidate.replace(/\s|-|\(|\)/g, ''))) {
      score += 70;
    } else if (/\d{3}[-\.\s]??\d{3}[-\.\s]??\d{4}/.test(phoneCandidate)) {
      score += 50; // Local format
    }
    
    // Source boosts
    if (source === 'network_detail') score += 30;
    if (source === 'dom_detail') score += 20;
    
    return Math.min(score, 100);
  }

  public static scoreWebsite(websiteCandidate: string, source: string): ConfidenceScore {
    if (!websiteCandidate) return 0;
    
    let score = 0;
    
    try {
      const url = new URL(websiteCandidate);
      
      // Valid HTTP/HTTPS
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        score += 50;
      }
      
      // Demerit for social media or generic directories unless it's the only option
      const genericDomains = ['facebook.com', 'instagram.com', 'yelp.com', 'yellowpages.com'];
      if (!genericDomains.some(d => url.hostname.includes(d))) {
        score += 30;
      } else {
        score += 10;
      }
      
    } catch {
      return 0; // Not a valid URL
    }
    
    if (source === 'network_detail') score += 20;
    if (source === 'dom_detail') score += 20;

    return Math.min(score, 100);
  }
}
