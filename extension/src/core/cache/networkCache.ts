/**
 * Nexvora Network Cache Layer
 * Bounded LRU cache to store processed businesses and prevent memory leaks
 * during long 1000+ business scraping sessions.
 */

import { FinalBusinessRecord } from '../intelligence/businessResolver';

export class NetworkCache {
  private cache = new Map<string, FinalBusinessRecord>();
  private readonly MAX_SIZE = 1000;

  public get(placeId: string): FinalBusinessRecord | undefined {
    const item = this.cache.get(placeId);
    if (item) {
      // LRU bump
      this.cache.delete(placeId);
      this.cache.set(placeId, item);
    }
    return item;
  }

  public set(placeId: string, record: FinalBusinessRecord) {
    if (this.cache.has(placeId)) {
      this.cache.delete(placeId);
    } else if (this.cache.size >= this.MAX_SIZE) {
      // Evict oldest (Map guarantees insertion order iteration)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(placeId, record);
  }

  public clear() {
    this.cache.clear();
  }

  public keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  public values(): IterableIterator<FinalBusinessRecord> {
    return this.cache.values();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }
}

export const networkCache = new NetworkCache();
