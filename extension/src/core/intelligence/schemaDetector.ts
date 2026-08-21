/**
 * Nexvora Schema Detector
 * Determines if a raw batchexecute response is a search list payload,
 * a place detail payload, or unknown garbage.
 */

export class SchemaDetector {
  
  public static detectPayloadType(decodedJson: any[]): 'search_list' | 'place_detail' | 'unknown' {
    if (!Array.isArray(decodedJson)) return 'unknown';

    // Heuristics based on typical Google Maps protobuf-over-JSON structures
    // Place Details usually have a massive nested array at index 6 or 0
    // Search Lists usually have a repeating structure mapping to multiple businesses
    
    // Highly simplified structural check for demonstration
    const strRep = JSON.stringify(decodedJson).substring(0, 500);
    
    if (strRep.includes('["m",') && strRep.length > 1000) {
      return 'place_detail';
    } else if (strRep.includes('["d",') && decodedJson.length > 2) {
      return 'search_list';
    }
    
    return 'unknown';
  }
}
