/**
 * Nexvora Page State Scraper
 * Extracts data from embedded window variables or script tags
 * when the DOM doesn't render it (e.g., hidden phones in list view).
 */

export class PageStateScraper {
  private static cachedStateString: string | null = null;

  public static getInitialStateString(): string {
    if (this.cachedStateString) return this.cachedStateString;

    // Search through all script tags for the massive initialization state
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      if (script.textContent && script.textContent.includes('APP_INITIALIZATION_STATE')) {
        this.cachedStateString = script.textContent;
        return this.cachedStateString;
      }
    }
    return '';
  }

  /**
   * Extremely aggressive heuristic search.
   * Looks for the business name in the massive JSON state, then scans the immediate
   * surrounding text (e.g., 2000 characters after) for phone numbers or websites.
   */
  public static extractHiddenData(businessName: string): { phone?: string, website?: string } {
    const state = this.getInitialStateString();
    if (!state) return {};

    // Find the index of the business name in the massive string
    // We escape it to match JSON serialization
    const escapedName = businessName.replace(/"/g, '\\"');
    const nameIndex = state.indexOf(`"${escapedName}"`);

    if (nameIndex === -1) return {};

    // Extract a chunk of text around the business name (it usually contains the details)
    const chunk = state.substring(nameIndex, nameIndex + 3000);

    // Look for Phone (US or International)
    // Looking for string patterns like "+1 555-123-4567" or "555-123-4567"
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phoneMatches = chunk.match(phoneRegex);
    
    // Look for Website
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const urlMatches = chunk.match(urlRegex);

    let bestPhone: string | undefined;
    let bestWebsite: string | undefined;

    if (phoneMatches) {
      // Filter out common false positives (like coordinates or internal IDs)
      const validPhones = phoneMatches.filter(p => {
        const digits = p.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      });
      if (validPhones.length > 0) bestPhone = validPhones[0];
    }

    if (urlMatches) {
      // Filter out google domains
      const validUrls = urlMatches.filter(u => !u.includes('google.com') && !u.includes('gstatic.com'));
      if (validUrls.length > 0) bestWebsite = validUrls[0];
    }

    return {
      phone: bestPhone,
      website: bestWebsite
    };
  }
}
