import { Lead } from '../types/lead';

/**
 * Calculates a lead optimization and prioritization score between 0 and 100.
 * A higher score means the lead is highly valuable for outreach agencies.
 */
export function calculateLeadScore(params: {
  hasWebsite: boolean;
  rating: number;
  reviews: number;
  hasGmbClaimed: boolean;
  hasPhone: boolean;
}): { leadScore: number; opportunityLevel: 'HOT' | 'WARM' | 'COLD'; priorityRank: 'HIGH' | 'MEDIUM' | 'LOW' } {
  let score = 30; // base score

  // 1. Website Presence (The single biggest opportunity!)
  if (!params.hasWebsite) {
    score += 45; // Huge potential for web development outreach
  } else {
    score -= 10; // Low-hanging fruit is gone, but SEO/speed remains
  }

  // 2. Business Traffic vs Rating (Popular but low rating is a HOT lead)
  if (params.reviews > 100) {
    score += 15; // High traffic business, high urgency
  } else if (params.reviews > 20) {
    score += 8;
  }

  if (params.rating > 0 && params.rating < 4.2) {
    score += 15; // Needs reputation management or quality review
  } else if (params.rating >= 4.7) {
    score -= 5; // Already highly optimized
  }

  // 3. Profile Claims
  if (!params.hasGmbClaimed) {
    score += 15; // Local SEO optimization opportunity
  }

  // 4. Contact Details
  if (!params.hasPhone) {
    score += 10; // Basic information optimization opportunity
  }

  // Bound the score between 5 and 100
  const leadScore = Math.min(100, Math.max(5, score));

  // Categorize
  let opportunityLevel: 'HOT' | 'WARM' | 'COLD' = 'COLD';
  let priorityRank: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  if (leadScore >= 75) {
    opportunityLevel = 'HOT';
    priorityRank = 'HIGH';
  } else if (leadScore >= 45) {
    opportunityLevel = 'WARM';
    priorityRank = 'MEDIUM';
  } else {
    opportunityLevel = 'COLD';
    priorityRank = 'LOW';
  }

  return { leadScore, opportunityLevel, priorityRank };
}
