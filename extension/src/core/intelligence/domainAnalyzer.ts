export class DomainAnalyzer {
  private static readonly REJECT_DOMAINS = new Set([
    "google.com",
    "maps.google.com",
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "x.com",
    "twitter.com",
    "youtube.com",
    "tiktok.com",
    "pinterest.com",
    "linktr.ee",
    "beacons.ai",
    "taplink.cc",
    "wa.me",
    "t.me"
  ]);

  /**
   * Analyzes a URL to determine if it is a real business-owned website
   * or just a social/aggregator profile.
   * 
   * Returns false if the URL belongs to a social platform (Treat as NO WEBSITE).
   * Returns true if the URL is a real business domain (Treat as HAS WEBSITE).
   */
  public static isRealWebsite(url: string | null | undefined): boolean {
    if (!url) return false;

    try {
      // Add protocol if missing to parse correctly
      const urlStr = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(urlStr);
      let hostname = urlObj.hostname.toLowerCase();
      
      // Strip www. prefix for clean matching
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }

      // If the domain is exactly in our reject list, it's NOT a real website
      if (this.REJECT_DOMAINS.has(hostname)) {
        return false;
      }

      // Check if it ends with a known domain (e.g., something.linktr.ee)
      for (const domain of this.REJECT_DOMAINS) {
        if (hostname.endsWith(`.${domain}`)) {
          return false;
        }
      }

      return true;
    } catch (e) {
      // If we can't parse it, err on the side of caution and treat as real website
      // unless it obviously contains a social string
      const lowerUrl = url.toLowerCase();
      for (const domain of this.REJECT_DOMAINS) {
        if (lowerUrl.includes(domain)) {
          return false;
        }
      }
      return true;
    }
  }
}
