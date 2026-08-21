/**
 * Queue Manager
 * Buffers detected business cards, processes them sequentially or in batches,
 * and asserts Backpressure to stop the scroll engine when overloaded.
 */

import { ProcessingLock } from './processingLock';
import { pipelineState } from './stateMachine';
import { parseBusinessCard } from '../businessParser';
import { useCollectionStore } from '../../stores/collectionStore';
import { Lead } from '../../types/lead';
import { useSettingsStore } from '../../stores/settingsStore';

export class QueueManager {
  private queue: Element[] = [];
  private activeWorkers = 0;
  
  private get MAX_CONCURRENT_ENRICHMENT() {
    return useSettingsStore.getState().settings.deepExtractionEnabled ? 1 : 3;
  }
  private readonly HIGH_WATERMARK = 3;
  private readonly LOW_WATERMARK = 0;
  
  // Metrics
  public metrics = {
    queueSize: 0,
    activeEnrichments: 0,
    processingLatencyMs: 0,
    completionRate: 0,
    processedCount: 0,
    scrollPausedReason: 'None'
  };

  public setCallback(callback: (leads: Partial<Lead>[]) => void) {
    this.onLeadsResolved = callback;
  }

  private onLeadsResolved: ((leads: Partial<Lead>[]) => void) | null = null;
  private processedSignatures = new Set<string>();

  public enqueue(cards: Element[]) {
    console.log(`[QueueManager] ENQUEUE: ${cards.length} cards`);
    cards.forEach(c => this.queue.push(c));
    this.metrics.queueSize = this.queue.length;

    // Check High Watermark
    if (this.queue.length >= this.HIGH_WATERMARK) {
      ProcessingLock.acquire('QueueManager', 'HIGH_WATERMARK_EXCEEDED');
      this.metrics.scrollPausedReason = 'HIGH_WATERMARK_EXCEEDED';
      pipelineState.transition('BACKPRESSURE_PAUSE');
    }

    this.spawnWorkers();
  }

  public clear() {
    this.queue = [];
    this.processedSignatures.clear();
    this.activeWorkers = 0;
    this.metrics.queueSize = 0;
    this.metrics.activeEnrichments = 0;
    ProcessingLock.release();
  }

  private spawnWorkers() {
    // Check Low Watermark
    if (this.queue.length <= this.LOW_WATERMARK && ProcessingLock.getLockStatus().owner === 'QueueManager') {
      ProcessingLock.release();
      this.metrics.scrollPausedReason = 'None';
      pipelineState.transition('IDLE');
    }

    while (this.activeWorkers < this.MAX_CONCURRENT_ENRICHMENT && this.queue.length > 0) {
      this.activeWorkers++;
      this.metrics.activeEnrichments = this.activeWorkers;
      pipelineState.transition('PROCESSING');
      this.processNext();
    }
  }

  private async processNext() {
    const card = this.queue.shift();
    if (!card) {
      this.workerFinished();
      return;
    }

    this.metrics.queueSize = this.queue.length;
    const startTime = performance.now();
    console.log(`[QueueManager] START_PROCESSING. Worker spawned. Active Workers: ${this.activeWorkers}`);
      
    try {
      const parsed = await parseBusinessCard(card);
      console.log(`[QueueManager] COMPLETE for card`);
      
      if (parsed && parsed.name) {
        const address = parsed.address || '';
        const signature = `${parsed.name.toLowerCase().trim()}_${address.toLowerCase().trim()}`;

        const { incrementCardsParsed, incrementDuplicateLeads, incrementCardsFailed } = useCollectionStore.getState();

        if (!this.processedSignatures.has(signature)) {
          this.processedSignatures.add(signature);
          incrementCardsParsed();
          
          if (this.onLeadsResolved) {
            this.onLeadsResolved([parsed]);
          }
          this.metrics.processedCount++;
        } else {
          incrementDuplicateLeads();
        }
      } else {
        useCollectionStore.getState().incrementCardsFailed();
      }
    } catch (err) {
      console.error('[QueueManager] Error processing card:', err);
    } finally {
      this.metrics.processingLatencyMs = Math.round(performance.now() - startTime);
      console.log(`[QueueManager] DEQUEUE finished. Latency: ${this.metrics.processingLatencyMs}ms`);
      this.workerFinished();
    }
  }

  private workerFinished() {
    this.activeWorkers--;
    this.metrics.activeEnrichments = this.activeWorkers;

    if (this.queue.length > 0) {
      this.spawnWorkers();
    } else if (this.activeWorkers === 0) {
      pipelineState.transition('COMPLETED');
      if (ProcessingLock.getLockStatus().owner === 'QueueManager') {
        ProcessingLock.release();
        this.metrics.scrollPausedReason = 'None';
      }
    }
  }
}

export const queueManager = new QueueManager();
