/**
 * Isolated Google Maps DOM selector engine.
 * Encapsulates selector nodes and provides strict query methods.
 *
 * FIXED: Extended container selectors to support all business types.
 * Manufacturers use div.Nv2y1d / div.Uaht4b but Cafes, Restaurants,
 * and other local businesses often use div.lI9IFe, div.bfdHYd, div.THOPZb,
 * div.rllt__details, or only have card.parentElement as root.
 */
export const MAPS_SELECTORS = {
  // Query selectors definitions
  resultsFeed: 'div[role="feed"], div.m6U6ee',
  businessCard: 'a.hfpxzc', // The primary link card anchor is the most reliable element
  title: '.qBF1Pd, div.fontHeadlineSmall',
  rating: 'span.MW4etd, span.cehYX',
  reviews: 'span.UY7F9',
  categoryAddress: 'div.W4E58, div.fontBodyMedium, div[class*="fontBodyMedium"]',
  phone: 'button[data-tooltip*="phone"], button[data-item-id*="phone"]',
  website: 'a[data-item-id="authority"]',

  /**
   * Universal container resolver — works for ALL business types.
   * Tries multiple known Google Maps container classes before falling back.
   */
  getContainer(card: Element): Element | null {
    return (
      card.closest('div.Nv2y1d') ||
      card.closest('div.Uaht4b') ||
      card.closest('div.lI9IFe') ||
      card.closest('div.bfdHYd') ||
      card.closest('div.THOPZb') ||
      card.closest('div.rllt__details') ||
      card.closest('div[jscontroller]') ||
      card.closest('div[data-result-index]') ||
      card.closest('li') ||
      card.parentElement
    );
  },

  /**
   * Locates the active Google Maps list search container.
   */
  getResultsPanel(): Element | null {
    return document.querySelector(this.resultsFeed);
  },

  /**
   * Retrieves all visible business result nodes currently rendered in G-Maps.
   */
  getBusinessCards(): Element[] {
    const list = document.querySelectorAll(this.businessCard);
    return Array.from(list);
  },

  /**
   * Extracts verified business name.
   */
  getBusinessName(card: Element): string {
    // Check inner title text first
    const container = this.getContainer(card);
    const titleEl = container?.querySelector(this.title);
    let name = titleEl?.textContent?.trim() || '';

    // Fallback: Read the aria-label on the link anchor itself
    if (!name) {
      name = (card.getAttribute('aria-label') || '').trim();
    }

    // Clean name separators
    if (name.includes('·')) {
      name = name.split('·')[0].trim();
    }

    return name;
  },

  /**
   * Extracts business star ratings.
   */
  getRating(card: Element): number {
    const container = this.getContainer(card);
    const ratingEl = container?.querySelector(this.rating);
    const ratingText = ratingEl?.textContent?.trim() || '';
    
    if (ratingText) {
      const parsed = parseFloat(ratingText.replace(/,/g, '.'));
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Fallback: Check aria-label inside anchor
    const ariaLabel = card.getAttribute('aria-label') || '';
    const ratingMatch = ariaLabel.match(/([0-9.]+)\s*stars?/i);
    return ratingMatch ? parseFloat(ratingMatch[1]) : 0;
  },

  /**
   * Extracts business review counts.
   */
  getReviewCount(card: Element): number {
    const container = this.getContainer(card);
    const reviewsEl = container?.querySelector(this.reviews);
    const reviewsText = reviewsEl?.textContent?.trim() || '';
    
    if (reviewsText) {
      const parsed = parseInt(reviewsText.replace(/[(),\s]/g, ''), 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Fallback: Check aria-label inside anchor
    const ariaLabel = card.getAttribute('aria-label') || '';
    const reviewsMatch = ariaLabel.match(/([0-9,]+)\s*reviews?/i);
    return reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, ''), 10) : 0;
  },

  getCategory(card: Element): string {
    const container = this.getContainer(card);
    if (!container) return 'Local Business';
    
    const sanitize = (s: string) => s.replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '').trim();

    // 1. Try subtitle selector
    let subtitleEl = container.querySelector(this.categoryAddress);
    if (!subtitleEl) {
        const allDivs = Array.from(container.querySelectorAll('div'));
        subtitleEl = allDivs.find(d => {
           const text = d.textContent || '';
           return text.match(/[·⋅]/) && d.children.length < 6;
        }) || null;
    }

    if (subtitleEl && subtitleEl.textContent) {
      const text = subtitleEl.textContent;
      const parts = text.split(/[·⋅]/).map(sanitize).filter(Boolean);
      const nonCategoryWords = ['open', 'close', 'temporarily', 'hours', 'delivery', 'dine-in', 'takeout'];
      const category = parts.find(p => {
         const lower = p.toLowerCase();
         return !/^[0-9.]+(?:\s*\([0-9,]+\))?$/.test(p) && !/[₹$£€]/.test(p) && !nonCategoryWords.some(w => lower.includes(w));
      });
      
      // If the extracted category has the business name fused to it (e.g. "Engine Cafe 4.3(1,158)"), it's invalid.
      // A valid category usually doesn't have numbers fused with parenthesis unless it's a rating glitch.
      if (category && !category.match(/[0-9.]+\([0-9,]+\)/)) {
         return category;
      }
    }

    // 2. Try aria-label
    const ariaLabel = card.getAttribute('aria-label') || container.getAttribute('aria-label') || '';
    if (ariaLabel) {
       const parts = ariaLabel.split(',').map(sanitize);
       if (parts.length >= 2) {
          const potentialCategory = parts[1];
          if (!potentialCategory.includes('stars') && !potentialCategory.includes('reviews') && !/^[0-9.]+(?:\s*\([0-9,]+\))?$/.test(potentialCategory) && !/[₹$£€]/.test(potentialCategory)) {
             return potentialCategory;
          }
       }
    }
    
    return 'Local Business';
  },

  getAddress(card: Element): string {
    const container = this.getContainer(card);
    if (!container) return '';
    
    const sanitize = (s: string) => s.replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '').trim();
    
    // Address indicator words common in Indian/global addresses
    const addressIndicators = /\b(rd|road|st|street|nagar|society|plot|shop|floor|block|sector|phase|market|chowk|lane|gali|near|opp|behind|beside|next|above|below|marg|path|circle|square|colony|park|garden|enclave|vihar|puram|abad|pura|wadi|falia|chawk|main|cross|layout|extension|complex|tower|building|bldg|arcade|plaza|mall|center|centre|industrial|estate|area|zone|no\.|g-|ug-)\b/i;
    const pricePattern = /[₹$£€]|^\d+[–\-]\d+$/;
    const nonAddressPattern = /^(open|close|temporarily|delivery|dine-in|takeout|takeaway|curbside|no\s*contact|order|menu|reserve)/i;

    let visualAddress = '';

    // Strategy 1: Look for dot-separated segments in the subtitle area
    const allTextElements = Array.from(container.querySelectorAll('div, span'));
    
    for (const el of allTextElements) {
      const text = el.textContent || '';
      if (!text.includes('·') && !text.includes('⋅')) continue;
      if (el.children.length > 8) continue; // skip huge containers
      
      const parts = text.split(/[·⋅]/).map(sanitize).filter(Boolean);
      if (parts.length <= 1) continue;
      
      // Find segments that look like addresses
      for (let i = parts.length - 1; i >= 1; i--) {
        const seg = parts[i];
        if (pricePattern.test(seg)) continue;
        if (nonAddressPattern.test(seg)) continue;
        if (/^[0-9.]+(?:\s*\([0-9,]+\))?$/.test(seg)) continue;
        if (seg.toLowerCase().includes('star') || seg.toLowerCase().includes('review')) continue;
        
        // Check if it looks like an address
        if (addressIndicators.test(seg) || (seg.length > 5 && /[a-zA-Z]/.test(seg) && /\d/.test(seg))) {
          visualAddress = seg;
          break;
        }
      }
      
      // If no address indicator found, take last valid non-price segment as potential address
      if (!visualAddress) {
        for (let i = parts.length - 1; i >= 1; i--) {
          const seg = parts[i];
          if (pricePattern.test(seg)) continue;
          if (nonAddressPattern.test(seg)) continue;
          if (/^[0-9.]+(?:\s*\([0-9,]+\))?$/.test(seg)) continue;
          if (seg.toLowerCase().includes('star') || seg.toLowerCase().includes('review')) continue;
          if (/[a-zA-Z]/.test(seg) && seg.length > 3) {
            visualAddress = seg;
            break;
          }
        }
      }
      
      if (visualAddress) break;
    }

    // Strategy 2: Look for standalone text elements that look like addresses
    if (!visualAddress) {
      const leafElements = allTextElements.filter(el => {
        // Only leaf or near-leaf elements
        if (el.children.length > 2) return false;
        const text = sanitize(el.textContent || '');
        if (!text || text.length < 5) return false;
        if (pricePattern.test(text)) return false;
        if (nonAddressPattern.test(text)) return false;
        if (text.includes('·') || text.includes('⋅')) return false; // already handled
        return addressIndicators.test(text);
      });
      
      if (leafElements.length > 0) {
        visualAddress = sanitize(leafElements[0].textContent || '');
      }
    }

    // Strategy 3: Expand truncated address via aria-label
    const ariaLabel = sanitize(card.getAttribute('aria-label') || container.getAttribute('aria-label') || '');
    if (ariaLabel && visualAddress) {
       const cleanVisual = visualAddress.replace(/\.\.\.$/, '').replace(/…$/, '').trim();
       const startIndex = ariaLabel.indexOf(cleanVisual);
       
       if (startIndex !== -1) {
          let endIndex = ariaLabel.length;
          const ratingMatch = ariaLabel.match(/[,·⋅]?\s*[0-9.]+\s*stars?/i);
          if (ratingMatch && ratingMatch.index !== undefined) {
             endIndex = ratingMatch.index;
          } else {
             const reviewMatch = ariaLabel.match(/[,·⋅]?\s*[0-9.,]+\s*reviews?/i);
             if (reviewMatch && reviewMatch.index !== undefined) {
                endIndex = reviewMatch.index;
             }
          }
          
          if (endIndex > startIndex) {
             let fullAddress = ariaLabel.substring(startIndex, endIndex).trim();
             fullAddress = fullAddress.replace(/,+$/, '').trim();
             if (!fullAddress.toLowerCase().includes('visited link') && !/[₹$£€]/.test(fullAddress)) {
                 return fullAddress;
             }
          }
       }
    }

    // Strategy 4: Parse aria-label directly for address clues
    if (ariaLabel && !visualAddress) {
       const parts = ariaLabel.split(',').map(sanitize);
       // Look for parts that contain address indicators
       for (const part of parts) {
          if (addressIndicators.test(part) && !part.includes('stars') && !part.includes('reviews') && !/[₹$£€]/.test(part)) {
             return part;
          }
       }
    }

    if (visualAddress && !visualAddress.toLowerCase().includes('visited link')) {
       return visualAddress;
    }
    
    return '';
  },

  /**
   * Locates external website domain links.
   * FIXED: Now searches parent scope too — cafe/restaurant cards render
   * the website button outside the immediate container div.
   */
  getWebsite(card: Element): string {
    const container = this.getContainer(card);
    if (!container) return '';

    // 1. Try authority link inside container
    const websiteEl = container.querySelector(this.website) as HTMLAnchorElement | null;
    if (websiteEl && websiteEl.href) {
      return websiteEl.href;
    }

    // 2. Broaden scope to parent — catches cafe cards where website button
    //    is rendered in a sibling div outside the detected container
    const parentScope = container.parentElement || container;
    const websiteInParent = parentScope.querySelector(this.website) as HTMLAnchorElement | null;
    if (websiteInParent && websiteInParent.href) {
      return websiteInParent.href;
    }

    // 3. Scan buttons/anchors with data-item-id containing "authority"
    const allLinks = Array.from(parentScope.querySelectorAll('a[data-item-id], button[data-item-id]'));
    for (const el of allLinks) {
      const itemId = el.getAttribute('data-item-id') || '';
      if (itemId.includes('authority') || itemId.includes('url')) {
        const href = (el as HTMLAnchorElement).href || '';
        if (href && !href.includes('google.com') && !href.includes('gstatic.com')) {
          return href;
        }
      }
    }

    // 4. Scan all anchor tags — exclude Google-owned domains
    const anchors = Array.from(parentScope.querySelectorAll('a'));
    for (const anchor of anchors) {
      const href = anchor.href || '';
      if (
        href &&
        !href.includes('google.com') &&
        !href.includes('gstatic.com') &&
        !href.startsWith('javascript:') &&
        !href.startsWith('#') &&
        (href.startsWith('http://') || href.startsWith('https://'))
      ) {
        return href;
      }
    }

    return '';
  },

  /**
   * Enhanced phone number extraction with complete un-truncated digit matching
   * and precise source detection tracking.
   * FIXED: Also searches parent scope for phone buttons in cafe-type cards.
   */
  getPhoneDetails(card: Element): { phone: string; source: 'Business Card' | 'Business Details Panel' | 'Text Parser' } {
    const container = this.getContainer(card);
    if (!container) return { phone: '', source: 'Text Parser' };

    // Detect if container is part of the detail panel
    const isDetailsPanel = !!(
      container.closest('div[role="main"]') || 
      container.closest('.m6U6ee') || 
      container.closest('.bJ419') ||
      container.matches('div[role="main"], .m6U6ee, .bJ419')
    );
    const primarySource = isDetailsPanel ? 'Business Details Panel' : 'Business Card';

    // Helper: extract phone from a button element
    const extractFromButton = (phoneEl: HTMLButtonElement): string | null => {
      // A. data-item-id with tel href — most reliable
      const itemId = phoneEl.getAttribute('data-item-id') || '';
      const telMatch = itemId.match(/phone:tel:(.+)/);
      if (telMatch && telMatch[1]) return telMatch[1].trim();

      // B. Tooltip / aria-label
      const tooltip = phoneEl.getAttribute('data-tooltip') || phoneEl.getAttribute('aria-label') || '';
      const phoneMatch = tooltip.match(/\+?\d[\d\s\-\(\)]{8,18}\d/);
      if (phoneMatch) return phoneMatch[0].trim();

      // C. Button inner text (some cards render number as visible text)
      const btnText = (phoneEl.textContent || '').trim();
      const btnMatch = btnText.match(/\+?\d[\d\s\-\(\)]{8,18}\d/);
      if (btnMatch) return btnMatch[0].trim();

      return null;
    };

    // 1. Check inside container first
    const phoneElInContainer = container.querySelector(this.phone) as HTMLButtonElement | null;
    if (phoneElInContainer) {
      const result = extractFromButton(phoneElInContainer);
      if (result) return { phone: result, source: primarySource };
    }

    // 2. Check parent scope — cafe cards render phone button outside container
    const parentScope = container.parentElement || container;
    const phoneElInParent = parentScope.querySelector(this.phone) as HTMLButtonElement | null;
    if (phoneElInParent && phoneElInParent !== phoneElInContainer) {
      const result = extractFromButton(phoneElInParent);
      if (result) return { phone: result, source: primarySource };
    }

    // 3. Scan ALL phone-like buttons in parent scope (broader selector)
    const allPhoneButtons = Array.from(
      parentScope.querySelectorAll('button[data-item-id*="phone"], button[aria-label*="phone"], button[data-tooltip*="phone"], a[href^="tel:"]')
    ) as HTMLElement[];
    for (const el of allPhoneButtons) {
      // Handle tel: links
      const href = (el as HTMLAnchorElement).href || '';
      if (href.startsWith('tel:')) {
        return { phone: href.replace('tel:', '').trim(), source: primarySource };
      }
      if (el.tagName === 'BUTTON') {
        const result = extractFromButton(el as HTMLButtonElement);
        if (result) return { phone: result, source: primarySource };
      }
    }

    // 4. Text parser fallback — scan container then parent text
    const containerText = container.textContent || '';
    const textMatch = containerText.match(/\+?\d[\d\s\-\(\)]{8,18}\d/);
    if (textMatch) {
      return { phone: textMatch[0].trim(), source: 'Text Parser' };
    }

    const parentText = parentScope.textContent || '';
    const parentTextMatch = parentText.match(/\+?\d[\d\s\-\(\)]{8,18}\d/);
    if (parentTextMatch) {
      return { phone: parentTextMatch[0].trim(), source: 'Text Parser' };
    }

    return { phone: '', source: 'Text Parser' };
  },

  /**
   * Locates phone numbers listed in text attributes (backwards compatibility).
   */
  getPhone(card: Element): string {
    return this.getPhoneDetails(card).phone;
  },

  /**
   * Extracts verified Google Maps URL.
   */
  getMapsUrl(card: Element): string {
    return (card as HTMLAnchorElement).href || 'https://maps.google.com';
  },

  /**
   * Tries to find an email address in the visible text.
   */
  getEmail(card: Element): string {
    const container = this.getContainer(card);
    if (!container) return '';
    const text = container.textContent || '';
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0] : '';
  },

  // ─── Detail Panel Selectors (for click-through enrichment) ───
  detailPanel: 'div[role="main"]',
  detailPhone: 'button[data-item-id*="phone:tel:"]',
  detailWebsite: 'a[data-item-id="authority"]',
  detailAddress: 'button[data-item-id="address"], button[data-item-id*="address"]',
  backButton: 'button[jsaction*="pane.header.back"], button[aria-label="Back"], button[aria-label*="Back to"]',

  /**
   * Extracts phone number from the detail panel.
   * The detail panel renders phone as a button with data-item-id="phone:tel:+91XXXXXXXXXX".
   */
  getDetailPhone(): string {
    // Try all phone buttons in the document
    const phoneButtons = document.querySelectorAll(this.detailPhone);
    for (const btn of Array.from(phoneButtons)) {
      const itemId = btn.getAttribute('data-item-id') || '';
      const telMatch = itemId.match(/phone:tel:(.+)/);
      if (telMatch && telMatch[1]) return telMatch[1].trim();
    }

    // Fallback: aria-label on phone buttons
    const phoneByLabel = document.querySelector('button[aria-label*="Phone"], button[aria-label*="phone"], button[data-tooltip*="phone"]');
    if (phoneByLabel) {
      const label = phoneByLabel.getAttribute('aria-label') || phoneByLabel.getAttribute('data-tooltip') || '';
      const phoneMatch = label.match(/\+?\d[\d\s\-\(\)]{8,18}\d/);
      if (phoneMatch) return phoneMatch[0].trim();
    }

    // Fallback: tel: links
    const telLink = document.querySelector('a[href^="tel:"]') as HTMLAnchorElement | null;
    if (telLink && telLink.href) {
      return telLink.href.replace('tel:', '').trim();
    }

    return '';
  },

  /**
   * Extracts website URL from the detail panel.
   */
  getDetailWebsite(): string {
    // Primary: authority link
    const websiteEl = document.querySelector(this.detailWebsite) as HTMLAnchorElement | null;
    if (websiteEl && websiteEl.href) return websiteEl.href;

    // Fallback: any link with data-item-id containing 'authority' or 'url'
    const allLinks = Array.from(document.querySelectorAll('a[data-item-id]'));
    for (const el of allLinks) {
      const itemId = el.getAttribute('data-item-id') || '';
      if (itemId.includes('authority') || itemId.includes('url')) {
        const href = (el as HTMLAnchorElement).href || '';
        if (href && !href.includes('google.com') && !href.includes('gstatic.com')) {
          return href;
        }
      }
    }

    return '';
  },

  /**
   * Extracts full address from the detail panel.
   */
  getDetailAddress(): string {
    // Primary: address button
    const addressBtn = document.querySelector(this.detailAddress);
    if (addressBtn) {
      const ariaLabel = addressBtn.getAttribute('aria-label') || '';
      if (ariaLabel) return ariaLabel.replace(/^Address:\s*/i, '').trim();
      
      const text = addressBtn.textContent?.trim() || '';
      if (text.length > 5) return text;
    }

    // Fallback: look for address-like content in the panel
    const addressDivs = document.querySelectorAll('button[data-item-id*="address"]');
    for (const div of Array.from(addressDivs)) {
      const text = div.textContent?.trim() || '';
      if (text.length > 5) return text;
    }

    return '';
  },

  /**
   * Finds and returns the back button element to navigate back to results list.
   */
  getBackButton(): HTMLButtonElement | null {
    return document.querySelector(this.backButton) as HTMLButtonElement | null;
  },
} as const;
