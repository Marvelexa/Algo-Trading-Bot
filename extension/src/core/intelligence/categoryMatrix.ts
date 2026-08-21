/**
 * Nexvora Category Capability Matrix
 * Defines expected data availability for major business categories.
 * Guides the enrichment engine on whether to passively accept search payloads 
 * or proactively seek Place Detail payloads.
 */

export type BusinessCategory = 
  | 'cafe' | 'restaurant' | 'hotel' | 'gym' | 'salon' | 'doctor'
  | 'manufacturer' | 'wholesaler' | 'retail' | 'service' | 'unknown';

export interface CategoryCapabilities {
  expectsPhoneInSearch: boolean;
  expectsWebsiteInSearch: boolean;
  requiresEnrichmentForContact: boolean;
}

const CATEGORY_MATRIX: Record<BusinessCategory, CategoryCapabilities> = {
  cafe: { expectsPhoneInSearch: false, expectsWebsiteInSearch: false, requiresEnrichmentForContact: true },
  restaurant: { expectsPhoneInSearch: false, expectsWebsiteInSearch: false, requiresEnrichmentForContact: true },
  hotel: { expectsPhoneInSearch: false, expectsWebsiteInSearch: true, requiresEnrichmentForContact: true },
  gym: { expectsPhoneInSearch: false, expectsWebsiteInSearch: false, requiresEnrichmentForContact: true },
  salon: { expectsPhoneInSearch: false, expectsWebsiteInSearch: false, requiresEnrichmentForContact: true },
  doctor: { expectsPhoneInSearch: true, expectsWebsiteInSearch: true, requiresEnrichmentForContact: false },
  
  manufacturer: { expectsPhoneInSearch: true, expectsWebsiteInSearch: true, requiresEnrichmentForContact: false },
  wholesaler: { expectsPhoneInSearch: true, expectsWebsiteInSearch: true, requiresEnrichmentForContact: false },
  
  retail: { expectsPhoneInSearch: false, expectsWebsiteInSearch: true, requiresEnrichmentForContact: true },
  service: { expectsPhoneInSearch: true, expectsWebsiteInSearch: true, requiresEnrichmentForContact: false },
  unknown: { expectsPhoneInSearch: false, expectsWebsiteInSearch: false, requiresEnrichmentForContact: true }, // Default defensive posture
};

export function getCategoryCapabilities(categoryString: string): CategoryCapabilities {
  const normalized = categoryString.toLowerCase();
  
  for (const [key, caps] of Object.entries(CATEGORY_MATRIX)) {
    if (normalized.includes(key)) {
      return caps;
    }
  }
  
  return CATEGORY_MATRIX.unknown;
}
