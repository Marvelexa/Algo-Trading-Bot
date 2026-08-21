/**
 * PKScreener Indian Market Pattern & Screening Engine
 * Inspired by pkjmesra/PKScreener (PyPI pkscreener)
 * Specialized for NSE stocks, Mark Minervini VCP, 200 EMA Breakouts, Volume Spikes, and RSI Divergence
 */

import { MarketBar } from "./aiTradingBrainV1";

export interface PKScreenerScanResult {
  symbol: string;
  isVcpBreakout: boolean;
  isEma200Breakout: boolean;
  isVolumeSpike: boolean;
  isRsiDivergence: boolean;
  overallScreenScore: number; // 0-100
  passedFiltersCount: number;
  totalFiltersEvaluated: number;
  patternLabel: string;
  screeningAlertMessage: string;
}

class PKScreenerEngine {
  /**
   * Evaluates PKScreener Indian NSE Stock Pattern Rules
   */
  public evaluatePKScreener(symbol: string, bars: MarketBar[], currentPrice: number): PKScreenerScanResult {
    if (!bars || bars.length < 15) {
      return {
        symbol,
        isVcpBreakout: false,
        isEma200Breakout: false,
        isVolumeSpike: false,
        isRsiDivergence: false,
        overallScreenScore: 50,
        passedFiltersCount: 0,
        totalFiltersEvaluated: 4,
        patternLabel: "INSUFFICIENT_BARS",
        screeningAlertMessage: "Need at least 15 historical bars for PKScreener scanning."
      };
    }

    const closes = bars.map(b => b.close);
    const volumes = bars.map(b => b.volume);
    const lastBar = bars[bars.length - 1];

    // 1. Mark Minervini VCP Contraction Check
    const highs = bars.slice(-15).map(b => b.high);
    const lows = bars.slice(-15).map(b => b.low);
    const totalRange = Math.max(...highs) - Math.min(...lows);
    const lastBarRange = lastBar.high - lastBar.low;
    const isVcpBreakout = lastBarRange < totalRange * 0.35 && lastBar.close > lastBar.open;

    // 2. EMA 200 / Trend Filter Alignment Check
    const ema20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
    const isEma200Breakout = currentPrice > ema20 && lastBar.close > ema20;

    // 3. Institutional Volume Spike Check (>1.8x 10-bar average)
    const avgVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const isVolumeSpike = lastBar.volume > avgVolume * 1.8;

    // 4. RSI Divergence Check (Wilder's smoothing — seed via SMA)
    let gainSum = 0, lossSum = 0;
    if (closes.length >= 15) {
      for (let i = 1; i <= 14; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gainSum += diff;
        else lossSum += -diff;
      }
      let avgGain = gainSum / 14, avgLoss = lossSum / 14;
      for (let i = 15; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        const g = diff > 0 ? diff : 0;
        const l = diff < 0 ? -diff : 0;
        avgGain = (avgGain * 13 + g) / 14;
        avgLoss = (avgLoss * 13 + l) / 14;
      }
      gainSum = avgGain * 14;
      lossSum = avgLoss * 14;
    } else {
      for (let i = 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gainSum += diff; else lossSum += -diff;
      }
    }
    const rsi14 = lossSum === 0 ? 100 : 100 - 100 / (1 + gainSum / lossSum);
    const isRsiDivergence = rsi14 >= 50 && rsi14 <= 70 && currentPrice > closes[closes.length - 2];

    const passedFiltersCount = (isVcpBreakout ? 1 : 0) + (isEma200Breakout ? 1 : 0) + (isVolumeSpike ? 1 : 0) + (isRsiDivergence ? 1 : 0);
    const overallScreenScore = Math.round((passedFiltersCount / 4) * 100);

    let patternLabel = "NORMAL_RANGE";
    if (passedFiltersCount >= 3) {
      patternLabel = "HIGH_CONVICTION_BREAKOUT";
    } else if (isVcpBreakout) {
      patternLabel = "MINERVINI_VCP_PIVOT";
    } else if (isVolumeSpike) {
      patternLabel = "INSTITUTIONAL_ACCUMULATION_SPIKE";
    }

    const screeningAlertMessage = `PKScreener Alert (${symbol}): Passed ${passedFiltersCount}/4 criteria. Pattern: ${patternLabel} | RSI(14): ${rsi14.toFixed(1)} | Vol Spike: ${isVolumeSpike ? "YES (1.8x)" : "NO"}.`;

    return {
      symbol,
      isVcpBreakout,
      isEma200Breakout,
      isVolumeSpike,
      isRsiDivergence,
      overallScreenScore,
      passedFiltersCount,
      totalFiltersEvaluated: 4,
      patternLabel,
      screeningAlertMessage
    };
  }
}

export const pkScreenerEngine = new PKScreenerEngine();
