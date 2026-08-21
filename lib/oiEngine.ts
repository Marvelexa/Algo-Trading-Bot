/**
 * Dedicated Open Interest (OI) Engine for Positional F&O Trading
 * Computes 4-Quadrant OI Classification, PCR Trend, Strike-level OI Changes, and Max Pain Strike calculation.
 */

export type OIQuadrantClassification = "LONG_BUILDUP" | "SHORT_COVERING" | "SHORT_BUILDUP" | "LONG_UNWINDING";

export interface OptionStrikeOI {
  strike: number;
  callOI: number;
  putOI: number;
  callOIChange: number;
  putOIChange: number;
}

export interface OIEngineResult {
  symbol: string;
  currentPrice: number;
  classification: OIQuadrantClassification;
  confidenceMultiplier: number; // e.g. 1.15 for Long Buildup, 0.90 for Short Covering
  pcrCurrent: number;
  pcrTrend: "RISING_BULLISH_ACCUMULATION" | "NEUTRAL" | "FALLING_BEARISH_DISTRIBUTION";
  maxPainStrike: number;
  topCallResistanceStrike: number;
  topPutSupportStrike: number;
  classificationDescription: string;
  summaryText: string;
}

export class OIEngine {
  /**
   * Standard 4-Quadrant F&O Open Interest Classification
   * - Long Buildup: Price UP + OI UP (High conviction bullish)
   * - Short Covering: Price UP + OI DOWN (Short squeeze bullish, lower conviction)
   * - Short Buildup: Price DOWN + OI UP (High conviction bearish)
   * - Long Unwinding: Price DOWN + OI DOWN (Liquidation bearish, lower conviction)
   */
  public classifyOI(priceChangePct: number, oiChangePct: number): { classification: OIQuadrantClassification; multiplier: number; description: string } {
    if (priceChangePct >= 0 && oiChangePct >= 0) {
      return {
        classification: "LONG_BUILDUP",
        multiplier: 1.15, // +15% confidence boost for fresh institutional buying
        description: "Fresh Long Buildup: Institutional buyers adding aggressive long positions with rising open interest."
      };
    } else if (priceChangePct >= 0 && oiChangePct < 0) {
      return {
        classification: "SHORT_COVERING",
        multiplier: 0.90, // -10% discount multiplier due to squeeze-driven move
        description: "Short Covering: Price rally driven by short sellers closing positions rather than aggressive fresh buying."
      };
    } else if (priceChangePct < 0 && oiChangePct >= 0) {
      return {
        classification: "SHORT_BUILDUP",
        multiplier: 1.15, // High conviction bearish short buildup
        description: "Fresh Short Buildup: Institutional short sellers creating new positions with rising open interest."
      };
    } else {
      return {
        classification: "LONG_UNWINDING",
        multiplier: 0.90, // Bearish liquidation
        description: "Long Unwinding: Price decline caused by long position holders exiting/liquidating."
      };
    }
  }

  /**
   * Exact NSE Max Pain Calculation algorithm
   * Max Pain is the strike price where option sellers experience minimum financial loss.
   */
  public calculateMaxPain(currentPrice: number, strikesOI: OptionStrikeOI[]): number {
    if (!strikesOI || strikesOI.length === 0) {
      const step = currentPrice > 10000 ? 100 : currentPrice > 1000 ? 50 : 10;
      return Math.round(currentPrice / step) * step;
    }

    let minTotalLoss = Infinity;
    let maxPainStrike = strikesOI[0].strike;

    for (const testStrike of strikesOI) {
      let totalSellerLoss = 0;
      for (const s of strikesOI) {
        // Option seller loss if market closes at testStrike:
        // Call seller loss when testStrike > strike: (testStrike - strike) * callOI
        if (testStrike.strike > s.strike) {
          totalSellerLoss += (testStrike.strike - s.strike) * s.callOI;
        }
        // Put seller loss when testStrike < strike: (strike - testStrike) * putOI
        if (testStrike.strike < s.strike) {
          totalSellerLoss += (s.strike - testStrike.strike) * s.putOI;
        }
      }

      if (totalSellerLoss < minTotalLoss) {
        minTotalLoss = totalSellerLoss;
        maxPainStrike = testStrike.strike;
      }
    }

    return maxPainStrike;
  }

  /**
   * Analyze complete F&O Open Interest structure
   */
  public analyzeOI(
    symbol: string,
    currentPrice: number,
    priceChangePct: number = 0.5,
    oiChangePct: number = 2.4,
    historicalPcrList: number[] = [0.92, 0.96, 1.02, 1.08, 1.15],
    strikesOI?: OptionStrikeOI[]
  ): OIEngineResult {
    const { classification, multiplier, description } = this.classifyOI(priceChangePct, oiChangePct);

    // Compute PCR Trend
    const pcrCurrent = historicalPcrList.length > 0 ? historicalPcrList[historicalPcrList.length - 1] : 1.05;
    const firstPcr = historicalPcrList.length > 0 ? historicalPcrList[0] : 0.95;
    let pcrTrend: OIEngineResult["pcrTrend"] = "NEUTRAL";
    if (pcrCurrent > firstPcr + 0.08) pcrTrend = "RISING_BULLISH_ACCUMULATION";
    else if (pcrCurrent < firstPcr - 0.08) pcrTrend = "FALLING_BEARISH_DISTRIBUTION";

    // Build mock strike list if not provided
    const step = currentPrice > 10000 ? 100 : currentPrice > 1000 ? 50 : 10;
    const atmStrike = Math.round(currentPrice / step) * step;

    const defaultStrikes: OptionStrikeOI[] = strikesOI || [
      { strike: atmStrike - 2 * step, callOI: 15000, putOI: 85000, callOIChange: 500, putOIChange: 12000 },
      { strike: atmStrike - step, callOI: 28000, putOI: 65000, callOIChange: 1200, putOIChange: 8500 },
      { strike: atmStrike, callOI: 50000, putOI: 52000, callOIChange: 4000, putOIChange: 4500 },
      { strike: atmStrike + step, callOI: 75000, putOI: 30000, callOIChange: 9800, putOIChange: 1100 },
      { strike: atmStrike + 2 * step, callOI: 92000, putOI: 14000, callOIChange: 14000, putOIChange: 300 }
    ];

    const maxPainStrike = this.calculateMaxPain(currentPrice, defaultStrikes);

    // Find top call resistance and put support strikes
    const sortedCalls = [...defaultStrikes].sort((a, b) => b.callOI - a.callOI);
    const sortedPuts = [...defaultStrikes].sort((a, b) => b.putOI - a.putOI);

    const topCallResistanceStrike = sortedCalls[0]?.strike || atmStrike + step;
    const topPutSupportStrike = sortedPuts[0]?.strike || atmStrike - step;

    return {
      symbol,
      currentPrice,
      classification,
      confidenceMultiplier: multiplier,
      pcrCurrent,
      pcrTrend,
      maxPainStrike,
      topCallResistanceStrike,
      topPutSupportStrike,
      classificationDescription: description,
      summaryText: `F&O OI Structure: ${classification} (${description}). Max Pain: ${maxPainStrike}. PCR: ${pcrCurrent.toFixed(2)} (${pcrTrend.replace(/_/g, " ")}). Key Resistance: ${topCallResistanceStrike}, Support: ${topPutSupportStrike}.`
    };
  }
}

export const oiEngine = new OIEngine();
