/**
 * Institutional SHAP (Shapley Additive exPlanations) Attribution Engine
 * Inspired by SHAP Python library (NIPS / Nature Machine Intelligence Paper)
 * Decomposes multi-agent prediction scores into exact feature contribution percentages.
 */

export interface FeatureAttributionItem {
  featureName: string;
  shapleyValue: number; // Positive (+) for Bullish contribution, Negative (-) for Bearish
  contributionPct: number; // Absolute percentage impact
  category: "Technical" | "Sentiment" | "Fundamental" | "OpenInterest" | "Macro" | "Microstructure";
  explanation: string;
}

export interface SHAPAttributionReport {
  baseValuePct: number; // Baseline expectation (50.0%)
  predictedValuePct: number; // Final predicted probability
  totalShapDifferencePct: number; // Predicted - Base
  attributions: FeatureAttributionItem[];
  topBullishDrivers: FeatureAttributionItem[];
  topBearishDrivers: FeatureAttributionItem[];
}

class SHAPAttributionEngine {
  /**
   * Calculates Shapley-style local attributions that satisfy the **efficiency property**:
   *   sum(shap_i) ≈ predictedValue - baseValue
   * Each feature's contribution is its score deviation × normalised weight,
   * then globally scaled so the sum exactly equals the difference.
   */
  public calculateSHAPAttribution(
    techScore: number,
    sentScore: number,
    fundScore: number,
    oiScore: number,
    macroScore: number,
    finalProbabilityPct: number
  ): SHAPAttributionReport {
    const baseValuePct = 50.0;
    const diff = finalProbabilityPct - baseValuePct;

    const weights = { tech: 0.45, sent: 0.20, fund: 0.15, oi: 0.12, macro: 0.08 };
    const dev = {
      tech:  (techScore  - 50) * weights.tech,
      sent:  (sentScore  - 50) * weights.sent,
      fund:  (fundScore  - 50) * weights.fund,
      oi:    (oiScore    - 50) * weights.oi,
      macro: (macroScore - 50) * weights.macro
    };
    const totalSigned = dev.tech + dev.sent + dev.fund + dev.oi + dev.macro;
    const scale = totalSigned !== 0 ? diff / totalSigned : 0;

    const totalAbs = Math.abs(dev.tech) + Math.abs(dev.sent) + Math.abs(dev.fund)
                   + Math.abs(dev.oi)   + Math.abs(dev.macro) || 1;

    const make = (name: string, category: FeatureAttributionItem["category"], d: number, score: number, hi: string, lo: string): FeatureAttributionItem => ({
      featureName: name,
      shapleyValue: Number((d * scale).toFixed(2)),
      contributionPct: Number(((Math.abs(d) / totalAbs) * 100).toFixed(1)),
      category,
      explanation: score >= 50 ? hi : lo
    });

    const attributions: FeatureAttributionItem[] = [
      make("ICT SMC & Al Brooks Technical Price Action", "Technical",    dev.tech,  techScore,  "High technical confluence driving bullish momentum", "Technical breakdown & selling pressure"),
      make("5-Day Press & Social Sentiment Score",       "Sentiment",    dev.sent,  sentScore,  "Positive financial news coverage & street guidance", "Negative headlines & analyst downgrades"),
      make("3-5 Yr Financial Moat & PE Valuation Range", "Fundamental",  dev.fund,  fundScore,  "Strong balance sheet, margins & Graham PEG safety margin", "Valuation stretch or debt leverage concern"),
      make("F&O Open Interest & Max Pain Alignment",     "OpenInterest", dev.oi,    oiScore,    "Bullish Long Buildup & favorable PCR ratio", "Short Buildup or Long Unwinding pressure"),
      make("Macro M2 Liquidity & Sector Capital Flow",   "Macro",        dev.macro, macroScore, "Sector in LEADING phase with FII inflow", "Macro rate pressure or sector underperformance")
    ];

    attributions.sort((a, b) => Math.abs(b.shapleyValue) - Math.abs(a.shapleyValue));

    return {
      baseValuePct,
      predictedValuePct: finalProbabilityPct,
      totalShapDifferencePct: Number(diff.toFixed(2)),
      attributions,
      topBullishDrivers: attributions.filter(a => a.shapleyValue > 0),
      topBearishDrivers: attributions.filter(a => a.shapleyValue < 0)
    };
  }
}

export const shapAttributionEngine = new SHAPAttributionEngine();
