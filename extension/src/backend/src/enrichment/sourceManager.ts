import { EnrichmentProvider } from './types';

export class SourceManager {
  private providers: Map<string, EnrichmentProvider> = new Map();

  /**
   * Registers an enrichment provider into the central orchestrator.
   */
  public registerProvider(provider: EnrichmentProvider) {
    this.providers.set(provider.id, provider);
    console.log(`[SourceManager] Registered Provider: ${provider.name} (Cost: $${provider.costPerRequest}/req)`);
  }

  /**
   * Retrieves a specific provider by ID.
   */
  public getProvider(id: string): EnrichmentProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Retrieves all registered providers.
   */
  public getAllProviders(): EnrichmentProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Marks a provider as unhealthy or disabled due to rate limits.
   */
  public disableProvider(id: string) {
    const provider = this.providers.get(id);
    if (provider) {
      provider.isAvailable = false;
      console.warn(`[SourceManager] Provider Disabled: ${provider.name}`);
    }
  }

  /**
   * Initializes the manager with the configured providers.
   */
  public async initialize() {
    const { GooglePlacesProvider, WebsiteScraperProvider, ThirdPartyProvider } = await import('./providers/mockProviders');
    this.registerProvider(new GooglePlacesProvider());
    this.registerProvider(new WebsiteScraperProvider());
    this.registerProvider(new ThirdPartyProvider());
    console.log(`[SourceManager] Initialized with ${this.providers.size} providers.`);
  }
}

export const sourceManager = new SourceManager();
// Auto-initialize for now
sourceManager.initialize();
