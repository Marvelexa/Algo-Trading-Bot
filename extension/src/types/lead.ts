export interface Lead {
  id: string;
  name: string;
  category: string;
  phone: string;
  country?: string;
  countryCode?: string;
  validPhone?: boolean;
  website: string;
  address: string;
  rating: number;
  reviews: number;
  mapsUrl: string;
  hasWebsite: boolean;
  email?: string;
  leadScore: number; // 0 to 100
  opportunityLevel: 'HOT' | 'WARM' | 'COLD';
  opportunityScore: number; // 0 to 100
  estimatedRevenue: number; // calculated outreach potential in INR
  priorityRank: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  // Audit details
  seoAudit?: {
    mobileFriendly: boolean;
    hasMetaDescription: boolean;
    sslActive: boolean;
    loadSpeedMs: number;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  hasGmbClaimed: boolean;
}
