/**
 * Tracks the success rates of the 7-tier extraction hierarchy.
 */

type ExtractionTier = 
  | 'Search Payload'
  | 'Detail Payload'
  | 'APP_INITIALIZATION_STATE'
  | 'Hidden Enrichment'
  | 'Detail Panel'
  | 'List Card'
  | 'Failed';

export class CompletionTelemetry {
  private static stats: Record<ExtractionTier, number> = {
    'Search Payload': 0,
    'Detail Payload': 0,
    'APP_INITIALIZATION_STATE': 0,
    'Hidden Enrichment': 0,
    'Detail Panel': 0,
    'List Card': 0,
    'Failed': 0
  };

  private static deepStats = {
    deepExtractionCount: 0,
    deepRejectedWebsiteCount: 0,
    deepQualifiedLeadCount: 0,
    deepPhoneFound: 0,
    scrollPausedCount: 0,
    doubleClickBlocked: 0,
    navigationHijackPrevented: 0,
    duplicateCardSkipped: 0
  };

  private static totalProcessed = 0;

  public static record(tier: ExtractionTier) {
    this.stats[tier]++;
    this.totalProcessed++;
  }

  public static incrementDeepRejected() {
    this.deepStats.deepRejectedWebsiteCount++;
  }

  public static incrementDeepQualified() {
    this.deepStats.deepQualifiedLeadCount++;
  }

  public static incrementScrollPaused() {
    this.deepStats.scrollPausedCount++;
  }

  public static incrementDoubleClickBlocked() {
    this.deepStats.doubleClickBlocked++;
  }

  public static incrementNavigationHijackPrevented() {
    this.deepStats.navigationHijackPrevented++;
  }

  public static incrementDuplicateCardSkipped() {
    this.deepStats.duplicateCardSkipped++;
  }

  public static getStats() {
    return {
      ...this.stats,
      ...this.deepStats,
      total: this.totalProcessed,
      noClickSuccessRate: this.calculateNoClickSuccessRate(),
      websiteRejectRate: this.calculateRejectRate(),
    };
  }

  private static calculateRejectRate() {
    const totalDeep = this.deepStats.deepRejectedWebsiteCount + this.deepStats.deepQualifiedLeadCount;
    if (totalDeep === 0) return 0;
    return ((this.deepStats.deepRejectedWebsiteCount / totalDeep) * 100).toFixed(2) + '%';
  }

  private static calculateNoClickSuccessRate() {
    if (this.totalProcessed === 0) return 0;
    const noClickSuccess = 
      this.stats['Search Payload'] + 
      this.stats['Detail Payload'] + 
      this.stats['APP_INITIALIZATION_STATE'] + 
      this.stats['Hidden Enrichment'];
    
    return ((noClickSuccess / this.totalProcessed) * 100).toFixed(2) + '%';
  }

  public static printReport() {
    console.table(this.getStats());
  }
}
