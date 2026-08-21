export interface RevenueBreakdown {
  webDesign: number;
  reputationManagement: number;
  localSeo: number;
  profileOptimization: number;
  total: number;
}

/**
 * Calculates a highly detailed potential outreach yield in Indian Rupees (₹) for each business lead.
 */
export function calculateOpportunityRevenue(params: {
  hasWebsite: boolean;
  rating: number;
  reviews: number;
  hasGmbClaimed: boolean;
  hasPhone: boolean;
  baseValuation: number;
}): RevenueBreakdown {
  let webDesign = 0;
  let reputationManagement = 0;
  let localSeo = 0;
  let profileOptimization = 0;

  // Base multiplier
  const multiplier = params.baseValuation / 5000; // standard base scale

  // 1. Missing website is a major web development contract
  if (!params.hasWebsite) {
    webDesign = 45000 * multiplier;
  } else {
    // Existing website speed & mobile audits might have small retainer upsells
    webDesign = 5000 * multiplier; 
  }

  // 2. Reputation services for popular businesses with sub-optimal reviews
  if (params.reviews > 20 && params.rating > 0 && params.rating < 4.3) {
    reputationManagement = 25000 * multiplier;
  }

  // 3. Unclaimed maps profiles require Local SEO setup
  if (!params.hasGmbClaimed) {
    localSeo = 15000 * multiplier;
  }

  // 4. Incomplete local listing details
  if (!params.hasPhone) {
    profileOptimization = 10000 * multiplier;
  }

  const total = webDesign + reputationManagement + localSeo + profileOptimization;

  return {
    webDesign,
    reputationManagement,
    localSeo,
    profileOptimization,
    total,
  };
}

/**
 * Formats numbers in Indian style formatting (Lakhs, Crores, e.g. ₹4,15,000)
 */
export function formatIndianCurrency(amount: number): string {
  const rounded = Math.round(amount);
  
  // Use Intl formatting for Indian style grouping
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
  
  return formatter.format(rounded);
}
export function formatLakhs(amount: number): string {
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)}L`;
  }
  return formatIndianCurrency(amount);
}
