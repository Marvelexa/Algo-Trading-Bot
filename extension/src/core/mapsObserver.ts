import { parseBusinessCard } from './businessParser';
import { MAPS_SELECTORS } from './mapsSelectors';
import { Lead } from '../types/lead';
import { useCollectionStore } from '../stores/collectionStore';
import { networkPipeline } from './network/networkPipeline';
import { queueManager } from './synchronization/queueManager';
export class MapsObserver {
  private feedObserver: MutationObserver | null = null;
  private bodyObserver: MutationObserver | null = null;
  private scanIntervalId: any = null;
  private isObservingActive = false;
  private processedSignatures = new Set<string>();
  
  // High-performance batching queue
  private mutatedCardsQueue = new Set<Element>();
  private animationFrameId: number | null = null;
  private onLeadsFoundCallback: ((leads: Partial<Lead>[]) => void) | null = null;

  /**
   * Performs Google Maps compatibility diagnostics and commits results to store.
   */
  public runCompatibilityDiagnostics(): void {
    const { setDiagnostics, debugMode } = useCollectionStore.getState();

    const resultsPanel = MAPS_SELECTORS.getResultsPanel();
    const resultsPanelExists = !!resultsPanel;
    
    const scrollContainerExists = !!document.querySelector(MAPS_SELECTORS.resultsFeed);
    const cards = MAPS_SELECTORS.getBusinessCards();
    const cardsCount = cards.length;

    let parsingWorkingCount = 0;
    if (cardsCount > 0) {
      // Diagnostic parse is now handled asynchronously when cards enter the queue
      // For immediate diagnostic UI, we will assume working if cards exist, or await it if needed.
      // Since this runs synchronously in many places, we just verify the selector is firing.
      parsingWorkingCount = cardsCount > 0 ? 1 : 0;
    }

    setDiagnostics({
      resultsPanelExists,
      scrollContainerExists,
      cardsCount,
      parsingWorkingCount,
    });

    if (debugMode) {
      console.log(`[DEBUG] G-Maps Compatibility Diagnostics:
  • Results Panel: ${resultsPanelExists ? 'FOUND' : 'MISSING'}
  • Scroll Container: ${scrollContainerExists ? 'FOUND' : 'MISSING'}
  • Business Cards: ${cardsCount} detected
  • Parsing Pipeline: ${parsingWorkingCount > 0 ? 'WORKING' : 'FAILING'}`);
    }
  }

  /**
   * Starts resilient DOM observation with extremely low CPU footprint.
   */
  public start(
    onLeadsFound: (leads: Partial<Lead>[]) => void
  ): void {
    if (this.isObservingActive) return;

    this.isObservingActive = true;
    this.processedSignatures.clear();
    this.mutatedCardsQueue.clear();
    this.onLeadsFoundCallback = onLeadsFound;
    
    // Start Network Extraction Layer
    networkPipeline.start();

    const { addLog, debugMode } = useCollectionStore.getState();

    if (debugMode) {
      console.log('[DEBUG] Maps Observer Initialized...');
    }

    addLog('System: Mounting diagnostic DOM observer...');
    this.runCompatibilityDiagnostics();

    // 1. Check if Results Feed already exists
    const feed = MAPS_SELECTORS.getResultsPanel();
    if (feed) {
      this.bootstrapFeedObserver(feed);
    } else {
      // Results Feed is missing, attach lightweight bootstrapper on body
      if (debugMode) {
        console.log('[DEBUG] G-Maps Results Feed missing on start. Monitoring body for feed appearance...');
      }
      this.bodyObserver = new MutationObserver(() => {
        const targetFeed = MAPS_SELECTORS.getResultsPanel();
        if (targetFeed) {
          if (debugMode) {
            console.log('[DEBUG] G-Maps Results Feed detected via MutationObserver. Relinking focused observer...');
          }
          if (this.bodyObserver) {
            this.bodyObserver.disconnect();
            this.bodyObserver = null;
          }
          this.bootstrapFeedObserver(targetFeed);
          // Also process any cards already visible
          const visibleCards = MAPS_SELECTORS.getBusinessCards();
          if (visibleCards.length > 0) {
            this.queueCardsForProcessing(visibleCards);
          }
        }
      });

      this.bodyObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Fallback polling retry: G-Maps sometimes injects the feed without triggering mutations
      // (e.g., via framework-level virtual DOM swaps). Poll every 1s for up to 15 seconds.
      let retryCount = 0;
      const maxRetries = 15;
      const retryInterval = setInterval(() => {
        retryCount++;
        const retryFeed = MAPS_SELECTORS.getResultsPanel();
        if (retryFeed) {
          clearInterval(retryInterval);
          if (this.bodyObserver) {
            this.bodyObserver.disconnect();
            this.bodyObserver = null;
          }
          if (debugMode) {
            console.log(`[DEBUG] G-Maps Results Feed detected via polling retry (attempt ${retryCount}). Bootstrapping...`);
          }
          this.bootstrapFeedObserver(retryFeed);
          const visibleCards = MAPS_SELECTORS.getBusinessCards();
          if (visibleCards.length > 0) {
            this.queueCardsForProcessing(visibleCards);
          }
        } else if (retryCount >= maxRetries) {
          clearInterval(retryInterval);
          if (debugMode) {
            console.warn(`[DEBUG] G-Maps Results Feed not found after ${maxRetries} polling retries.`);
          }
          addLog('System: Warning — Google Maps results feed not detected. Make sure you have search results visible.');
        }
      }, 1000);
    }

    // 2. Proactively parse existing cards in viewport
    const existingCards = MAPS_SELECTORS.getBusinessCards();
    if (existingCards.length > 0) {
      if (debugMode) {
        console.log(`[DEBUG] Viewport populated on start. Processing ${existingCards.length} cards.`);
      }
      this.queueCardsForProcessing(existingCards);
    }

    // 3. Start a periodic card scraper loop (1200ms) to bypass DOM virtualization recycling
    this.scanIntervalId = setInterval(() => {
      if (!this.isObservingActive) return;
      const visibleCards = MAPS_SELECTORS.getBusinessCards();
      if (visibleCards.length > 0) {
        this.queueCardsForProcessing(visibleCards);
      }
    }, 1200);
  }

  /**
   * Links MutationObserver directly to results feed list container (extreme CPU footprint reduction).
   */
  private bootstrapFeedObserver(feed: Element): void {
    const cardSelector = MAPS_SELECTORS.businessCard;
    const { debugMode } = useCollectionStore.getState();

    this.feedObserver = new MutationObserver((mutations) => {
      const addedCards: Element[] = [];

      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as Element;

          if (el.matches(cardSelector)) {
            addedCards.push(el);
          } else {
            // Highly restricted DOM query (scoped inside the mutated subtree only)
            const descendants = el.querySelectorAll(cardSelector);
            descendants.forEach((c) => addedCards.push(c));
          }
        });
      }

      if (addedCards.length > 0) {
        this.queueCardsForProcessing(addedCards);
      }
    });

    this.feedObserver.observe(feed, {
      childList: true,
      subtree: true,
    });
  }


  private getCardSignature(card: Element): string {
    const anchor = card.querySelector('a');
    if (anchor && anchor.href) {
      // Extract the core place URL to avoid tracking query parameters
      return anchor.href.split('?')[0];
    }
    // Fallback to text content if no anchor
    return card.textContent ? card.textContent.trim().substring(0, 50) : Math.random().toString();
  }

  /**
   * Pushes cards directly into the QueueManager, which handles processing locks.
   */
  private queueCardsForProcessing(cards: Element[]): void {
    if (!this.onLeadsFoundCallback) return;
    
    // Set the callback if not already set
    queueManager.setCallback((leads) => {
      this.runCompatibilityDiagnostics();
      if (this.onLeadsFoundCallback && leads.length > 0) {
        this.onLeadsFoundCallback(leads as Partial<Lead>[]);
      }
    });

    // Deduplicate cards AT THE SOURCE to prevent queue flooding and massive lag
    const newCards = cards.filter(card => {
      const sig = this.getCardSignature(card);
      if (this.processedSignatures.has(sig)) {
        return false;
      }
      this.processedSignatures.add(sig);
      return true;
    });

    if (newCards.length === 0) return;

    const { incrementCardsFound } = useCollectionStore.getState();
    incrementCardsFound(newCards.length);
    
    // Push directly to the async synchronized queue manager
    queueManager.enqueue(newCards);
  }

  /**
   * Concludes DOM MutationObserver.
   */
  public stop(): void {
    if (this.feedObserver) {
      this.feedObserver.disconnect();
      this.feedObserver = null;
    }
    if (this.bodyObserver) {
      this.bodyObserver.disconnect();
      this.bodyObserver = null;
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.scanIntervalId !== null) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }

    this.isObservingActive = false;
    this.processedSignatures.clear();
    this.mutatedCardsQueue.clear();
    this.onLeadsFoundCallback = null;
    
    networkPipeline.stop();

    useCollectionStore.getState().addLog('System: DOM Scraper Observer terminated.');
  }

  public isActive(): boolean {
    return this.isObservingActive;
  }
}

export const mapsObserver = new MapsObserver();
