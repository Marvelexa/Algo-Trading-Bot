/**
 * Nexvora Enrichment Policy
 * Manages the aggressiveness of how we acquire missing fields.
 */

export type EnrichmentMode = 'SAFE' | 'BALANCED' | 'AGGRESSIVE';

export interface EnrichmentConfig {
  mode: EnrichmentMode;
  allowPassiveHarvesting: boolean;
  allowBackgroundXhr: boolean;
  maxXhrPerMinute: number;
}

export class EnrichmentPolicy {
  private config: EnrichmentConfig;

  constructor(mode: EnrichmentMode = 'SAFE') {
    this.config = this.buildConfig(mode);
  }

  public setMode(mode: EnrichmentMode) {
    this.config = this.buildConfig(mode);
    console.log(`[Nexvora] Enrichment mode set to ${mode}`);
  }

  public getConfig(): EnrichmentConfig {
    return this.config;
  }

  private buildConfig(mode: EnrichmentMode): EnrichmentConfig {
    switch (mode) {
      case 'SAFE':
        return {
          mode: 'SAFE',
          allowPassiveHarvesting: true,
          allowBackgroundXhr: false, // Absolutely no synthetic or background XHRs
          maxXhrPerMinute: 0
        };
      case 'BALANCED':
        return {
          mode: 'BALANCED',
          allowPassiveHarvesting: true,
          allowBackgroundXhr: true,
          maxXhrPerMinute: 15 // Very throttled
        };
      case 'AGGRESSIVE':
        return {
          mode: 'AGGRESSIVE',
          allowPassiveHarvesting: true,
          allowBackgroundXhr: true,
          maxXhrPerMinute: 45 // Pushing the rate limits
        };
      default:
        return this.buildConfig('SAFE');
    }
  }

  /**
   * Determines if we are allowed to fire a background XHR for a missing Place Detail.
   */
  public canFireBackgroundXhr(currentXhrCountThisMinute: number): boolean {
    if (!this.config.allowBackgroundXhr) return false;
    return currentXhrCountThisMinute < this.config.maxXhrPerMinute;
  }
}

export const enrichmentPolicy = new EnrichmentPolicy('SAFE');
