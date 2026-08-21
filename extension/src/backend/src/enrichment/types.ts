export interface EnrichedData {
  phone?: string;
  website?: string;
  emails?: string[];
  socials?: Record<string, string>;
  confidence: number;
}

export interface EnrichmentProvider {
  id: string;
  name: string;
  costPerRequest: number;
  isAvailable: boolean;

  /**
   * Main execution method. Returns enriched data or null if not found.
   */
  enrich(placeId: string, name: string, category: string): Promise<EnrichedData | null>;

  /**
   * Healthcheck endpoint for sourceManager
   */
  ping(): Promise<boolean>;
}

export interface LeadContext {
  placeId: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  reviewCount?: number;
}
