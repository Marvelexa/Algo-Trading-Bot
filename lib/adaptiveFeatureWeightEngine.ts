/**
 * Production-Grade Adaptive Feature Weight Engine
 * Dynamically shifts feature vector importance weights based on the active Trading Mode:
 * Intraday Scalping, Swing Trading, Long-Term Compounder, or Positional F&O / Options Buying.
 */

import { TradingMode } from "./aiTradingBrainV1";

export interface FeatureWeightMatrix {
  priceActionWeight: number;
  volumeWeight: number;
  openInterestWeight: number;
  vwapAtrWeight: number;
  sentimentWeight: number;
  fundamentalWeight: number;
  macroWeight: number;
  marketStructureWeight: number;
}

export class AdaptiveFeatureWeightEngine {
  
  /**
   * Retrieve dynamic feature weight matrix for the specified Trading Mode
   */
  public getWeightsForMode(mode: TradingMode): FeatureWeightMatrix {
    switch (mode) {
      case "INTRADAY_SCALPING":
        return {
          priceActionWeight: 0.45,
          volumeWeight: 0.20,
          openInterestWeight: 0.20,
          vwapAtrWeight: 0.10,
          sentimentWeight: 0.05,
          fundamentalWeight: 0.0,
          macroWeight: 0.0,
          marketStructureWeight: 0.0
        };

      case "SWING_TRADING":
        return {
          priceActionWeight: 0.35,
          fundamentalWeight: 0.20,
          volumeWeight: 0.15,
          openInterestWeight: 0.15,
          sentimentWeight: 0.15,
          vwapAtrWeight: 0.0,
          macroWeight: 0.0,
          marketStructureWeight: 0.0
        };

      case "LONG_TERM_COMPOUNDER":
        return {
          fundamentalWeight: 0.55,
          macroWeight: 0.25,
          sentimentWeight: 0.10,
          priceActionWeight: 0.10,
          volumeWeight: 0.0,
          openInterestWeight: 0.0,
          vwapAtrWeight: 0.0,
          marketStructureWeight: 0.0
        };

      case "OPTIONS_BUYING":
        return {
          openInterestWeight: 0.40,
          priceActionWeight: 0.35,
          sentimentWeight: 0.15,
          macroWeight: 0.10,
          volumeWeight: 0.0,
          vwapAtrWeight: 0.0,
          fundamentalWeight: 0.0,
          marketStructureWeight: 0.0
        };

      default:
        return {
          priceActionWeight: 0.35,
          volumeWeight: 0.20,
          openInterestWeight: 0.15,
          vwapAtrWeight: 0.10,
          sentimentWeight: 0.10,
          fundamentalWeight: 0.05,
          macroWeight: 0.05,
          marketStructureWeight: 0.0
        };
    }
  }

  /**
   * Apply mode-specific weight matrix to a raw feature vector
   */
  public applyFeatureWeights(rawVector: number[], weights: FeatureWeightMatrix): number[] {
    if (rawVector.length < 12) return rawVector;

    const w = [
      weights.priceActionWeight,       // RSI / Momentum
      weights.priceActionWeight,       // EMA Diff
      weights.vwapAtrWeight,           // VWAP Diff
      weights.volumeWeight,            // RVOL
      weights.priceActionWeight,       // Body %
      weights.priceActionWeight,       // Donchian Pos
      weights.openInterestWeight,      // PCR / OI
      weights.sentimentWeight,         // News Score
      weights.priceActionWeight,       // Structure
      weights.priceActionWeight,       // BOS
      weights.priceActionWeight,       // Order Block
      weights.priceActionWeight        // Supertrend
    ];

    return rawVector.map((val, idx) => Number((val * (w[idx] || 0.1) * 2.0).toFixed(4)));
  }
}

export const adaptiveFeatureWeightEngine = new AdaptiveFeatureWeightEngine();
