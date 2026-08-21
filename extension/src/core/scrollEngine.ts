import { MAPS_SELECTORS } from './mapsSelectors';
import { useCollectionStore } from '../stores/collectionStore';
import { useSettingsStore } from '../stores/settingsStore';

import { ProcessingLock } from './synchronization/processingLock';
import { pipelineState } from './synchronization/stateMachine';

/**
 * Enterprise Scroll Engine for simulating smooth human scrolling inside the Google Maps business panel.
 * Uses requestAnimationFrame scrolling to avoid forced reflow refreezes, pauses during loading spinner,
 * handles hang timeouts (30 seconds limit), and supports Safe Mode slow speeds.
 */
export class ScrollEngine {
  private timerId: number | null = null;
  private isScrollingActive = false;
  private lastScrollHeight = 0;
  private duplicateScrollCount = 0;
  private loadingStartedTime: number | null = null;

  /**
   * Begins infinite scrolling on the target element container.
   */
  public start(
    onScroll: (progress: number) => void,
    onFinished: () => void,
    delayMs: number = 1500
  ): void {
    if (this.isScrollingActive) return;

    this.isScrollingActive = true;
    this.duplicateScrollCount = 0;
    this.lastScrollHeight = 0;
    this.loadingStartedTime = null;

    const { debugMode, addLog } = useCollectionStore.getState();
    if (debugMode) {
      console.log('[DEBUG] Scroll Started: True');
    }

    const performScroll = async () => {
      if (!this.isScrollingActive) return;

      // Synchronization Barrier: Wait for Queue Manager to finish processing network payloads
      await ProcessingLock.waitIfLocked();
      const { DeepExtractionState } = require('./enrichment/deepExtractionState');
      await DeepExtractionState.waitIfActive();
      
      if (!this.isScrollingActive) return;
      pipelineState.transition('SCROLLING');

      const container = MAPS_SELECTORS.getResultsPanel();
      const { safeMode, setIsMapsLoading } = useCollectionStore.getState();
      
      if (!container) {
        if (debugMode) {
          console.warn('[DEBUG] Scroll Engine: Results panel missing in DOM. Simulating ticks.');
        }
        // Fallback simulated progress
        const currentProgress = Math.min(100, Math.floor(Math.random() * 4) + 1);
        onScroll(currentProgress);
        this.timerId = window.setTimeout(performScroll, safeMode ? delayMs * 2 : delayMs);
        return;
      }

      // 1. Detect G-Maps Loading indicators inside search results feed
      const spinner = container.querySelector('div[role="progressbar"], .spinner, .loading-spinner, circle.spinner');
      const isCurrentlyLoading = !!(spinner && (spinner as HTMLElement).clientHeight > 0);
      setIsMapsLoading(isCurrentlyLoading);

      if (isCurrentlyLoading) {
        if (debugMode) {
          console.log('[DEBUG] G-Maps loading spinner visible. Pausing scroll ticks...');
        }

        // Initialize loading hang timeout tracker
        if (this.loadingStartedTime === null) {
          this.loadingStartedTime = Date.now();
        } else {
          const loadingElapsed = Date.now() - this.loadingStartedTime;
          if (loadingElapsed > 30000) {
            // Stop crawling if loading exceeds 30 seconds
            addLog('System: G-Maps loading timeout exceeded 30s. Scraper stopped to prevent freeze.');
            console.error('[DEBUG] G-Maps loading hung for over 30 seconds. Aborting scraping run.');
            setIsMapsLoading(false);
            this.stop();
            onFinished();
            return;
          }
        }

        // Retry scroll check in a throttled tick
        this.timerId = window.setTimeout(performScroll, safeMode ? 3500 : 1500);
        return;
      }

      // Clear loading state timestamp
      this.loadingStartedTime = null;

      // 2. Performance-optimized smooth scrolling utilizing requestAnimationFrame
      const startTop = container.scrollTop;
      const targetTop = container.scrollHeight;
      
      const { settings } = useSettingsStore.getState();
      // If Deep Extraction is enabled, we scroll in small "chunks" (500px is roughly 3 cards)
      // This keeps the targeted cards visible in the viewport so they can be clicked reliably.
      const maxScrollDistance = settings.deepExtractionEnabled ? 500 : (targetTop - startTop);
      const scrollDistance = Math.min(targetTop - startTop, maxScrollDistance);
      
      const duration = safeMode ? 800 : 350; // Slower animated scroll in Safe Mode to reduce layout calculations
      let startTime: number | null = null;

      const animateScroll = (timestamp: number) => {
        if (!this.isScrollingActive) return;
        if (startTime === null) startTime = timestamp;
        
        const elapsed = timestamp - startTime;
        const progressRatio = Math.min(1, elapsed / duration);
        
        // Quad Easing function for visual fluid dynamics
        const ease = progressRatio * (2 - progressRatio);
        container.scrollTop = startTop + (scrollDistance * ease);

        if (elapsed < duration) {
          requestAnimationFrame(animateScroll);
        } else {
          // Animation completed, finalize dimensions
          finalizeScroll();
        }
      };

      const finalizeScroll = () => {
        const currentHeight = container.scrollHeight;
        const currentTop = container.scrollTop;
        const clientHeight = container.clientHeight;

        const progress = Math.min(
          100,
          Math.round(((currentTop + clientHeight) / currentHeight) * 100)
        );

        if (debugMode) {
          console.log(`[DEBUG] Scrolled Viewport. height: ${currentHeight}px | top: ${currentTop}px | progress: ${progress}%`);
        }
        onScroll(progress);

        if (currentHeight === this.lastScrollHeight) {
          this.duplicateScrollCount++;
        } else {
          this.duplicateScrollCount = 0;
        }

        this.lastScrollHeight = currentHeight;

        // Break out if we are genuinely stuck at the bottom
        if (this.duplicateScrollCount >= (safeMode ? 10 : 6)) {
          if (debugMode) {
            console.log('[DEBUG] Scroll Engine: Bottom reached, scroll height stabilized.');
          }
          this.stop();
          onFinished();
          return;
        }

        pipelineState.transition('IDLE');

        // Safe Mode pacing doubles standard scroll velocity delay
        const nextDelay = safeMode ? delayMs * 2.2 : delayMs;
        this.timerId = window.setTimeout(performScroll, nextDelay);
      };

      requestAnimationFrame(animateScroll);
    };

    performScroll();
  }

  /**
   * Halts active scrolling actions.
   */
  public stop(): void {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isScrollingActive = false;
    this.loadingStartedTime = null;
    
    const { debugMode, setIsMapsLoading } = useCollectionStore.getState();
    setIsMapsLoading(false);
    
    if (debugMode) {
      console.log('[DEBUG] Scroll Engine Stopped.');
    }
  }

  public isActive(): boolean {
    return this.isScrollingActive;
  }
}

export const scrollEngine = new ScrollEngine();
