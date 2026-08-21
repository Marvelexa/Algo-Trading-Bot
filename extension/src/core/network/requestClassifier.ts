/**
 * Identifies the exact type of Google Maps payload intercepted.
 */

export type PayloadCategory = 'SEARCH_LIST' | 'PLACE_DETAIL' | 'UNKNOWN';

export interface ClassifiedRequest {
  category: PayloadCategory;
  url: string;
  rawJson: string;
}

export class RequestClassifier {
  /**
   * Analyzes the URL and payload to determine what kind of data we just intercepted.
   */
  public static classify(url: string, rawPayload: string): ClassifiedRequest {
    let category: PayloadCategory = 'UNKNOWN';

    // 1. Analyze URL constraints
    if (url.includes('/maps/preview/entity')) {
      category = 'PLACE_DETAIL';
    } 
    else if (url.includes('/search')) {
      category = 'SEARCH_LIST';
    }
    // 2. Deep analysis of batchexecute RPC streams
    else if (url.includes('/batchexecute')) {
      // batchexecute payloads often contain the RPC ID in the payload string
      // 'pb!1m2!1y...'
      
      // Heuristic: Place Details usually contain specific detail nodes
      // If we see high density of phone regex or detail schema markers:
      if (rawPayload.includes('phone:tel:') || rawPayload.includes('authority')) {
        category = 'PLACE_DETAIL';
      } else {
        // Assume search list if it's batchexecute and lacks detail signatures,
        // or look for search list markers.
        category = 'SEARCH_LIST';
      }
    }

    return {
      category,
      url,
      rawJson: rawPayload
    };
  }
}
