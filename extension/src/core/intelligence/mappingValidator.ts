/**
 * Nexvora Mapping Validator & Quarantine Engine
 * Prevents false positives by requiring new mapping signatures 
 * to prove their reliability against historical ground truth.
 */

export interface CandidateMapping {
  field: 'phone' | 'website' | 'rating' | 'reviews';
  proposedPath: number[]; // e.g., [14, 11]
  confidenceScore: number;
  successCount: number;
  failureCount: number;
  status: 'DISCOVERED' | 'TESTING' | 'VALIDATED' | 'REJECTED';
}

export class MappingValidator {
  private candidates: CandidateMapping[] = [];

  public registerCandidate(field: CandidateMapping['field'], path: number[]) {
    // Check if it already exists
    const exists = this.candidates.find(c => c.field === field && c.proposedPath.join(',') === path.join(','));
    if (!exists) {
      this.candidates.push({
        field,
        proposedPath: path,
        confidenceScore: 0,
        successCount: 0,
        failureCount: 0,
        status: 'DISCOVERED'
      });
      console.log(`[Nexvora] Quarantined new candidate mapping for ${field}: [${path.join(', ')}]`);
    }
  }

  public evaluateAgainstGroundTruth(payloadNode: any, groundTruthValue: string, field: CandidateMapping['field']) {
    const testingCandidates = this.candidates.filter(c => c.field === field && (c.status === 'DISCOVERED' || c.status === 'TESTING'));
    
    for (const candidate of testingCandidates) {
      candidate.status = 'TESTING';
      
      try {
        // Attempt to extract using candidate path
        let extracted = payloadNode;
        for (const idx of candidate.proposedPath) {
          extracted = extracted[idx];
        }
        
        if (extracted === groundTruthValue) {
          candidate.successCount++;
        } else {
          candidate.failureCount++;
        }
      } catch {
        candidate.failureCount++;
      }

      // State machine transitions
      if (candidate.failureCount > 2) {
        candidate.status = 'REJECTED';
        console.warn(`[Nexvora] Rejected candidate mapping for ${field} due to failures.`);
      } else if (candidate.successCount >= 50) {
        candidate.status = 'VALIDATED';
        console.log(`[Nexvora] Successfully VALIDATED new mapping for ${field}! Ready for promotion.`);
      }
    }
  }

  public getValidatedMappings(): CandidateMapping[] {
    return this.candidates.filter(c => c.status === 'VALIDATED');
  }
}

export const mappingValidator = new MappingValidator();
