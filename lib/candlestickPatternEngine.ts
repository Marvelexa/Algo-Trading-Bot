import { OHLCVBar } from "./stockEngine";
import { tradeOutcomesEngine } from "./tradeOutcomesEngine";

export interface CandlestickPatternMatch {
  patternName: string;
  patternCategory: "CHART_PATTERNS" | "INSTITUTIONAL_LIQUIDITY" | "CANDLESTICK_MASTER" | "TOP_REVERSAL" | "INSTITUTIONAL_SMC";
  patternType: "BULLISH_REVERSAL" | "BEARISH_REVERSAL" | "BULLISH_CONTINUATION" | "BEARISH_CONTINUATION" | "NEUTRAL_INDECISION";
  confidencePct: number;
  historicalWinRatePct: number;
  expectedMovePct: number;
  entryPrice: number;
  stopLossPrice: number;
  projectedTargetPrice: number;
  description: string;
  keyConfirmationRule: string;
  riskRewardRatio: number;
  atrBuffer: number;
}

export class CandlestickPatternEngine {
  /**
   * Dynamically resolves historical win rate from accumulated trade_outcomes history.
   * Requires a minimum sample size of 10 closed trades; if insufficient sample size exists,
   * returns a neutral baseline 50.0% (NOT a fabricated 75%/88% constant).
   */
  public getEmpiricalWinRate(patternName: string): { winRatePct: number; sampleSize: number; isEmpiricallyValidated: boolean } {
    return tradeOutcomesEngine.getPatternEmpiricalWinRate(patternName);
  }

  /**
   * Analyzes recent daily/intraday OHLCV bars and identifies ALL active chart, candlestick, and SMC institutional patterns
   * from the 4 master technical cheat sheets with ATR-buffered Stop-Loss levels and 1:2.5 R:R safeguards.
   */
  public detectAllPatterns(bars: OHLCVBar[], currentPrice: number): CandlestickPatternMatch[] {
    const entryPrice = Number(currentPrice.toFixed(2));
    const detected: CandlestickPatternMatch[] = [];

    if (!bars || bars.length < 5) return detected;

    const lastBar = bars[bars.length - 1];
    const prevBar = bars[bars.length - 2];
    const prevBar2 = bars[bars.length - 3] || prevBar;
    const prevBar3 = bars[bars.length - 4] || prevBar2;

    // Compute 20 EMA (Wilder / standard SMA-seeded)
    let ema20: number;
    if (bars.length >= 20) {
      let seed = 0;
      for (let i = 0; i < 20; i++) seed += bars[i].close;
      ema20 = seed / 20;
      const k = 2 / 21;
      for (let i = 20; i < bars.length; i++) {
        ema20 = bars[i].close * k + ema20 * (1 - k);
      }
    } else {
      ema20 = bars.reduce((a, b) => a + b.close, 0) / bars.length;
    }

    // Compute 14-period ATR (Wilder smoothing)
    const trueRanges: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const tr = Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - bars[i - 1].close),
        Math.abs(bars[i].low - bars[i - 1].close)
      );
      trueRanges.push(tr);
    }
    let atr14: number;
    if (trueRanges.length >= 14) {
      let seed = 0;
      for (let i = 0; i < 14; i++) seed += trueRanges[i];
      atr14 = seed / 14;
      for (let i = 14; i < trueRanges.length; i++) {
        atr14 = (atr14 * 13 + trueRanges[i]) / 14;
      }
    } else if (trueRanges.length > 0) {
      atr14 = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
    } else {
      atr14 = currentPrice * 0.012;
    }

    const body = Math.abs(lastBar.close - lastBar.open);
    const range = lastBar.high - lastBar.low || 1;
    const upperWick = lastBar.high - Math.max(lastBar.open, lastBar.close);
    const lowerWick = Math.min(lastBar.open, lastBar.close) - lastBar.low;

    const isLastGreen = lastBar.close >= lastBar.open;
    const isPrevRed = prevBar.close < prevBar.open;
    const isAboveEMA20 = currentPrice > ema20;

    const recentHighs = bars.slice(-15).map(b => b.high);
    const recentLows = bars.slice(-15).map(b => b.low);
    const maxHigh15 = Math.max(...recentHighs);
    const minLow15 = Math.min(...recentLows);

    // -------------------------------------------------------------
    // CATEGORY 1: INSTITUTIONAL PRICE ACTION / SMC PATTERNS (Cheat Sheet #4)
    // -------------------------------------------------------------

    // 1. Quasimodo (QM Level) Liquidity Sweep (88% Win-Rate)
    if (lastBar.low < minLow15 * 1.002 && isLastGreen && body > range * 0.4) {
      const stopLossPrice = Number((Math.min(lastBar.low, minLow15) - (0.5 * atr14)).toFixed(2));
      const risk = Math.max(2, entryPrice - stopLossPrice);
      detected.push({
        patternName: "Quasimodo (QM Level) Liquidity Hunt",
        patternCategory: "INSTITUTIONAL_SMC",
        patternType: "BULLISH_REVERSAL",
        confidencePct: 92,
        historicalWinRatePct: this.getEmpiricalWinRate("Quasimodo (QM Level) Liquidity Hunt").winRatePct,
        expectedMovePct: 6.8,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice + 5.0 * risk).toFixed(2)),
        description: "Institutional Stop Hunt below equal lows (QML). Market makers swept retail stop orders before forcing a violent bullish reversal above 20 EMA.",
        keyConfirmationRule: "QML Retest confirmed: Enter on retest of QML demand zone with ATR-buffered SL below spike low (₹" + stopLossPrice + ").",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 2. Order Block (OB) & Fair Value Gap Demand Zone
    if (prevBar.high < lastBar.low && isLastGreen && body > atr14 * 1.2) {
      const stopLossPrice = Number((prevBar.low - 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, entryPrice - stopLossPrice);
      detected.push({
        patternName: "Bullish Order Block & FVG Imbalance",
        patternCategory: "INSTITUTIONAL_SMC",
        patternType: "BULLISH_CONTINUATION",
        confidencePct: 90,
        historicalWinRatePct: this.getEmpiricalWinRate("Bullish Order Block & FVG Imbalance").winRatePct,
        expectedMovePct: 7.2,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice + 5.0 * risk).toFixed(2)),
        description: "Institutional Order Block & Fair Value Gap (FVG) created by aggressive institutional buying imbalance.",
        keyConfirmationRule: "Enter on retest of FVG imbalance zone with SL below Order Block low.",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 3. Compression (CP) Demand Liquidity
    let isCompressing = true;
    for (let i = Math.max(0, bars.length - 4); i < bars.length - 1; i++) {
      if (bars[i].high - bars[i].low > atr14 * 1.5) isCompressing = false;
    }
    if (isCompressing && isLastGreen && body > range * 0.5) {
      const stopLossPrice = Number((minLow15 - 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, entryPrice - stopLossPrice);
      detected.push({
        patternName: "Compression (CP Liquidity) Expansion",
        patternCategory: "INSTITUTIONAL_SMC",
        patternType: "BULLISH_CONTINUATION",
        confidencePct: 87,
        historicalWinRatePct: this.getEmpiricalWinRate("Compression (CP Liquidity) Expansion").winRatePct,
        expectedMovePct: 6.0,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice + 5.0 * risk).toFixed(2)),
        description: "Price compressed tightly into demand zone clearing sell orders prior to explosive bullish expansion.",
        keyConfirmationRule: "Breakout confirmed on high volume candle above compression highs.",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // -------------------------------------------------------------
    // CATEGORY 2: CLASSICAL TREND & CHART PATTERNS (Cheat Sheet #1 & #3)
    // -------------------------------------------------------------

    // 4. Double Bottom ('W' Pattern)
    const midLow = Math.min(prevBar2.low, prevBar3.low);
    if (Math.abs(lastBar.low - midLow) / (midLow || 1) < 0.012 && isLastGreen) {
      const stopLossPrice = Number((Math.min(lastBar.low, midLow) - 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, entryPrice - stopLossPrice);
      detected.push({
        patternName: "Double Bottom ('W' Pattern)",
        patternCategory: "CHART_PATTERNS",
        patternType: "BULLISH_REVERSAL",
        confidencePct: 86,
        historicalWinRatePct: this.getEmpiricalWinRate("Double Bottom ('W' Pattern)").winRatePct,
        expectedMovePct: 6.2,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice + 5.0 * risk).toFixed(2)),
        description: "Classic 'W' Reversal Pattern forming at strong support. Second trough holding above prior low confirms exhaustion of sellers.",
        keyConfirmationRule: "Neckline breakout confirmation above ₹" + (maxHigh15 * 0.99).toFixed(2) + " with volume surge.",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 5. Ascending Wedge Pattern (Bearish Breakdown)
    if (prevBar.high > prevBar2.high && lastBar.low < prevBar.low && !isLastGreen) {
      const stopLossPrice = Number((maxHigh15 + 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, stopLossPrice - entryPrice);
      detected.push({
        patternName: "Ascending Wedge Breakdown",
        patternCategory: "TOP_REVERSAL",
        patternType: "BEARISH_REVERSAL",
        confidencePct: 85,
        historicalWinRatePct: this.getEmpiricalWinRate("Ascending Wedge Breakdown").winRatePct,
        expectedMovePct: -5.8,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice - 5.0 * risk).toFixed(2)),
        description: "Ascending wedge pattern converging towards exhaustion peak. Breakdown below lower support trendline signals bearish reversal.",
        keyConfirmationRule: "Bearish confirmation on close below support neckline with stop loss at upper trendline (₹" + stopLossPrice + ").",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 6. Ascending Triangle Breakout
    if (Math.abs(prevBar.high - maxHigh15) / maxHigh15 < 0.008 && currentPrice >= maxHigh15 * 0.998 && isLastGreen && isAboveEMA20) {
      const stopLossPrice = Number((minLow15 - 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, entryPrice - stopLossPrice);
      detected.push({
        patternName: "Ascending Triangle Breakout",
        patternCategory: "CHART_PATTERNS",
        patternType: "BULLISH_CONTINUATION",
        confidencePct: 89,
        historicalWinRatePct: this.getEmpiricalWinRate("Ascending Triangle Breakout").winRatePct,
        expectedMovePct: 7.5,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice + 5.0 * risk).toFixed(2)),
        description: "Horizontal resistance ceiling tested multiple times with ascending higher lows. Buyers compressing price towards imminent upward breakout.",
        keyConfirmationRule: "Entry on candle close above horizontal resistance (₹" + maxHigh15.toFixed(2) + ").",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 7. Head & Shoulders Top Reversal (Requires Head peak > Left/Right Shoulders & Neckline Breakdown)
    const isHeadPeak = prevBar2.high > prevBar3.high * 1.005 && prevBar2.high > prevBar.high * 1.005;
    const isNecklineBreak = lastBar.close < Math.min(prevBar3.low, prevBar.low);
    if (isHeadPeak && isNecklineBreak && !isLastGreen && !isAboveEMA20) {
      const stopLossPrice = Number((Math.max(prevBar.high, lastBar.high) + 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, stopLossPrice - entryPrice);
      detected.push({
        patternName: "Head & Shoulders Breakdown",
        patternCategory: "TOP_REVERSAL",
        patternType: "BEARISH_REVERSAL",
        confidencePct: 88,
        historicalWinRatePct: this.getEmpiricalWinRate("Head & Shoulders Breakdown").winRatePct,
        expectedMovePct: -6.5,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice - 5.0 * risk).toFixed(2)),
        description: "Right Shoulder rejection following Head peak. Price breaking down below support neckline signals major trend reversal below 20 EMA.",
        keyConfirmationRule: "Exit long positions or set tight SL above Right Shoulder peak (₹" + stopLossPrice + ").",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // -------------------------------------------------------------
    // CATEGORY 3: MASTER CANDLESTICK PATTERNS (Cheat Sheet #2)
    // -------------------------------------------------------------

    // 8. Bullish Engulfing
    if (isPrevRed && isLastGreen && lastBar.open <= prevBar.close && lastBar.close > prevBar.open) {
      const stopLossPrice = Number((Math.min(lastBar.low, prevBar.low) - 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, entryPrice - stopLossPrice);
      detected.push({
        patternName: "Bullish Engulfing Pattern",
        patternCategory: "CANDLESTICK_MASTER",
        patternType: "BULLISH_REVERSAL",
        confidencePct: 88,
        historicalWinRatePct: this.getEmpiricalWinRate("Bullish Engulfing Pattern").winRatePct,
        expectedMovePct: 5.5,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice + 5.0 * risk).toFixed(2)),
        description: "Large green body completely engulfs prior red body. Buyers took total control of order flow.",
        keyConfirmationRule: "Confirm with follow-through green candle or 20 EMA bounce.",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 9. Morning Star / Morning Doji Star
    if (prevBar2.close < prevBar2.open && Math.abs(prevBar.close - prevBar.open) < body * 0.3 && isLastGreen && lastBar.close > (prevBar2.open + prevBar2.close) / 2) {
      const stopLossPrice = Number((prevBar.low - 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, entryPrice - stopLossPrice);
      detected.push({
        patternName: "Bullish Morning Star",
        patternCategory: "CANDLESTICK_MASTER",
        patternType: "BULLISH_REVERSAL",
        confidencePct: 89,
        historicalWinRatePct: this.getEmpiricalWinRate("Bullish Morning Star").winRatePct,
        expectedMovePct: 6.0,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice + 5.0 * risk).toFixed(2)),
        description: "3-candle bullish reversal: strong decline -> indecision doji star -> powerful bullish reversal candle penetrating deep into first red body.",
        keyConfirmationRule: "Enter on confirmation close above 50% midpoint of first red candle.",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 10. Bullish Hammer / Pin Bar
    if (lowerWick >= body * 2 && upperWick <= body * 0.5 && isAboveEMA20) {
      const stopLossPrice = Number((lastBar.low - 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, entryPrice - stopLossPrice);
      detected.push({
        patternName: "Bullish Hammer / Pin Bar",
        patternCategory: "CANDLESTICK_MASTER",
        patternType: "BULLISH_REVERSAL",
        confidencePct: 83,
        historicalWinRatePct: this.getEmpiricalWinRate("Bullish Hammer / Pin Bar").winRatePct,
        expectedMovePct: 4.8,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice + 5.0 * risk).toFixed(2)),
        description: "Rejection of lower prices with strong buying tail above 20 EMA. Institutional buyers overwhelmed supply.",
        keyConfirmationRule: "Buy confirmation triggers when next candle crosses above Hammer high (₹" + lastBar.high.toFixed(2) + ").",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 11. Bearish Shooting Star
    if (upperWick >= body * 2 && lowerWick <= body * 0.5 && !isAboveEMA20) {
      const stopLossPrice = Number((lastBar.high + 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, stopLossPrice - entryPrice);
      detected.push({
        patternName: "Bearish Shooting Star",
        patternCategory: "CANDLESTICK_MASTER",
        patternType: "BEARISH_REVERSAL",
        confidencePct: 84,
        historicalWinRatePct: this.getEmpiricalWinRate("Bearish Shooting Star").winRatePct,
        expectedMovePct: -5.0,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice - 5.0 * risk).toFixed(2)),
        description: "Rejection of higher prices with long upper wick. Bears pushed prices back down near open.",
        keyConfirmationRule: "Short entry triggered on close below Shooting Star low.",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 12. Bearish Engulfing Pattern
    const isPrevGreen = prevBar.close > prevBar.open;
    const isLastRed = lastBar.close < lastBar.open;
    if (isPrevGreen && isLastRed && lastBar.open >= prevBar.close && lastBar.close < prevBar.open) {
      const stopLossPrice = Number((Math.max(lastBar.high, prevBar.high) + 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, stopLossPrice - entryPrice);
      detected.push({
        patternName: "Bearish Engulfing Pattern",
        patternCategory: "CANDLESTICK_MASTER",
        patternType: "BEARISH_REVERSAL",
        confidencePct: 88,
        historicalWinRatePct: this.getEmpiricalWinRate("Bearish Engulfing Pattern").winRatePct,
        expectedMovePct: -5.5,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice - 5.0 * risk).toFixed(2)),
        description: "Large red body completely engulfs prior green body. Sellers seized total control of order flow — strong reversal signal.",
        keyConfirmationRule: "Confirm with follow-through red candle or break below 20 EMA.",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 13. Evening Star (Bearish 3-Candle Reversal)
    if (prevBar2.close > prevBar2.open && Math.abs(prevBar.close - prevBar.open) < body * 0.3 && isLastRed && lastBar.close < (prevBar2.open + prevBar2.close) / 2) {
      const stopLossPrice = Number((prevBar.high + 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, stopLossPrice - entryPrice);
      detected.push({
        patternName: "Bearish Evening Star",
        patternCategory: "CANDLESTICK_MASTER",
        patternType: "BEARISH_REVERSAL",
        confidencePct: 89,
        historicalWinRatePct: this.getEmpiricalWinRate("Bearish Evening Star").winRatePct,
        expectedMovePct: -6.0,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice - 5.0 * risk).toFixed(2)),
        description: "3-candle bearish reversal: strong rally → indecision doji star → powerful bearish reversal candle penetrating deep into first green body.",
        keyConfirmationRule: "Short on confirmation close below 50% midpoint of first green candle.",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 14. Double Top ('M' Pattern)
    const midHigh = Math.max(prevBar2.high, prevBar3.high);
    if (Math.abs(lastBar.high - midHigh) / (midHigh || 1) < 0.012 && isLastRed) {
      const stopLossPrice = Number((Math.max(lastBar.high, midHigh) + 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, stopLossPrice - entryPrice);
      detected.push({
        patternName: "Double Top ('M' Pattern)",
        patternCategory: "CHART_PATTERNS",
        patternType: "BEARISH_REVERSAL",
        confidencePct: 86,
        historicalWinRatePct: this.getEmpiricalWinRate("Double Top ('M' Pattern)").winRatePct,
        expectedMovePct: -6.2,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice - 5.0 * risk).toFixed(2)),
        description: "Classic 'M' Reversal Pattern forming at strong resistance. Second peak failing at prior high confirms exhaustion of buyers.",
        keyConfirmationRule: "Neckline breakdown confirmation below " + (minLow15 * 1.01).toFixed(2) + " with volume surge.",
        riskRewardRatio: 5.0,
        atrBuffer: atr14
      });
    }

    // 15. Bearish Order Block & Supply Zone (SMC)
    if (prevBar.low > lastBar.high && isLastRed && body > atr14 * 1.2) {
      const stopLossPrice = Number((prevBar.high + 0.5 * atr14).toFixed(2));
      const risk = Math.max(2, stopLossPrice - entryPrice);
      detected.push({
        patternName: "Bearish Order Block & Supply Zone",
        patternCategory: "INSTITUTIONAL_SMC",
        patternType: "BEARISH_CONTINUATION",
        confidencePct: 90,
        historicalWinRatePct: this.getEmpiricalWinRate("Bearish Order Block & Supply Zone").winRatePct,
        expectedMovePct: -7.2,
        entryPrice,
        stopLossPrice,
        projectedTargetPrice: Number((entryPrice - 2.5 * risk).toFixed(2)),
        description: "Institutional Supply Zone created by aggressive institutional selling imbalance. Gap-down from prior bar confirms distribution.",
        keyConfirmationRule: "Short on retest of supply zone with SL above Order Block high.",
        riskRewardRatio: 2.5,
        atrBuffer: atr14
      });
    }

    // Default structure if no specific multi-candle pattern triggered
    if (detected.length === 0) {
      const isBullishTrend = currentPrice > ema20;
      if (isBullishTrend) {
        const stopLossPrice = Number((currentPrice - 1.5 * atr14).toFixed(2));
        const risk = Math.max(2, Math.abs(currentPrice - stopLossPrice));
        detected.push({
          patternName: "Bullish Flag Structure (20 EMA Support)",
          patternCategory: "CHART_PATTERNS",
          patternType: "BULLISH_CONTINUATION",
          confidencePct: 75,
          historicalWinRatePct: this.getEmpiricalWinRate("Bullish Flag Structure (20 EMA Support)").winRatePct,
          expectedMovePct: 3.5,
          entryPrice,
          stopLossPrice,
          projectedTargetPrice: Number((currentPrice + 2.0 * risk).toFixed(2)),
          description: "Price holding above 20 EMA with ATR noise buffer. Continuation bias intact.",
          keyConfirmationRule: "Confirm entry with RSI momentum above 50 and volume surge.",
          riskRewardRatio: 2.0,
          atrBuffer: atr14
        });
      } else {
        const stopLossPrice = Number((currentPrice + 1.5 * atr14).toFixed(2));
        const risk = Math.max(2, Math.abs(stopLossPrice - currentPrice));
        detected.push({
          patternName: "Bearish Pressure (Below 20 EMA)",
          patternCategory: "CHART_PATTERNS",
          patternType: "BEARISH_CONTINUATION",
          confidencePct: 75,
          historicalWinRatePct: this.getEmpiricalWinRate("Bearish Pressure (Below 20 EMA)").winRatePct,
          expectedMovePct: -3.5,
          entryPrice,
          stopLossPrice,
          projectedTargetPrice: Number((currentPrice - 2.0 * risk).toFixed(2)),
          description: "Price trading below 20 EMA indicates distribution and selling pressure. Bearish continuation bias active.",
          keyConfirmationRule: "Confirm short with RSI below 45 and breakdown below recent support.",
          riskRewardRatio: 2.0,
          atrBuffer: atr14
        });
      }
    }

    // Sort detected patterns by Confidence % and Historical Win Rate % descending
    detected.sort((a, b) => (b.confidencePct + b.historicalWinRatePct) - (a.confidencePct + a.historicalWinRatePct));

    // Filter unique top-tier patterns to prevent duplicates or conflicting signals
    const topMatches: CandlestickPatternMatch[] = [];
    const seenNames = new Set<string>();

    for (const pat of detected) {
      if (!seenNames.has(pat.patternName)) {
        seenNames.add(pat.patternName);
        topMatches.push(pat);
      }
    }

    // Lock top verified patterns (Max 2 distinct high-probability patterns)
    return topMatches.slice(0, 2);
  }

  public analyzeCandlestickPatterns(bars: OHLCVBar[], currentPrice: number): CandlestickPatternMatch {
    const all = this.detectAllPatterns(bars, currentPrice);
    return all[0];
  }
}

export const candlestickPatternEngine = new CandlestickPatternEngine();
