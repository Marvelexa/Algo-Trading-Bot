import { Lead } from '../types/lead';
import { formatLakhs } from './opportunityEngine';

export interface AiInsightCard {
  id: string;
  type: 'website' | 'seo' | 'reputation' | 'local_seo';
  title: string;
  count: number;
  highlightText: string;
  description: string;
  financialOpportunity: number;
  financialOpportunityFormatted: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Simulates a full website technical audit for businesses that have websites.
 */
export function generateMockAudit(hasWebsite: boolean, name: string) {
  if (!hasWebsite) return undefined;

  // Pseudo-randomizer based on business name string hash
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return {
    mobileFriendly: hash % 3 !== 0,
    hasMetaDescription: hash % 2 === 0,
    sslActive: hash % 5 !== 0,
    loadSpeedMs: 800 + (hash % 3200), // between 800ms and 4000ms
  };
}

/**
 * Generates highly contextual, actionable AI insight cards from the entire pool of collected leads.
 */
export function generateAiOpportunityInsights(leads: Lead[]): AiInsightCard[] {
  if (leads.length === 0) return [];

  const insights: AiInsightCard[] = [];
  
  // 1. No Website Insight
  const noWebsiteLeads = leads.filter(l => !l.hasWebsite);
  if (noWebsiteLeads.length > 0) {
    // Sum the potential webDesign revenue
    const webDesignRevenue = noWebsiteLeads.reduce((acc, l) => acc + 45000, 0);
    insights.push({
      id: 'insight-no-website',
      type: 'website',
      title: 'Web Development Pipelines',
      count: noWebsiteLeads.length,
      highlightText: `${noWebsiteLeads.length} businesses have no website.`,
      description: 'These establishments have high customer intent but zero internet presence. Delivering a responsive web experience is a direct conversion funnel.',
      financialOpportunity: webDesignRevenue,
      financialOpportunityFormatted: formatLakhs(webDesignRevenue),
      urgency: 'HIGH',
    });
  }

  // 2. Reputation Management Insight
  const poorReputationLeads = leads.filter(l => l.rating > 0 && l.rating < 4.2 && l.reviews > 15);
  if (poorReputationLeads.length > 0) {
    const reputationRevenue = poorReputationLeads.reduce((acc, l) => acc + 25000, 0);
    insights.push({
      id: 'insight-reputation',
      type: 'reputation',
      title: 'Reputation Management Systems',
      count: poorReputationLeads.length,
      highlightText: `${poorReputationLeads.length} leads classified as HOT.`,
      description: 'Active local foot traffic with sub-optimal Google Maps reviews. Upsell them review generation campaigns and active social monitoring services.',
      financialOpportunity: reputationRevenue,
      financialOpportunityFormatted: formatLakhs(reputationRevenue),
      urgency: 'HIGH',
    });
  }

  // 3. Unclaimed GMB Profiles Insight
  const unclaimedGmbLeads = leads.filter(l => !l.hasGmbClaimed);
  if (unclaimedGmbLeads.length > 0) {
    const seoRevenue = unclaimedGmbLeads.reduce((acc, l) => acc + 15000, 0);
    insights.push({
      id: 'insight-unclaimed-gmb',
      type: 'local_seo',
      title: 'Unclaimed GMB Profiles',
      count: unclaimedGmbLeads.length,
      highlightText: `${unclaimedGmbLeads.length} listings unclaimed on Maps.`,
      description: 'Vulnerable to hijacking or suspension and ranks low on Google Local 3-Pack. Offer local profile verification and citation cleanups.',
      financialOpportunity: seoRevenue,
      financialOpportunityFormatted: formatLakhs(seoRevenue),
      urgency: 'MEDIUM',
    });
  }

  // 4. Broken Sites / SSL issues
  const slowOrNoSslLeads = leads.filter(l => l.hasWebsite && l.seoAudit && (!l.seoAudit.sslActive || l.seoAudit.loadSpeedMs > 3000));
  if (slowOrNoSslLeads.length > 0) {
    const sslRevenue = slowOrNoSslLeads.reduce((acc, l) => acc + 10000, 0);
    insights.push({
      id: 'insight-technical-seo',
      type: 'seo',
      title: 'Technical Web Optimization',
      count: slowOrNoSslLeads.length,
      highlightText: `${slowOrNoSslLeads.length} slow or insecure websites.`,
      description: 'Missing SSL certifications or loading slower than 3 seconds. Sell website speed optimization, migration to secure hosting, and SSL certificates.',
      financialOpportunity: sslRevenue,
      financialOpportunityFormatted: formatLakhs(sslRevenue),
      urgency: 'MEDIUM',
    });
  }

  return insights.sort((a, b) => b.financialOpportunity - a.financialOpportunity);
}
