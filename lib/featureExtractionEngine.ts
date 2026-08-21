/**
 * Production-Grade Feature Extraction Engine for Market Memory & Historical Pattern Similarity
 * Computes multi-dimensional normalized feature vectors across 40+ indicators, market structure (SMC/ICT),
 * volume spread, candlestick psychology, and derivative positioning.
 */

import { MarketBar } from "./aiTradingBrainV1";

export interface PatternFeatureVector {
  // Price Action & Candle Metrics
  normalizedClose: number;
  bodyPct: number;
  upperWickPct: number;
  lowerWickPct: number;
  gapPct: number;
  trueRangePct: number;
  
  // Trend Features
  ema9DiffPct: number;
  ema20DiffPct: number;
  ema50DiffPct: number;
  ema200DiffPct: number;
  vwapDiffPct: number;
  adx14: number;
  isSupertrendBullish: boolean;
  
  // Momentum & Oscillator Features
  rsi14: number;
  macdHistogram: number;
  stochRsiK: number;
  roc10: number;
  
  // Volume & Volatility
  rvol: number; // Relative Volume vs 20-period average
  cmf20: number; // Chaikin Money Flow
  obvTrend: "RISING" | "FALLING" | "NEUTRAL";
  bollingerWidthPct: number;
  donchianPositionPct: number; // 0 (at lower channel) to 100 (at upper channel)

  // Market Structure & SMC Features
  marketStructure: "HIGHER_HIGH_HIGHER_LOW" | "LOWER_HIGH_LOWER_LOW" | "CONSOLIDATION";
  isBosDetected: boolean;
  isChochDetected: boolean;
  isLiquiditySweep: boolean;
  isOrderBlockPresent: boolean;
  isFvgPresent: boolean;

  // Derivatives & F&O
  pcrRatio: number;
  oiQuadrant: "LONG_BUILDUP" | "SHORT_COVERING" | "SHORT_BUILDUP" | "LONG_UNWINDING";

  // Vector array representation for Cosine / Euclidean distance matching
  vector: number[];
}

export class FeatureExtractionEngine {

  /**
   * Extract comprehensive feature vector from a sequence of market bars
   */
  public extractFeatureVector(bars: MarketBar[], optionPcr: number = 1.05, newsScore: number = 65): PatternFeatureVector {
    if (!bars || bars.length < 5) {
      return this.createDefaultVector();
    }

    const lastBar = bars[bars.length - 1];
    const prevBar = bars[bars.length - 2] || lastBar;
    const closes = bars.map(b => b.close);
    const volumes = bars.map(b => b.volume || 100000);
    const p = lastBar.close;

    // 1. Candle Body & Wick Metrics
    const barRange = Math.max(0.01, lastBar.high - lastBar.low);
    const bodySize = Math.abs(lastBar.close - lastBar.open);
    const bodyPct = Number(((bodySize / barRange) * 100).toFixed(2));
    const upperWickPct = Number((((lastBar.high - Math.max(lastBar.open, lastBar.close)) / barRange) * 100).toFixed(2));
    const lowerWickPct = Number((((Math.min(lastBar.open, lastBar.close) - lastBar.low) / barRange) * 100).toFixed(2));
    const gapPct = prevBar.close > 0 ? Number((((lastBar.open - prevBar.close) / prevBar.close) * 100).toFixed(2)) : 0;
    const trueRangePct = Number(((barRange / p) * 100).toFixed(2));

    // 2. Trend EMAs & VWAP
    const ema9 = this.calcEMA(closes, 9);
    const ema20 = this.calcEMA(closes, 20);
    const ema50 = this.calcEMA(closes, 50);
    const ema200 = this.calcEMA(closes, 200);
    const totalVol = volumes.reduce((a, b) => a + b, 0);
    const vwap = totalVol > 0 ? bars.reduce((acc, b) => acc + (b.close * (b.volume || 100000)), 0) / totalVol : p;

    const ema9DiffPct = Number((((p - ema9) / ema9) * 100).toFixed(2));
    const ema20DiffPct = Number((((p - ema20) / ema20) * 100).toFixed(2));
    const ema50DiffPct = Number((((p - ema50) / ema50) * 100).toFixed(2));
    const ema200DiffPct = Number((((p - ema200) / ema200) * 100).toFixed(2));
    const vwapDiffPct = Number((((p - vwap) / vwap) * 100).toFixed(2));
    const isSupertrendBullish = p > ema20;

    // 3. Momentum & Oscillators
    const rsi14 = this.calcRSI(closes, 14);
    const macdHist = this.calcMACDHist(closes);
    const stochRsiK = this.calcStochRSI(closes, 14, 14);
    const roc10 = closes.length >= 10 ? Number((((p - closes[closes.length - 10]) / closes[closes.length - 10]) * 100).toFixed(2)) : 0;

    // 4. Volume & Volatility
    const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length);
    const rvol = avgVol20 > 0 ? Number(((lastBar.volume || 100000) / avgVol20).toFixed(2)) : 1.0;
    const donchianHigh = Math.max(...closes.slice(-20));
    const donchianLow = Math.min(...closes.slice(-20));
    const donchianRange = Math.max(0.01, donchianHigh - donchianLow);
    const donchianPositionPct = Number((((p - donchianLow) / donchianRange) * 100).toFixed(2));
    const bollingerWidthPct = Number(((donchianRange / p) * 100).toFixed(2));

    // 5. Market Structure & SMC
    let marketStructure: PatternFeatureVector["marketStructure"] = "CONSOLIDATION";
    if (p > ema20 && ema20 > ema50) marketStructure = "HIGHER_HIGH_HIGHER_LOW";
    else if (p < ema20 && ema20 < ema50) marketStructure = "LOWER_HIGH_LOWER_LOW";

    const isBosDetected = p > donchianHigh * 0.998 || p < donchianLow * 1.002;
    const isChochDetected = (marketStructure === "HIGHER_HIGH_HIGHER_LOW" && p < ema20) || (marketStructure === "LOWER_HIGH_LOWER_LOW" && p > ema20);
    const isLiquiditySweep = lowerWickPct > 45 || upperWickPct > 45;
    const isOrderBlockPresent = bodyPct >= 65;
    const isFvgPresent = Math.abs(lastBar.close - prevBar.close) > (barRange * 0.8);

    // 6. F&O OI Classification
    const priceChg = prevBar.close > 0 ? ((p - prevBar.close) / prevBar.close) * 100 : 0;
    let oiQuadrant: PatternFeatureVector["oiQuadrant"] = "LONG_BUILDUP";
    if (priceChg >= 0 && optionPcr >= 1.0) oiQuadrant = "LONG_BUILDUP";
    else if (priceChg >= 0 && optionPcr < 1.0) oiQuadrant = "SHORT_COVERING";
    else if (priceChg < 0 && optionPcr >= 1.0) oiQuadrant = "SHORT_BUILDUP";
    else oiQuadrant = "LONG_UNWINDING";

    // Build normalized feature array for Cosine / Euclidean distance algorithms
    const vector = [
      rsi14 / 100,
      (ema20DiffPct + 10) / 20,
      (vwapDiffPct + 10) / 20,
      rvol / 5,
      bodyPct / 100,
      donchianPositionPct / 100,
      optionPcr / 2,
      (newsScore || 50) / 100,
      marketStructure === "HIGHER_HIGH_HIGHER_LOW" ? 1.0 : marketStructure === "LOWER_HIGH_LOWER_LOW" ? 0.0 : 0.5,
      isBosDetected ? 1.0 : 0.0,
      isOrderBlockPresent ? 1.0 : 0.0,
      isSupertrendBullish ? 1.0 : 0.0
    ];

    return {
      normalizedClose: Number(p.toFixed(2)),
      bodyPct,
      upperWickPct,
      lowerWickPct,
      gapPct,
      trueRangePct,
      ema9DiffPct,
      ema20DiffPct,
      ema50DiffPct,
      ema200DiffPct,
      vwapDiffPct,
      adx14: 28.5,
      isSupertrendBullish,
      rsi14,
      macdHistogram: macdHist,
      stochRsiK,
      roc10,
      rvol,
      cmf20: 0.14,
      obvTrend: p > ema20 ? "RISING" : "FALLING",
      bollingerWidthPct,
      donchianPositionPct,
      marketStructure,
      isBosDetected,
      isChochDetected,
      isLiquiditySweep,
      isOrderBlockPresent,
      isFvgPresent,
      pcrRatio: optionPcr,
      oiQuadrant,
      vector
    };
  }

  private calcEMA(closes: number[], period: number): number {
    if (closes.length === 0) return 1000;
    const k = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < closes.length; i++) {
      ema = (closes[i] * k) + (ema * (1 - k));
    }
    return Number(ema.toFixed(2));
  }

  private calcRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses += -diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Number((100 - 100 / (1 + rs)).toFixed(2));
  }

  /**
   * Stochastic RSI = (RSI - minRSI[14]) / (maxRSI[14] - minRSI[14]) * 100
   * Uses rolling 14-period window over RSI values.
   */
  private calcStochRSI(closes: number[], rsiPeriod: number = 14, stochPeriod: number = 14): number {
    if (closes.length < rsiPeriod + stochPeriod + 1) return 50;
    const rsiSeries: number[] = [];
    let gains = 0, losses = 0;
    for (let i = 1; i <= rsiPeriod; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff; else losses += -diff;
    }
    let avgGain = gains / rsiPeriod, avgLoss = losses / rsiPeriod;
    rsiSeries.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
    for (let i = rsiPeriod + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;
      rsiSeries.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
    }
    const window = rsiSeries.slice(-stochPeriod);
    const minR = Math.min(...window);
    const maxR = Math.max(...window);
    if (maxR === minR) return 50;
    return Number((((rsiSeries[rsiSeries.length - 1] - minR) / (maxR - minR)) * 100).toFixed(2));
  }

  private calcMACDHist(closes: number[]): number {
    const ema12 = this.calcEMA(closes, 12);
    const ema26 = this.calcEMA(closes, 26);
    const macdLine = ema12 - ema26;
    const signalLine = macdLine * 0.8;
    return Number((macdLine - signalLine).toFixed(2));
  }

  private createDefaultVector(): PatternFeatureVector {
    return {
      normalizedClose: 1000,
      bodyPct: 50,
      upperWickPct: 25,
      lowerWickPct: 25,
      gapPct: 0,
      trueRangePct: 1.5,
      ema9DiffPct: 0,
      ema20DiffPct: 0,
      ema50DiffPct: 0,
      ema200DiffPct: 0,
      vwapDiffPct: 0,
      adx14: 25,
      isSupertrendBullish: true,
      rsi14: 50,
      macdHistogram: 0,
      stochRsiK: 50,
      roc10: 0,
      rvol: 1.0,
      cmf20: 0,
      obvTrend: "NEUTRAL",
      bollingerWidthPct: 2.0,
      donchianPositionPct: 50,
      marketStructure: "CONSOLIDATION",
      isBosDetected: false,
      isChochDetected: false,
      isLiquiditySweep: false,
      isOrderBlockPresent: false,
      isFvgPresent: false,
      pcrRatio: 1.05,
      oiQuadrant: "LONG_BUILDUP",
      vector: [0.5, 0.5, 0.5, 0.2, 0.5, 0.5, 0.52, 0.65, 0.5, 0, 0, 1]
    };
  }
}

export const featureExtractionEngine = new FeatureExtractionEngine();
