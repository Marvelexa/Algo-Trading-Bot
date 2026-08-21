/**
 * Payload Correlator
 * Merges detached payloads into unified records.
 */
import { networkCache } from '../cache/networkCache';
import { FinalBusinessRecord } from '../intelligence/businessResolver';

export class PayloadCorrelator {
  /**
   * Upserts a partial record into the global network cache.
   * If a record with the same Place ID exists, it intelligently merges them.
   */
  public static correlate(partial: Partial<FinalBusinessRecord>) {
    if (!partial.placeId || partial.placeId === 'UNKNOWN_PLACE_ID') return;

    const existing = networkCache.get(partial.placeId);

    if (!existing) {
      // Create new
      const newRecord: FinalBusinessRecord = {
        placeId: partial.placeId,
        name: partial.name || 'Pending Name Resolution',
        category: partial.category || 'Unknown',
        phone: partial.phone,
        website: partial.website,
        meta: partial.meta || {
          phoneConfidence: 0,
          phoneSource: 'unknown',
          websiteConfidence: 0,
          websiteSource: 'unknown'
        }
      };
      networkCache.set(partial.placeId, newRecord);
    } else {
      // Merge
      if (partial.phone && (partial.meta?.phoneConfidence || 0) > existing.meta.phoneConfidence) {
        existing.phone = partial.phone;
        existing.meta.phoneConfidence = partial.meta!.phoneConfidence;
        existing.meta.phoneSource = partial.meta!.phoneSource;
      }
      
      if (partial.website && (partial.meta?.websiteConfidence || 0) > existing.meta.websiteConfidence) {
        existing.website = partial.website;
        existing.meta.websiteConfidence = partial.meta!.websiteConfidence;
        existing.meta.websiteSource = partial.meta!.websiteSource;
      }

      if (partial.name) existing.name = partial.name;
      if (partial.category) existing.category = partial.category;

      networkCache.set(partial.placeId, existing);
    }
  }

  /**
   * Given a business name from the DOM, attempts to find the best correlated record 
   * in the network cache if Place ID isn't known yet.
   */
  public static findByName(name: string): FinalBusinessRecord | null {
    // This is a slow O(N) scan, but networkCache is capped at 1000 items.
    const keys = networkCache.keys();
    for (const key of keys) {
      const record = networkCache.get(key);
      if (record && record.name.toLowerCase().trim() === name.toLowerCase().trim()) {
        return record;
      }
    }
    return null;
  }
}
