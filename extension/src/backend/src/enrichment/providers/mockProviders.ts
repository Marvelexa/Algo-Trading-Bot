import { EnrichmentProvider, EnrichedData } from '../types';

export class GooglePlacesProvider implements EnrichmentProvider {
  id = 'google_places_api';
  name = 'Google Places REST API';
  costPerRequest = 0.017;
  isAvailable = true;

  async enrich(placeId: string, name: string, category: string): Promise<EnrichedData | null> {
    // Simulated API Call
    return new Promise((resolve) => setTimeout(() => {
      resolve({
        phone: '+1 555-0198',
        website: 'https://example-places.com',
        confidence: 100
      });
    }, 400));
  }

  async ping() { return true; }
}

export class WebsiteScraperProvider implements EnrichmentProvider {
  id = 'website_scraper';
  name = 'Headless Direct Web Scraper';
  costPerRequest = 0.001; // Extremely cheap
  isAvailable = true;

  async enrich(placeId: string, name: string, category: string): Promise<EnrichedData | null> {
    // Simulated Search + Scrape
    return new Promise((resolve) => setTimeout(() => {
      // Sometimes fails to find phone
      if (Math.random() > 0.5) {
        resolve({ phone: '+1 555-8888', website: 'https://scraped-site.com', confidence: 70 });
      } else {
        resolve(null);
      }
    }, 1500));
  }

  async ping() { return true; }
}

export class ThirdPartyProvider implements EnrichmentProvider {
  id = 'third_party_daas';
  name = 'Data-as-a-Service API';
  costPerRequest = 0.005;
  isAvailable = true;

  async enrich(placeId: string, name: string, category: string): Promise<EnrichedData | null> {
    return new Promise((resolve) => setTimeout(() => {
      resolve({ phone: '+1 555-4444', confidence: 85 });
    }, 800));
  }

  async ping() { return true; }
}
