import { Lead } from '../types/lead';
import { calculateLeadScore } from '../ai/leadScoring';
import { calculateOpportunityRevenue } from '../ai/opportunityEngine';
import { MAPS_SELECTORS } from './mapsSelectors';
import { useCollectionStore } from '../stores/collectionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { normalizePhone, validateAndNormalizePhone } from '../utils/phoneNormalizer';

/**
 * Extracts business elements strictly from a real Google Maps results card anchor.
 * Applies phone number normalization and prints raw vs normalized logs.
 */
export function parseBusinessCard(card: Element): Partial<Lead> | null {
  const { debugMode, setSelectorError, cardsParsed, incrementValidPhones, incrementInvalidPhones, incrementMissingPhones } = useCollectionStore.getState();
  const { defaultCountryCode } = useSettingsStore.getState().settings;

  // 1. Raw Card HTML Inspection for the first 5 visible cards (restricted to debugMode)
  if (debugMode && cardsParsed < 5) {
    console.log(`[DEBUG] [Raw Card Inspection #${cardsParsed + 1}] Inner HTML:\n`, card.innerHTML);
  }

  // 2. Extract properties strictly using MAPS_SELECTORS functional queries
  const name = MAPS_SELECTORS.getBusinessName(card);
  const rating = MAPS_SELECTORS.getRating(card);
  const reviews = MAPS_SELECTORS.getReviewCount(card);
  const category = MAPS_SELECTORS.getCategory(card);
  const address = MAPS_SELECTORS.getAddress(card);
  const website = MAPS_SELECTORS.getWebsite(card);
  const mapsUrl = MAPS_SELECTORS.getMapsUrl(card);

  // 3. Extract, Validate and Normalize Phone with Source Detection
  const phoneDetails = MAPS_SELECTORS.getPhoneDetails(card);
  const rawPhone = phoneDetails.phone;
  const extractionSource = phoneDetails.source;
  let normalizedPhone = '';
  
  if (rawPhone) {
    const valResult = validateAndNormalizePhone(rawPhone, defaultCountryCode);
    
    if (valResult.isValid) {
      normalizedPhone = valResult.normalizedPhone || '';
      incrementValidPhones();
    } else {
      normalizedPhone = 'INVALID_PHONE';
      incrementInvalidPhones();
    }
    
    // Explicit Debug logs for Phone Normalization and Source as requested
    if (debugMode) {
      console.log(`[DEBUG] Phone Extraction Details:
  • Raw Phone: ${rawPhone}
  • Digits Extracted: ${valResult.digitsCount}
  • Normalized Phone: ${valResult.normalizedPhone || 'N/A'}
  • Validation Result: ${valResult.isValid ? 'VALID' : 'INVALID_PHONE'}
  • Phone Source: ${extractionSource}`);
    }
  } else {
    normalizedPhone = '';
    incrementMissingPhones();
    
    if (debugMode) {
      console.log(`[DEBUG] Phone Extraction Details:
  • Raw Phone: NONE
  • Digits Extracted: 0
  • Normalized Phone: NONE
  • Validation Result: MISSING
  • Phone Source: ${extractionSource}`);
    }
  }

  // 4. Parser Diagnostics logging for every card
  if (debugMode) {
    console.log(`[DEBUG] [Parser Diagnostics]
  • Name: ${name || 'FAILED'}
  • Rating: ${rating}
  • Reviews: ${reviews}
  • Website: ${website || 'NONE'}
  • Address: ${address || 'NONE'}
  • Phone: ${normalizedPhone || 'NONE'} (Raw: ${rawPhone || 'NONE'})
  • Maps URL: ${mapsUrl}`);
  }

  // 5. Selector Validation Check
  if (!name) {
    const errorMsg = 'Google Maps selector failed. Business name is empty.';
    setSelectorError(errorMsg);
    if (debugMode) {
      console.error(`[DEBUG] ${errorMsg}`);
    }
    return null;
  }

  // 6. Extraction Validation Check
  if (name.length <= 2) {
    console.warn(`[BusinessParser] ⚠️ Verification Failed: Name "${name}" is too short (length <= 2).`);
    return null;
  }

  const id = mapsUrl ? (mapsUrl.split('/place/')[1]?.split('/')[0] || name) : name;

  return {
    id,
    name,
    category,
    phone: normalizedPhone, // Save normalized phone number
    website,
    address,
    rating: isNaN(rating) ? 0 : rating,
    reviews: isNaN(reviews) ? 0 : reviews,
    mapsUrl,
    hasWebsite: !!website,
  };
}

/**
 * Factory method translating real extracted properties into structured models.
 */
export function createLeadFromParsedData(
  parsed: Partial<Lead> & { name: string },
  baseValuation: number
): Lead {
  const hasWebsite = !!parsed.website;
  const rating = parsed.rating ?? 0;
  const reviews = parsed.reviews ?? 0;
  
  const hasGmbClaimed = true;
  const phone = parsed.phone || '';
  const address = parsed.address || '';

  const scoreResults = calculateLeadScore({
    hasWebsite,
    rating,
    reviews,
    hasGmbClaimed,
    hasPhone: !!phone,
  });

  const revenueBreakdown = calculateOpportunityRevenue({
    hasWebsite,
    rating,
    reviews,
    hasGmbClaimed,
    hasPhone: !!phone,
    baseValuation,
  });

  const seoAudit = hasWebsite ? {
    mobileFriendly: true,
    hasMetaDescription: true,
    sslActive: true,
    loadSpeedMs: 1500,
  } : undefined;

  return {
    id: parsed.id || `lead-${Date.now()}`,
    name: parsed.name,
    category: parsed.category || 'Local Business',
    phone, // Saved normalized number
    website: parsed.website || '',
    address,
    rating,
    reviews,
    mapsUrl: parsed.mapsUrl || 'https://maps.google.com',
    hasWebsite,
    leadScore: scoreResults.leadScore,
    opportunityLevel: scoreResults.opportunityLevel,
    opportunityScore: scoreResults.leadScore,
    estimatedRevenue: revenueBreakdown.total,
    priorityRank: scoreResults.priorityRank,
    hasGmbClaimed,
    createdAt: parsed.createdAt || new Date().toISOString(),
    seoAudit,
  };
}

/**
 * Dynamic preview sample generator.
 */
export function generateMockLead(index: number, baseValuation: number): Lead {
  const names = ['Royal Brew Cafe', 'Dental Care Clinic', 'Alpha Power Gym', 'Hilton Grand Hotel'];
  const name = `${names[index % names.length]} - #${100 + index}`;
  return createLeadFromParsedData({
    id: `dev-lead-${index}`,
    name,
    category: 'Niche Service',
    rating: 4.5,
    reviews: 120,
    website: index % 2 === 0 ? 'https://www.google.com' : '',
    phone: '9876543210', // Raw mock number to check normalization
    address: `12${index} Main St, City, ST 12345`, // Add mock address
  }, baseValuation);
}

export function generateMockLeadsBatch(count: number, baseValuation: number): Lead[] {
  return Array.from({ length: count }, (_, i) => generateMockLead(i, baseValuation));
}
