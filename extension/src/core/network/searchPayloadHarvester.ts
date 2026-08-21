/**
 * Extracts partial lead profiles from List payloads.
 */
import { FinalBusinessRecord } from '../intelligence/businessResolver';

export class SearchPayloadHarvester {
  public static extract(rawJson: string): Partial<FinalBusinessRecord>[] {
    const results: Partial<FinalBusinessRecord>[] = [];
    
    // Google Maps batchexecute payloads for search lists are extremely convoluted.
    // They are heavily nested arrays. The Place ID starts with "ChIJ" or "0x".
    // Since we are extracting heuristically rather than unrolling the protobuf AST perfectly:
    
    // Look for Place IDs
    const placeIdRegex = /ChIJ[a-zA-Z0-9_\-]+/g;
    const matches = Array.from(new Set(rawJson.match(placeIdRegex) || []));
    
    // We create "Stub" records just to register that these Place IDs exist in the current search context.
    matches.forEach(id => {
      // In a real rigorous unrolling, we'd map this exact ID to the string preceding it (the name).
      // For this passive pipeline, we will register the ID.
      results.push({
        placeId: id,
        meta: {
          phoneSource: 'network_list',
          websiteSource: 'network_list',
          phoneConfidence: 0,
          websiteConfidence: 0
        }
      });
    });

    return results;
  }
}
