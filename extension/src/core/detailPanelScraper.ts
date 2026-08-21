import { MAPS_SELECTORS } from './mapsSelectors';
import { useCollectionStore } from '../stores/collectionStore';
import { useLeadStore } from '../stores/leadStore';
import { useSettingsStore } from '../stores/settingsStore';
import { validateAndNormalizePhone } from '../utils/phoneNormalizer';
import { isValidBusinessWebsite, extractActualWebsite } from '../utils/websiteValidator';

export interface EnrichmentResult {
  phone: string;
  website: string;
  address: string;
}

/**
 * Detail Panel Scraper — Click-Through Enrichment Engine
 * 
 * Google Maps list-view cards do NOT contain phone numbers or website links.
 * That data only exists in the detail side-panel (opened by clicking a business).
 * 
 * This module programmatically:
 * 1. Clicks each business card anchor
 * 2. Waits for the detail panel to render with phone/website data
 * 3. Extracts phone, website, and full address from the live DOM
 * 4. Clicks the back button to return to the results list
 * 5. Waits for the list to re-render before processing the next card
 */
export class DetailPanelScraper {
  private isRunning = false;
  private shouldStop = false;
  private enrichQueue: Array<{ leadId: string; card: Element; name: string }> = [];
  private processedLeadIds = new Set<string>();

  /**
   * Waits for a condition to become true, polling at the given interval.
   * Returns true if condition met, false if timed out.
   */
  private waitFor(
    condition: () => boolean,
    timeoutMs: number = 8000,
    pollMs: number = 200
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (condition()) {
          resolve(true);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(check, pollMs);
      };
      check();
    });
  }

  /**
   * Simple delay promise.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simulates a trusted-like user click to trigger Google Maps' SPA router.
   * A basic .click() often triggers a native href navigation (full page reload),
   * which kills the content script.
   */
  private simulateInteraction(element: Element): void {
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(eventType => {
      const event = new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        buttons: 1
      });
      element.dispatchEvent(event);
    });
  }

  /**
   * Detects whether the detail panel is loaded with business data.
   */
  private isDetailPanelReady(leadName: string): boolean {
    // 1. Check for the back button (strongest signal)
    if (MAPS_SELECTORS.getBackButton()) return true;

    // 2. Check for detail-specific action buttons
    const hasActions = !!document.querySelector(
      'button[data-item-id*="phone:tel:"], a[data-item-id="authority"]'
    );
    if (hasActions) return true;

    // 3. Check if an h1 matches the business name
    const h1s = Array.from(document.querySelectorAll('h1'));
    const isNamePresent = h1s.some(h1 => {
        const text = (h1.textContent || '').trim().toLowerCase();
        const target = leadName.trim().toLowerCase();
        return text && target && (text.includes(target) || target.includes(text));
    });

    return isNamePresent;
  }

  /**
   * Checks if the results list feed is visible again (after navigating back).
   */
  private isResultsListVisible(): boolean {
    const feed = MAPS_SELECTORS.getResultsPanel();
    if (!feed) return false;
    // Verify at least one card is visible
    const cards = feed.querySelectorAll(MAPS_SELECTORS.businessCard);
    return cards.length > 0;
  }

  /**
   * Scrapes phone, website, and address from the currently open detail panel.
   */
  private scrapeDetailPanel(): EnrichmentResult {
    const { defaultCountryCode } = useSettingsStore.getState().settings;
    const { debugMode } = useCollectionStore.getState();

    let phone = MAPS_SELECTORS.getDetailPhone();
    const rawWebsite = MAPS_SELECTORS.getDetailWebsite();
    const address = MAPS_SELECTORS.getDetailAddress();

    // Normalize phone
    if (phone) {
      const valResult = validateAndNormalizePhone(phone, defaultCountryCode);
      if (valResult.isValid && valResult.normalizedPhone) {
        phone = valResult.normalizedPhone;
      } else {
        // Keep raw phone if normalization fails but it looks phone-like
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 8) phone = '';
      }
    }

    // Validate and sanitize website
    let website = '';
    if (rawWebsite) {
      const actual = extractActualWebsite(rawWebsite);
      if (isValidBusinessWebsite(actual)) {
        try {
          const cleanUrl = actual.trim();
          if (!/^https?:\/\//i.test(cleanUrl)) {
            website = `https://${cleanUrl}`;
          } else {
            const parsed = new URL(cleanUrl);
            website = `${parsed.protocol}//${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
          }
        } catch {
          website = actual;
        }
      }
    }

    if (debugMode) {
      console.log(`[DetailScraper] Panel Data Extracted:\n  • Phone: ${phone || 'NONE'}\n  • Website: ${website || 'NONE'}\n  • Address: ${address || 'NONE'}`);
    }

    return { phone, website, address };
  }

  /**
   * Navigates back to the results list by clicking the back button.
   * Falls back to browser history if back button is not found.
   */
  private async navigateBack(): Promise<boolean> {
    const { debugMode } = useCollectionStore.getState();

    // Try clicking the back button
    const backBtn = MAPS_SELECTORS.getBackButton();
    if (backBtn) {
      this.simulateInteraction(backBtn);
      if (debugMode) {
        console.log('[DetailScraper] Clicked back button');
      }
    } else {
      // Fallback: use browser history
      if (debugMode) {
        console.log('[DetailScraper] Back button not found, using history.back()');
      }
      window.history.back();
    }

    // Wait for results list to reappear
    const listReappeared = await this.waitFor(
      () => this.isResultsListVisible(),
      6000,
      250
    );

    if (!listReappeared) {
      if (debugMode) {
        console.warn('[DetailScraper] Results list did not reappear after back navigation');
      }
      // Try one more time with history.back
      window.history.back();
      await this.delay(2000);
    }

    return listReappeared;
  }

  /**
   * Performs a single click-through enrichment for one business card.
   */
  private async enrichSingleCard(
    card: Element,
    leadId: string,
    leadName: string
  ): Promise<EnrichmentResult | null> {
    const { debugMode, addLog } = useCollectionStore.getState();

    try {
      if (debugMode) {
        console.log(`[DetailScraper] Opening detail panel for: "${leadName}"`);
      }

      // 1. Click the business card anchor to open detail panel
      // Use simulated events to prevent full page reload!
      this.simulateInteraction(card);

      // 2. Wait for detail panel to load with content
      const panelLoaded = await this.waitFor(
        () => this.isDetailPanelReady(leadName),
        8000,
        300
      );

      if (!panelLoaded) {
        if (debugMode) {
          console.warn(`[DetailScraper] Detail panel did not load for: "${leadName}"`);
        }
        addLog(`Enrichment: Panel timeout for "${leadName}"`);
        await this.navigateBack();
        return null;
      }

      // 3. Brief additional wait for dynamic content (phone/website buttons render slightly after panel)
      await this.delay(800);

      // 4. Scrape the detail panel
      const result = this.scrapeDetailPanel();

      // 5. Navigate back to results list
      await this.navigateBack();

      // 6. Brief stabilization wait after returning to list
      await this.delay(500);

      return result;
    } catch (error) {
      console.error(`[DetailScraper] Error enriching "${leadName}":`, error);
      // Attempt recovery: navigate back
      try {
        await this.navigateBack();
      } catch {
        // Last resort
        window.history.back();
        await this.delay(2000);
      }
      return null;
    }
  }

  /**
   * Queues leads for background detail-panel enrichment.
   * Only leads missing phone OR website are queued.
   */
  public queueForEnrichment(
    leads: Array<{ id: string; name: string; phone: string; website: string }>,
    cards: Element[]
  ): void {
    const { debugMode } = useCollectionStore.getState();

    // Match leads to their cards by index
    for (let i = 0; i < leads.length && i < cards.length; i++) {
      const lead = leads[i];
      const card = cards[i];

      // Skip if already queued or already has both phone and website
      if (this.processedLeadIds.has(lead.id)) continue;
      if (lead.phone && lead.website) continue;

      this.enrichQueue.push({ leadId: lead.id, card, name: lead.name });
      this.processedLeadIds.add(lead.id);
    }

    if (debugMode) {
      console.log(`[DetailScraper] Enrichment queue size: ${this.enrichQueue.length}`);
    }

    // Start processing if not already running
    if (!this.isRunning && this.enrichQueue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Queues a single lead for enrichment by finding its card in the DOM.
   */
  public queueLeadForEnrichment(lead: { id: string; name: string; phone: string; website: string; mapsUrl: string }): void {
    // Skip if already enriched or already has data
    if (this.processedLeadIds.has(lead.id)) return;
    if (lead.phone && lead.website) return;

    // Find the card in the current DOM by matching the maps URL
    const allCards = MAPS_SELECTORS.getBusinessCards();
    const matchingCard = allCards.find(card => {
      const href = (card as HTMLAnchorElement).href || '';
      return href === lead.mapsUrl;
    });

    // Alternative: match by aria-label containing the business name
    const cardByName = matchingCard || allCards.find(card => {
      const label = card.getAttribute('aria-label') || '';
      return label.toLowerCase().includes(lead.name.toLowerCase());
    });

    if (cardByName) {
      this.enrichQueue.push({ leadId: lead.id, card: cardByName, name: lead.name });
      this.processedLeadIds.add(lead.id);

      if (!this.isRunning) {
        this.processQueue();
      }
    }
  }

  /**
   * Processes the enrichment queue sequentially.
   */
  private async processQueue(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.shouldStop = false;

    const { addLog } = useCollectionStore.getState();
    const totalToEnrich = this.enrichQueue.length;
    let enrichedSoFar = 0;

    useCollectionStore.getState().setIsEnriching(true);
    addLog(`Enrichment: Starting detail-panel scraping for ${totalToEnrich} leads...`);

    while (this.enrichQueue.length > 0 && !this.shouldStop) {
      const item = this.enrichQueue.shift()!;
      enrichedSoFar++;

      useCollectionStore.getState().setEnrichmentProgress(enrichedSoFar, totalToEnrich, item.name);

      // Verify the card is still in the DOM (it may have been recycled by Maps)
      if (!document.body.contains(item.card)) {
        // Try to re-find the card
        const allCards = MAPS_SELECTORS.getBusinessCards();
        const replacement = allCards.find(c => {
          const label = c.getAttribute('aria-label') || '';
          return label.toLowerCase().includes(item.name.toLowerCase());
        });

        if (!replacement) {
          console.log(`[DetailScraper] Card for "${item.name}" no longer in DOM. Skipping.`);
          continue;
        }
        item.card = replacement;
      }

      const result = await this.enrichSingleCard(item.card, item.leadId, item.name);

      if (result) {
        const updates: Record<string, unknown> = {};
        let hasUpdates = false;

        // Only update fields that are currently empty
        const currentLead = useLeadStore.getState().leads.find(l => l.id === item.leadId);
        
        if (result.phone && (!currentLead?.phone || currentLead.phone === 'INVALID_PHONE')) {
          updates.phone = result.phone;
          hasUpdates = true;
        }

        if (result.website && !currentLead?.website) {
          updates.website = result.website;
          updates.hasWebsite = true;
          hasUpdates = true;
        }

        if (result.address && (!currentLead?.address || currentLead.address.length < 10)) {
          updates.address = result.address;
          hasUpdates = true;
        }

        if (hasUpdates) {
          useLeadStore.getState().updateLead(item.leadId, updates);
          addLog(`Enriched: "${item.name}" — Phone: ${result.phone || 'N/A'}, Website: ${result.website ? 'YES' : 'N/A'}`);
        } else {
          addLog(`Enrichment: No new data for "${item.name}"`);
        }
      }

      // Delay between enrichments to avoid detection
      if (this.enrichQueue.length > 0 && !this.shouldStop) {
        await this.delay(800);
      }
    }

    this.isRunning = false;
    useCollectionStore.getState().setIsEnriching(false);
    useCollectionStore.getState().setEnrichmentProgress(enrichedSoFar, totalToEnrich, '');
    addLog(`Enrichment: Completed. ${enrichedSoFar}/${totalToEnrich} leads processed.`);
  }

  /**
   * Stops the enrichment process gracefully.
   */
  public stop(): void {
    this.shouldStop = true;
    this.enrichQueue = [];
    const { debugMode } = useCollectionStore.getState();
    if (debugMode) {
      console.log('[DetailScraper] Enrichment stopped.');
    }
  }

  /**
   * Resets the scraper state for a new collection session.
   */
  public reset(): void {
    this.stop();
    this.processedLeadIds.clear();
    this.isRunning = false;
    this.shouldStop = false;
  }

  public isActive(): boolean {
    return this.isRunning;
  }
}

export const detailPanelScraper = new DetailPanelScraper();
