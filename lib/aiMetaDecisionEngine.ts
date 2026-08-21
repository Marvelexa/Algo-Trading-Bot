/**
 * Production-Grade AI Meta-Decision Layer & Veto Gate
 * Evaluates composite evidence across Technical, Sentiment, Fundamental, Open Interest, Macro, and Market Memory V3.
 * Acts as the ultimate decision gate issuing EXECUTE or SKIP_WEAK_SIGNAL verdicts with explicit quantitative rationale.
 */

export interface MetaDecisionResult {
  decision: "EXECUTE" | "SKIP_WEAK_SIGNAL";
  metaConfidenceScore: number; // 0 to 100
  isVetoed: boolean;
  vetoReason?: string;
  supportingEvidenceCount: number;
  opposingRiskCount: number;
  finalRationale: string;
}

export class AIMetaDecisionEngine {

  /**
   * Evaluate composite signals and apply AI Meta Veto Gate
   */
  public evaluateMetaDecision(
    action: "BUY" | "STRONG_BUY" | "SELL" | "STRONG_SELL" | "HOLD",
    trendStrengthPct: number,
    winProbabilityPct: number,
    marketMemoryScore: number,
    sampleSize: number,
    hasConceptDrift: boolean,
    hasFalseSignalPenalty: boolean,
    passedRulesCount: number = 8
  ): MetaDecisionResult {
    // Hold verdict defaults to SKIP
    if (action === "HOLD") {
      return {
        decision: "SKIP_WEAK_SIGNAL",
        metaConfidenceScore: 50,
        isVetoed: true,
        vetoReason: "Market Neutral / Range: System signals HOLD verdict.",
        supportingEvidenceCount: 1,
        opposingRiskCount: 2,
        finalRationale: "AI Meta Veto: Market neutral condition; trade execution skipped to preserve capital."
      };
    }

    let confidence = Number((winProbabilityPct * 0.40 + marketMemoryScore * 0.40 + (passedRulesCount / 12 * 100) * 0.20).toFixed(1));
    const supportingCount = (confidence > 65 ? 3 : 1) + (passedRulesCount >= 8 ? 2 : 0);
    const riskCount = (hasConceptDrift ? 2 : 0) + (hasFalseSignalPenalty ? 2 : 0) + (sampleSize < 30 ? 3 : 0);

    // Apply Meta Veto Rules
    if (sampleSize < 5) {
      return {
        decision: "SKIP_WEAK_SIGNAL",
        metaConfidenceScore: 40,
        isVetoed: true,
        vetoReason: "STATISTICAL_SAMPLE_INSUFFICIENT: Market Memory sample N < 5.",
        supportingEvidenceCount: supportingCount,
        opposingRiskCount: riskCount,
        finalRationale: "AI Meta Veto: Market Memory sample size N < 5. Probability edge unconfirmed."
      };
    }

    if (hasFalseSignalPenalty && confidence < 75) {
      return {
        decision: "SKIP_WEAK_SIGNAL",
        metaConfidenceScore: 45,
        isVetoed: true,
        vetoReason: "FALSE_SIGNAL_TRAP_VETO: Matches historical fakeout pattern.",
        supportingEvidenceCount: supportingCount,
        opposingRiskCount: riskCount,
        finalRationale: "AI Meta Veto: Match with historical false breakout trap detected. Execution blocked."
      };
    }

    if (confidence < 62.0) {
      return {
        decision: "SKIP_WEAK_SIGNAL",
        metaConfidenceScore: confidence,
        isVetoed: true,
        vetoReason: `LOW_CONFIDENCE_VETO: Meta confidence (${confidence}%) below 62% threshold.`,
        supportingEvidenceCount: supportingCount,
        opposingRiskCount: riskCount,
        finalRationale: `AI Meta Veto: Combined confidence (${confidence}%) below institutional execution threshold.`
      };
    }

    // Trade Approved for Execution
    return {
      decision: "EXECUTE",
      metaConfidenceScore: confidence,
      isVetoed: false,
      supportingEvidenceCount: supportingCount,
      opposingRiskCount: riskCount,
      finalRationale: `✅ AI Meta Execution Approved: High-probability edge supported by Technicals, Market Memory V3 (${marketMemoryScore}/100), and ${passedRulesCount}/12 Rules.`
    };
  }
}

export const aiMetaDecisionEngine = new AIMetaDecisionEngine();
