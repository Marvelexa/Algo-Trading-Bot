import { responseCapture, InterceptedPayload } from './responseCapture';
import { RequestClassifier } from './requestClassifier';
import { SearchPayloadHarvester } from './searchPayloadHarvester';
import { DetailPayloadHarvester } from './detailPayloadHarvester';
import { PayloadCorrelator } from './payloadCorrelator';

export class NetworkPipeline {
  private unsubscribe: (() => void) | null = null;

  public start() {
    responseCapture.start();
    this.unsubscribe = responseCapture.subscribe(this.processPayload.bind(this));
    console.log('[Nexvora] Passive Harvest Network Pipeline started.');
  }

  public stop() {
    if (this.unsubscribe) this.unsubscribe();
    responseCapture.stop();
  }

  private processPayload(data: InterceptedPayload) {
    try {
      const classification = RequestClassifier.classify(data.url, data.payload);

      if (classification.category === 'SEARCH_LIST') {
        const records = SearchPayloadHarvester.extract(classification.rawJson);
        records.forEach(record => PayloadCorrelator.correlate(record));
        if (records.length > 0) {
          console.log(`[Nexvora] Harvested ${records.length} Place IDs from Search List payload.`);
        }
      } 
      else if (classification.category === 'PLACE_DETAIL') {
        const record = DetailPayloadHarvester.extract(classification.rawJson);
        if (record) {
          PayloadCorrelator.correlate(record);
          console.log(`[Nexvora] Harvested Place Detail payload:`, record);
        }
      }
    } catch (err) {
      console.error('[Nexvora] Pipeline error:', err);
    }
  }
}

export const networkPipeline = new NetworkPipeline();
