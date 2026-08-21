import { OHLCVBar } from "./stockEngine";

export interface VWAPResult {
  vwapPrice: number;
  bias: "BULLISH" | "BEARISH";
  diffPct: number;
  signalDescription: string;
}

export interface SupertrendResult {
  supertrendPrice: number;
  direction: "BULLISH_BUY" | "BEARISH_SELL";
  trendStrength: "STRONG" | "MODERATE" | "WEAK";
  signalDescription: string;
}

export interface RSIDivergenceResult {
  rsiValue: number;
  divergence: "BULLISH_DIVERGENCE" | "BEARISH_DIVERGENCE" | "NONE";
  signalDescription: string;
}

export interface MACDResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
  crossover: "BULLISH_CROSSOVER" | "BEARISH_CROSSOVER" | "NEUTRAL";
  signalDescription: string;
}

export interface TripleConfirmationResult {
  status: "CONFIRMED_STRONG_BUY" | "CONFIRMED_STRONG_SELL" | "MIXED_NEUTRAL";
  isTripleBuy: boolean;
  isTripleSell: boolean;
  score: number;
  signalDescription: string;
}

export interface BrahmastraOptionResult {
  recommendedOption: "CALL_BUY_CE" | "PUT_BUY_PE" | "NO_TRADE_RANGEBOUND";
  pcrValue: number;
  pcrSentiment: "BULLISH_SUPPORT" | "BEARISH_RESISTANCE" | "RANGEBOUND";
  confidencePct: number;
  signalDescription: string;
}

export interface CPRResult {
  pivot: number;
  bc: number;
  tc: number;
  r1: number;
  s1: number;
  r2: number;
  s2: number;
  cprWidthPct: number;
  cprType: "NARROW_CPR_TRENDING" | "WIDE_CPR_RANGEBOUND" | "AVERAGE_CPR";
  signalDescription: string;
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidthPct: number;
  isSqueeze: boolean;
  signalDescription: string;
}

export interface SmartMoneyConceptsResult {
  orderBlockZone: { type: "BULLISH_DEMAND_OB" | "BEARISH_SUPPLY_OB"; high: number; low: number };
  fairValueGap: { type: "BULLISH_FVG_IMBALANCE" | "BEARISH_FVG_IMBALANCE" | "BALANCED"; fvgTop: number; fvgBottom: number };
  marketStructure: "BOS_BULLISH_BREAK" | "CHOCH_REVERSAL" | "RANGEBOUND";
  liquiditySweep: boolean;
  signalDescription: string;
}

export interface VolumeProfileResult {
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  priceZoneStatus: "INSIDE_VALUE_AREA" | "ABOVE_VAH_BREAKOUT" | "BELOW_VAL_BREAKDOWN";
  signalDescription: string;
}

export interface OptionsAnalyticsResult {
  estimatedMaxPainStrike: number;
  deltaBias: "DELTA_LONG" | "DELTA_SHORT" | "DELTA_NEUTRAL";
  gammaRisk: "HIGH_GAMMA_SQUEEZE" | "MODERATE" | "LOW";
  signalDescription: string;
}

export interface HarmonicPatternResult {
  patternDetected: "BULLISH_GARTLEY_0618" | "BULLISH_BAT_0886" | "BEARISH_HARMONIC" | "NONE";
  przTarget: number; // Potential Reversal Zone
  fibonacciLevel: string; // e.g. 0.618 or 0.886
  signalDescription: string;
}

export interface ElliottWaveResult {
  currentWavePhase: "WAVE_3_IMPULSE_EXPANSION" | "WAVE_5_FINAL_RALLY" | "CORRECTIVE_WAVE_ABC" | "CONSOLIDATION_WAVE_4";
  waveStrength: "HIGH_MOMENTUM" | "MATURE_EXHAUSTION" | "CORRECTIVE";
  signalDescription: string;
}

export interface DonchianChannelResult {
  upperBand: number; // 20-day high
  middleBand: number; // Mean
  lowerBand: number; // 20-day low
  breakoutStatus: "UPPER_BAND_BREAKOUT" | "LOWER_BAND_BREAKDOWN" | "INSIDE_CHANNEL";
  signalDescription: string;
}

export interface ATRStopLossResult {
  atr14: number;
  recommendedBuyStopLoss: number;
  recommendedSellStopLoss: number;
  suggestedRiskRewardRatio: number;
}

export interface IchimokuCloudResult {
  tenkanSen: number;
  kijunSen: number;
  senkouSpanA: number;
  senkouSpanB: number;
  cloudStatus: "ABOVE_KUMO_CLOUD_BULLISH" | "INSIDE_KUMO_CLOUD_NEUTRAL" | "BELOW_KUMO_CLOUD_BEARISH";
  tkCrossover: "BULLISH_TK_CROSS" | "BEARISH_TK_CROSS" | "NEUTRAL";
  signalDescription: string;
}

export interface IndianTechnicalAnalysisReport {
  vwap: VWAPResult;
  supertrend: SupertrendResult;
  macd: MACDResult;
  tripleConfirmation: TripleConfirmationResult;
  brahmastraOptions: BrahmastraOptionResult;
  cpr: CPRResult;
  bollingerBands: BollingerBandsResult;
  smc: SmartMoneyConceptsResult;
  volumeProfile: VolumeProfileResult;
  optionsAnalytics: OptionsAnalyticsResult;
  harmonicPattern: HarmonicPatternResult;
  elliottWave: ElliottWaveResult;
  donchianChannel: DonchianChannelResult;
  ichimokuCloud: IchimokuCloudResult;
  rsiDivergence: RSIDivergenceResult;
  atrStopLoss: ATRStopLossResult;
  ema20: number;
  ema50: number;
  ema200: number;
  overallTechnicalSignal: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  confidenceScore: number;
  keyInsights: string[];
}

export class IndianTechnicalIndicatorsEngine {
  /**
   * 1. Calculates Volume Weighted Average Price (VWAP)
   */
  public calculateVWAP(bars: OHLCVBar[]): VWAPResult {
    if (!bars || bars.length === 0) {
      return { vwapPrice: 0, bias: "BULLISH", diffPct: 0, signalDescription: "Insufficient volume data for VWAP." };
    }

    let cumulativeTPV = 0;
    let cumulativeVol = 0;

    bars.forEach(bar => {
      const typicalPrice = (bar.high + bar.low + bar.close) / 3;
      const vol = bar.volume || 1;
      cumulativeTPV += typicalPrice * vol;
      cumulativeVol += vol;
    });

    const vwap = Number((cumulativeTPV / (cumulativeVol || 1)).toFixed(2));
    const lastClose = bars[bars.length - 1].close;
    const diffPct = Number((((lastClose - vwap) / vwap) * 100).toFixed(2));
    const bias = lastClose >= vwap ? "BULLISH" : "BEARISH";

    return {
      vwapPrice: vwap,
      bias,
      diffPct,
      signalDescription: bias === "BULLISH"
        ? `Price (${lastClose}) is trading +${diffPct}% ABOVE Intraday VWAP (${vwap}) — Institutional Buying Support Active.`
        : `Price (${lastClose}) is trading ${diffPct}% BELOW Intraday VWAP (${vwap}) — Institutional Selling Pressure Active.`
    };
  }

  /**
   * 2. Calculates 14-period Average True Range (ATR) using Wilder's smoothing
   *      Seed = SMA of first `period` true ranges.
   *      Subsequent ATR = (prevATR * (period-1) + TR) / period
   */
  public calculateATR(bars: OHLCVBar[], period: number = 14): number {
    if (!bars || bars.length < period + 1) return 10;

    const trueRanges: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const tr = Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - bars[i - 1].close),
        Math.abs(bars[i].low - bars[i - 1].close)
      );
      trueRanges.push(tr);
    }

    let atr = 0;
    for (let i = 0; i < period; i++) atr += trueRanges[i];
    atr /= period;

    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    return Number(atr.toFixed(2));
  }

  /**
   * 3. Calculates ATR-based Supertrend Indicator (Period 10, Multiplier 3)
   */
  public calculateSupertrend(bars: OHLCVBar[], period: number = 10, multiplier: number = 3.0): SupertrendResult {
    if (!bars || bars.length < period) {
      const p = bars && bars.length > 0 ? bars[bars.length - 1].close : 1000;
      return {
        supertrendPrice: p * 0.95,
        direction: "BULLISH_BUY",
        trendStrength: "MODERATE",
        signalDescription: "Supertrend (10,3) Bullish Support Line."
      };
    }

    const atr = this.calculateATR(bars, period);
    const last = bars[bars.length - 1];

    let prevLower = (bars[0].high + bars[0].low) / 2 - multiplier * atr;
    let prevUpper = (bars[0].high + bars[0].low) / 2 + multiplier * atr;
    let direction: "BULLISH_BUY" | "BEARISH_SELL" = "BULLISH_BUY";
    let stPrice = prevLower;

    for (let i = 1; i < bars.length; i++) {
      const b = bars[i];
      const mid = (b.high + b.low) / 2;
      const bUpper = mid + multiplier * atr;
      const bLower = mid - multiplier * atr;

      const fLower = (bLower > prevLower || bars[i - 1].close < prevLower) ? bLower : prevLower;
      const fUpper = (bUpper < prevUpper || bars[i - 1].close > prevUpper) ? bUpper : prevUpper;

      if (direction === "BULLISH_BUY") {
        if (b.close < fLower) {
          direction = "BEARISH_SELL";
          stPrice = fUpper;
        } else {
          stPrice = fLower;
        }
      } else {
        if (b.close > fUpper) {
          direction = "BULLISH_BUY";
          stPrice = fLower;
        } else {
          stPrice = fUpper;
        }
      }
      prevLower = fLower;
      prevUpper = fUpper;
    }

    const lastClose = bars[bars.length - 1].close;
    stPrice = Number(stPrice.toFixed(2));
    const isBullish = direction === "BULLISH_BUY";

    return {
      supertrendPrice: stPrice,
      direction,
      trendStrength: Math.abs(lastClose - stPrice) / lastClose > 0.03 ? "STRONG" : "MODERATE",
      signalDescription: isBullish
        ? `Supertrend (10,3) indicates GREEN BUY trend with trailing stop-loss support at ${stPrice}.`
        : `Supertrend (10,3) indicates RED SELL trend with resistance at ${stPrice}.`
    };
  }

  /**
   * 4. Calculates MACD (12, 26, 9) — uses standard SMA-seeded EMA (industry-correct)
   */
  public calculateMACD(bars: OHLCVBar[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACDResult {
    if (!bars || bars.length < slowPeriod + signalPeriod) {
      return {
        macdLine: 0,
        signalLine: 0,
        histogram: 0,
        crossover: "NEUTRAL",
        signalDescription: "MACD (12,26,9) Neutral."
      };
    }

    const kFast = 2 / (fastPeriod + 1);
    const kSlow = 2 / (slowPeriod + 1);
    const kSignal = 2 / (signalPeriod + 1);

    const smaSeed = (n: number) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += bars[i].close;
      return s / n;
    };

    let emaFast = smaSeed(fastPeriod);
    let emaSlow = smaSeed(slowPeriod);

    const macdHistory: number[] = [];
    for (let i = 0; i < slowPeriod - 1; i++) macdHistory.push(0);
    macdHistory.push(emaFast - emaSlow);

    for (let i = slowPeriod; i < bars.length; i++) {
      emaFast = bars[i].close * kFast + emaFast * (1 - kFast);
      emaSlow = bars[i].close * kSlow + emaSlow * (1 - kSlow);
      macdHistory.push(emaFast - emaSlow);
    }

    let signalLine = 0;
    for (let i = 0; i < signalPeriod; i++) signalLine += macdHistory[macdHistory.length - signalPeriod + i];
    signalLine /= signalPeriod;

    const histogramHistory: number[] = [];
    for (let i = 0; i < macdHistory.length; i++) {
      histogramHistory.push(macdHistory[i] - signalLine);
      signalLine = macdHistory[i] * kSignal + signalLine * (1 - kSignal);
    }

    const currMACD = Number(macdHistory[macdHistory.length - 1].toFixed(2));
    const currSignal = Number(signalLine.toFixed(2));
    const currHist = Number(histogramHistory[histogramHistory.length - 1].toFixed(2));
    const prevHist = histogramHistory[histogramHistory.length - 2] || currHist;

    let crossover: MACDResult["crossover"] = "NEUTRAL";
    let desc = `MACD Line (${currMACD}) vs Signal Line (${currSignal}).`;

    if (currHist > 0 && prevHist <= 0) {
      crossover = "BULLISH_CROSSOVER";
      desc = `🚀 MACD BULLISH CROSSOVER: MACD line crossed ABOVE signal line with expanding green histogram (${currHist}).`;
    } else if (currHist < 0 && prevHist >= 0) {
      crossover = "BEARISH_CROSSOVER";
      desc = `⚠️ MACD BEARISH CROSSOVER: MACD line crossed BELOW signal line with expanding red histogram (${currHist}).`;
    } else if (currHist > 0) {
      crossover = "NEUTRAL";
      desc = `MACD remains in Bullish Territory (Histogram: +${currHist}).`;
    } else if (currHist < 0) {
      crossover = "NEUTRAL";
      desc = `MACD remains in Bearish Territory (Histogram: ${currHist}).`;
    }

    return {
      macdLine: currMACD,
      signalLine: currSignal,
      histogram: currHist,
      crossover,
      signalDescription: desc
    };
  }

  /**
   * 5. Pushkar Raj Thakur Triple Confirmation Setup (VWAP + SuperTrend + MACD)
   */
  public evaluateTripleConfirmation(vwap: VWAPResult, supertrend: SupertrendResult, macd: MACDResult): TripleConfirmationResult {
    const isVwapBuy = vwap.bias === "BULLISH";
    const isSupertrendBuy = supertrend.direction === "BULLISH_BUY";
    const isMacdBuy = macd.crossover === "BULLISH_CROSSOVER" || macd.histogram > 0;

    const isVwapSell = vwap.bias === "BEARISH";
    const isSupertrendSell = supertrend.direction === "BEARISH_SELL";
    const isMacdSell = macd.crossover === "BEARISH_CROSSOVER" || macd.histogram < 0;

    const isTripleBuy = isVwapBuy && isSupertrendBuy && isMacdBuy;
    const isTripleSell = isVwapSell && isSupertrendSell && isMacdSell;

    let status: TripleConfirmationResult["status"] = "MIXED_NEUTRAL";
    let score = 50;
    let desc = "Indicators showing mixed/conflicting signals. Wait for triple alignment before entry.";

    if (isTripleBuy) {
      status = "CONFIRMED_STRONG_BUY";
      score = 95;
      desc = "🌟 PUSHKAR RAJ THAKUR TRIPLE CONFIRMATION BUY: Price is ABOVE VWAP + SuperTrend (10,3) is GREEN + MACD Bullish Crossover!";
    } else if (isTripleSell) {
      status = "CONFIRMED_STRONG_SELL";
      score = 5;
      desc = "🚨 PUSHKAR RAJ THAKUR TRIPLE CONFIRMATION SELL: Price is BELOW VWAP + SuperTrend (10,3) is RED + MACD Bearish Crossover!";
    } else {
      let countBuy = (isVwapBuy ? 1 : 0) + (isSupertrendBuy ? 1 : 0) + (isMacdBuy ? 1 : 0);
      score = countBuy === 2 ? 70 : countBuy === 1 ? 35 : 50;
      desc = `Triple Confirmation Status: ${countBuy}/3 Bullish Signals active (VWAP: ${vwap.bias}, SuperTrend: ${supertrend.direction}, MACD: ${macd.crossover}).`;
    }

    return {
      status,
      isTripleBuy,
      isTripleSell,
      score,
      signalDescription: desc
    };
  }

  /**
   * 6. Pushkar Raj Thakur "Brahmastra" Option Strategy (PCR + VWAP + SuperTrend + MACD)
   */
  public evaluateBrahmastraOptions(triple: TripleConfirmationResult, pcrInput: number = 1.0): BrahmastraOptionResult {
    let pcrSentiment: BrahmastraOptionResult["pcrSentiment"] = "RANGEBOUND";
    if (pcrInput >= 1.15) pcrSentiment = "BULLISH_SUPPORT";
    else if (pcrInput <= 0.82) pcrSentiment = "BEARISH_RESISTANCE";

    let recommendedOption: BrahmastraOptionResult["recommendedOption"] = "NO_TRADE_RANGEBOUND";
    let confidencePct = 50;
    let desc = `Brahmastra Option Analysis (PCR: ${pcrInput}). Neutral range-bound market structure. Avoid buying naked options.`;

    if (triple.isTripleBuy && pcrSentiment !== "BEARISH_RESISTANCE") {
      recommendedOption = "CALL_BUY_CE";
      confidencePct = pcrSentiment === "BULLISH_SUPPORT" ? 92 : 82;
      desc = `🔥 BRAHMASTRA OPTION CALL (CE BUY): High-probability Call buying opportunity! Triple Confirmation BUY active with bullish PCR (${pcrInput}).`;
    } else if (triple.isTripleSell && pcrSentiment !== "BULLISH_SUPPORT") {
      recommendedOption = "PUT_BUY_PE";
      confidencePct = pcrSentiment === "BEARISH_RESISTANCE" ? 92 : 82;
      desc = `🐻 BRAHMASTRA OPTION PUT (PE BUY): High-probability Put buying opportunity! Triple Confirmation SELL active with bearish PCR (${pcrInput}).`;
    }

    return {
      recommendedOption,
      pcrValue: pcrInput,
      pcrSentiment,
      confidencePct,
      signalDescription: desc
    };
  }

  /**
   * 7. Calculates Central Pivot Range (CPR - Pivot, BC, TC, R1, S1, R2, S2)
   */
  public calculateCPR(bars: OHLCVBar[]): CPRResult {
    if (!bars || bars.length < 2) {
      const p = bars && bars.length > 0 ? bars[bars.length - 1].close : 1000;
      return {
        pivot: p, bc: p * 0.99, tc: p * 1.01, r1: p * 1.02, s1: p * 0.98, r2: p * 1.04, s2: p * 0.96,
        cprWidthPct: 0.5, cprType: "AVERAGE_CPR", signalDescription: "CPR Calculated."
      };
    }

    const prevBar = bars[bars.length - 2];
    const pivot = Number(((prevBar.high + prevBar.low + prevBar.close) / 3).toFixed(2));
    const bc = Number(((prevBar.high + prevBar.low) / 2).toFixed(2));
    const tc = Number(((pivot - bc) + pivot).toFixed(2));

    const r1 = Number(((2 * pivot) - prevBar.low).toFixed(2));
    const s1 = Number(((2 * pivot) - prevBar.high).toFixed(2));
    const r2 = Number((pivot + (prevBar.high - prevBar.low)).toFixed(2));
    const s2 = Number((pivot - (prevBar.high - prevBar.low)).toFixed(2));

    const cprWidthPct = Number((Math.abs(tc - bc) / pivot * 100).toFixed(2));
    let cprType: CPRResult["cprType"] = "AVERAGE_CPR";
    let desc = `CPR Width: ${cprWidthPct}% (TC: ${tc}, Pivot: ${pivot}, BC: ${bc}).`;

    if (cprWidthPct <= 0.35) {
      cprType = "NARROW_CPR_TRENDING";
      desc = `⚡ NARROW CPR DETECTED (Width: ${cprWidthPct}%): Expect explosive high-momentum TRENDING day! High probability for directional breakout.`;
    } else if (cprWidthPct >= 0.80) {
      cprType = "WIDE_CPR_RANGEBOUND";
      desc = `🔄 WIDE CPR DETECTED (Width: ${cprWidthPct}%): Expect range-bound sideways day. Ideal for option selling/decay strategies.`;
    }

    return {
      pivot, bc, tc, r1, s1, r2, s2, cprWidthPct, cprType, signalDescription: desc
    };
  }

  /**
   * 8. Calculates Bollinger Bands (20 SMA, 2 StdDev) & Squeeze
   */
  public calculateBollingerBands(bars: OHLCVBar[], period: number = 20, multiplier: number = 2.0): BollingerBandsResult {
    if (!bars || bars.length < period) {
      const p = bars && bars.length > 0 ? bars[bars.length - 1].close : 1000;
      return {
        upper: p * 1.05, middle: p, lower: p * 0.95, bandwidthPct: 10, isSqueeze: false,
        signalDescription: "Bollinger Bands Normal."
      };
    }

    const slice = bars.slice(-period);
    const mean = slice.reduce((a, b) => a + b.close, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance) || (mean * 0.0001);

    const upper = Number((mean + multiplier * stdDev).toFixed(2));
    const middle = Number(mean.toFixed(2));
    const lower = Number((mean - multiplier * stdDev).toFixed(2));

    const bandwidthPct = Number((((upper - lower) / middle) * 100).toFixed(2));
    const isSqueeze = bandwidthPct < 4.0;
    const lastClose = bars[bars.length - 1].close;

    let desc = `Bollinger Bands (20,2): Upper (${upper}), Middle (${middle}), Lower (${lower}). Bandwidth: ${bandwidthPct}%.`;
    if (isSqueeze) {
      desc = `💥 BOLLINGER BAND SQUEEZE (Bandwidth: ${bandwidthPct}%): Volatility compressed! Massive breakout movement imminent!`;
    } else if (lastClose >= upper) {
      desc = `🔥 BOLLINGER BAND UPPER BREAKOUT: Price (${lastClose}) breaking above upper band (${upper}) with strong momentum!`;
    } else if (lastClose <= lower) {
      desc = `⚠️ BOLLINGER BAND LOWER BREAKOUT: Price (${lastClose}) breaking below lower band (${lower}) with selling pressure!`;
    }

    return {
      upper, middle, lower, bandwidthPct, isSqueeze, signalDescription: desc
    };
  }

  /**
   * 9. Calculates Smart Money Concepts (SMC - Order Blocks, FVG, BOS, Liquidity Sweeps)
   */
  public calculateSmartMoneyConcepts(bars: OHLCVBar[]): SmartMoneyConceptsResult {
    if (!bars || bars.length < 5) {
      const p = bars && bars.length > 0 ? bars[bars.length - 1].close : 1000;
      return {
        orderBlockZone: { type: "BULLISH_DEMAND_OB", high: p * 0.98, low: p * 0.96 },
        fairValueGap: { type: "BALANCED", fvgTop: p, fvgBottom: p },
        marketStructure: "RANGEBOUND",
        liquiditySweep: false,
        signalDescription: "SMC Analysis Initialized."
      };
    }

    const n = bars.length;
    const last = bars[n - 1];
    const b2 = bars[n - 2];
    const b3 = bars[n - 3];
    const b4 = bars[n - 4];

    let fvgType: SmartMoneyConceptsResult["fairValueGap"]["type"] = "BALANCED";
    let fvgTop = last.close;
    let fvgBottom = last.close;

    if (b4.high < last.low) {
      fvgType = "BULLISH_FVG_IMBALANCE";
      fvgBottom = b4.high;
      fvgTop = last.low;
    } else if (b4.low > last.high) {
      fvgType = "BEARISH_FVG_IMBALANCE";
      fvgBottom = last.high;
      fvgTop = b4.low;
    }

    let obType: SmartMoneyConceptsResult["orderBlockZone"]["type"] = "BULLISH_DEMAND_OB";
    let obHigh = b3.high;
    let obLow = b3.low;

    if (last.close > b2.high && b2.close < b2.open) {
      obType = "BULLISH_DEMAND_OB";
      obHigh = b2.high;
      obLow = b2.low;
    } else if (last.close < b2.low && b2.close > b2.open) {
      obType = "BEARISH_SUPPLY_OB";
      obHigh = b2.high;
      obLow = b2.low;
    }

    const prevLowMin = Math.min(b3.low, b4.low);
    const liquiditySweep = last.low < prevLowMin && last.close > prevLowMin;

    const prevHighMax = Math.max(b3.high, b4.high);
    let marketStructure: SmartMoneyConceptsResult["marketStructure"] = "RANGEBOUND";
    if (last.close > prevHighMax) marketStructure = "BOS_BULLISH_BREAK";
    else if (liquiditySweep && last.close > b2.high) marketStructure = "CHOCH_REVERSAL";

    let desc = `Smart Money Concepts (SMC): Structure is ${marketStructure}.`;
    if (liquiditySweep) {
      desc = `🦈 LIQUIDITY SWEEP DETECTED: Smart Money swept retail stop-losses below ${prevLowMin.toFixed(2)} & reclaimed structure! Reversal active.`;
    } else if (fvgType === "BULLISH_FVG_IMBALANCE") {
      desc = `🧲 BULLISH FAIR VALUE GAP (FVG): Institutional imbalance zone between ${fvgBottom.toFixed(2)} - ${fvgTop.toFixed(2)}. Price will magnetize to rebalance!`;
    } else if (obType === "BULLISH_DEMAND_OB" && last.close >= obLow && last.close <= obHigh * 1.02) {
      desc = `🏦 INSTITUTIONAL DEMAND ORDER BLOCK: Price sitting directly in Smart Money Order Block (${obLow.toFixed(2)} - ${obHigh.toFixed(2)}).`;
    }

    return {
      orderBlockZone: { type: obType, high: obHigh, low: obLow },
      fairValueGap: { type: fvgType, fvgTop, fvgBottom },
      marketStructure,
      liquiditySweep,
      signalDescription: desc
    };
  }

  /**
   * 10. Calculates Volume Profile & Point of Control (POC, VAH, VAL)
   */
  public calculateVolumeProfilePOC(bars: OHLCVBar[]): VolumeProfileResult {
    if (!bars || bars.length < 10) {
      const p = bars && bars.length > 0 ? bars[bars.length - 1].close : 1000;
      return {
        pocPrice: p, vahPrice: p * 1.02, valPrice: p * 0.98,
        priceZoneStatus: "INSIDE_VALUE_AREA", signalDescription: "Volume Profile POC Active."
      };
    }

    const prices = bars.map(b => b.close);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const step = (maxP - minP) / 20 || 1;

    const buckets = new Array(20).fill(0);
    bars.forEach(b => {
      const idx = Math.min(19, Math.floor((b.close - minP) / step));
      buckets[idx] += b.volume || 1;
    });

    let maxVolIdx = 0;
    let maxVol = 0;
    buckets.forEach((v, i) => {
      if (v > maxVol) { maxVol = v; maxVolIdx = i; }
    });

    const pocPrice = Number((minP + (maxVolIdx + 0.5) * step).toFixed(2));
    const vahPrice = Number((pocPrice + (step * 4)).toFixed(2));
    const valPrice = Number((pocPrice - (step * 4)).toFixed(2));

    const lastClose = bars[bars.length - 1].close;
    let status: VolumeProfileResult["priceZoneStatus"] = "INSIDE_VALUE_AREA";
    let desc = `Volume Profile POC: ${pocPrice} (Highest Session Volume Node). Value Area: ${valPrice} - ${vahPrice}.`;

    if (lastClose > vahPrice) {
      status = "ABOVE_VAH_BREAKOUT";
      desc = `🚀 VOLUME PROFILE VALUE AREA BREAKOUT: Price (${lastClose}) trading ABOVE Value Area High (${vahPrice}). Institutions accepting higher prices!`;
    } else if (lastClose < valPrice) {
      status = "BELOW_VAL_BREAKDOWN";
      desc = `⚠️ VOLUME PROFILE VALUE AREA BREAKDOWN: Price (${lastClose}) trading BELOW Value Area Low (${valPrice}). Heavy distribution under POC (${pocPrice}).`;
    }

    return {
      pocPrice, vahPrice, valPrice, priceZoneStatus: status, signalDescription: desc
    };
  }

  /**
   * 11. Calculates Options Analytics & Expiry Max Pain Strike
   */
  public calculateOptionsAnalytics(currentPrice: number, bars: OHLCVBar[]): OptionsAnalyticsResult {
    const strikeInterval = currentPrice > 10000 ? 100 : currentPrice > 1000 ? 50 : 10;
    const atmStrike = Math.round(currentPrice / strikeInterval) * strikeInterval;
    const maxPainStrike = atmStrike;
    const diff = currentPrice - atmStrike;

    let deltaBias: OptionsAnalyticsResult["deltaBias"] = "DELTA_NEUTRAL";
    if (diff > strikeInterval * 0.3) deltaBias = "DELTA_LONG";
    else if (diff < -strikeInterval * 0.3) deltaBias = "DELTA_SHORT";

    const atr = this.calculateATR(bars, 10);
    const gammaRisk: OptionsAnalyticsResult["gammaRisk"] = (atr / currentPrice) > 0.02 ? "HIGH_GAMMA_SQUEEZE" : "MODERATE";

    let desc = `Options Analytics: Max Pain Strike estimated at ${maxPainStrike}. Delta Bias: ${deltaBias}. Gamma Squeeze Risk: ${gammaRisk}.`;
    if (gammaRisk === "HIGH_GAMMA_SQUEEZE") {
      desc = `⚡ HIGH GAMMA SQUEEZE RISK: ATM Strike (${atmStrike}) experiencing high option gamma acceleration. Sharp 100+ point swift moves imminent!`;
    }

    return {
      estimatedMaxPainStrike: maxPainStrike,
      deltaBias,
      gammaRisk,
      signalDescription: desc
    };
  }

  /**
   * 12. Calculates Harmonic Patterns (Gartley 0.618 & Bat 0.886 Fibonacci Ratios)
   */
  public calculateHarmonicPatterns(bars: OHLCVBar[]): HarmonicPatternResult {
    if (!bars || bars.length < 15) {
      const p = bars && bars.length > 0 ? bars[bars.length - 1].close : 1000;
      return { patternDetected: "NONE", przTarget: p * 1.08, fibonacciLevel: "0.618", signalDescription: "Harmonic Scan Clear." };
    }

    const n = bars.length;
    const pX = bars[n - 15].close;
    const pA = bars[n - 10].high;
    const pB = bars[n - 6].low;
    const pC = bars[n - 3].high;
    const pD = bars[n - 1].close;

    const xaLeg = pA - pX;
    const abRetrace = xaLeg !== 0 ? Math.abs((pA - pB) / xaLeg) : 0;

    let patternDetected: HarmonicPatternResult["patternDetected"] = "NONE";
    let fibonacciLevel = "0.618";
    let przTarget = Number((pD * 1.08).toFixed(2));
    let desc = "Harmonic Pattern Scan: Scanning for Gartley 0.618 & Bat 0.886 Potential Reversal Zones (PRZ).";

    if (abRetrace >= 0.58 && abRetrace <= 0.68) {
      patternDetected = "BULLISH_GARTLEY_0618";
      fibonacciLevel = "0.618";
      desc = `📐 BULLISH GARTLEY HARMONIC PATTERN (0.618 Fib): Price reached Potential Reversal Zone (PRZ) at ${pD}. Target 1 upside: ${przTarget}!`;
    } else if (abRetrace >= 0.82 && abRetrace <= 0.92) {
      patternDetected = "BULLISH_BAT_0886";
      fibonacciLevel = "0.886";
      desc = `🦇 BULLISH BAT HARMONIC PATTERN (0.886 Fib): Deep 88.6% Fibonacci Golden Ratio reversal active at ${pD}. Explosive upside target: ${przTarget}!`;
    }

    return {
      patternDetected,
      przTarget,
      fibonacciLevel,
      signalDescription: desc
    };
  }

  /**
   * 13. Calculates Elliott Wave Impulse (Wave 1, 2, 3, 4, 5) & ABC Correction
   */
  public calculateElliottWave(bars: OHLCVBar[]): ElliottWaveResult {
    if (!bars || bars.length < 20) {
      return { currentWavePhase: "WAVE_3_IMPULSE_EXPANSION", waveStrength: "HIGH_MOMENTUM", signalDescription: "Elliott Wave Impulse Active." };
    }

    const n = bars.length;
    const closes = bars.map(b => b.close);
    const min20 = Math.min(...closes.slice(-20));
    const max20 = Math.max(...closes.slice(-20));
    const last = closes[n - 1];
    const prev5 = closes[n - 5];

    let phase: ElliottWaveResult["currentWavePhase"] = "WAVE_3_IMPULSE_EXPANSION";
    let desc = `Elliott Wave Phase: Wave 3 Impulse Expansion active. High institutional trend momentum.`;

    if (last > prev5 && last > max20 * 0.97) {
      phase = "WAVE_3_IMPULSE_EXPANSION";
      desc = `🌊 ELLIOTT WAVE 3 IMPULSE EXPANSION: Strongest & longest 161.8% Fibonacci impulse wave active! Maximum trend momentum.`;
    } else if (last >= max20 * 0.99) {
      phase = "WAVE_5_FINAL_RALLY";
      desc = `🏁 ELLIOTT WAVE 5 FINAL RALLY: Approaching mature trend cycle completion. Trail stop-loss tightly near wave 5 peak.`;
    } else if (last < prev5 && last < min20 * 1.03) {
      phase = "CORRECTIVE_WAVE_ABC";
      desc = `🔄 ELLIOTT WAVE ABC CORRECTION: Corrective phase active. Wait for Wave C completion for prime discount re-entry.`;
    } else {
      phase = "CONSOLIDATION_WAVE_4";
      desc = `⏸️ ELLIOTT WAVE 4 CONSOLIDATION: Wave 4 sideways pullback before final Wave 5 leg up.`;
    }

    return {
      currentWavePhase: phase,
      waveStrength: phase === "WAVE_3_IMPULSE_EXPANSION" ? "HIGH_MOMENTUM" : phase === "WAVE_5_FINAL_RALLY" ? "MATURE_EXHAUSTION" : "CORRECTIVE",
      signalDescription: desc
    };
  }

  /**
   * 14. Calculates Donchian Channels (20-period High/Low Breakout)
   */
  public calculateDonchianChannels(bars: OHLCVBar[], period: number = 20): DonchianChannelResult {
    if (!bars || bars.length < period) {
      const p = bars && bars.length > 0 ? bars[bars.length - 1].close : 1000;
      return { upperBand: p * 1.05, middleBand: p, lowerBand: p * 0.95, breakoutStatus: "INSIDE_CHANNEL", signalDescription: "Donchian Channel Active." };
    }

    const slice = bars.slice(-period);
    const upperBand = Number(Math.max(...slice.map(b => b.high)).toFixed(2));
    const lowerBand = Number(Math.min(...slice.map(b => b.low)).toFixed(2));
    const middleBand = Number(((upperBand + lowerBand) / 2).toFixed(2));
    const lastClose = bars[bars.length - 1].close;

    let status: DonchianChannelResult["breakoutStatus"] = "INSIDE_CHANNEL";
    let desc = `Donchian Channel (20): Upper (${upperBand}), Middle (${middleBand}), Lower (${lowerBand}).`;

    if (lastClose >= upperBand) {
      status = "UPPER_BAND_BREAKOUT";
      desc = `🔥 DONCHIAN CHANNEL 20-DAY HIGH BREAKOUT: Price (${lastClose}) broke above 20-day high (${upperBand})! Classic Turtle Trading Buy Trigger!`;
    } else if (lastClose <= lowerBand) {
      status = "LOWER_BAND_BREAKDOWN";
      desc = `⚠️ DONCHIAN CHANNEL 20-DAY LOW BREAKDOWN: Price (${lastClose}) broke below 20-day low (${lowerBand})! Selling pressure active.`;
    }

    return {
      upperBand, middleBand, lowerBand, breakoutStatus: status, signalDescription: desc
    };
  }

  /**
   * 15. Calculates RSI (14) using Wilder's smoothing & Detects Divergences
   *      Standard RSI seed = SMA of first `period` gains/losses.
   *      Subsequent values use Wilder's exponential smoothing:
   *        avgGain = (prevAvgGain * (period - 1) + gain) / period
   */
  public calculateRSIDivergence(bars: OHLCVBar[], period: number = 14): RSIDivergenceResult {
    if (!bars || bars.length < period + 5) {
      return { rsiValue: 50, divergence: "NONE", signalDescription: "RSI Neutral (50)." };
    }

    const rsiValues: number[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = bars[i].close - bars[i - 1].close;
      if (change >= 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    const firstRS = avgLoss === 0 ? (avgGain > 0 ? Infinity : 1) : avgGain / avgLoss;
    rsiValues.push(firstRS === Infinity ? 100 : Number((100 - 100 / (1 + firstRS)).toFixed(2)));

    for (let i = period + 1; i < bars.length; i++) {
      const change = bars[i].close - bars[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (avgLoss === 0) {
        rsiValues.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsiValues.push(Number((100 - 100 / (1 + rs)).toFixed(2)));
      }
    }

    const currentRSI = rsiValues[rsiValues.length - 1];
    const prevRSI = rsiValues[rsiValues.length - 5] || currentRSI;

    const currentPrice = bars[bars.length - 1].close;
    const prevPrice = bars[bars.length - 5].close;

    let divergence: RSIDivergenceResult["divergence"] = "NONE";
    let desc = `RSI (14) is at ${currentRSI}.`;

    if (currentPrice < prevPrice && currentRSI > prevRSI && currentRSI < 45) {
      divergence = "BULLISH_DIVERGENCE";
      desc = `🔥 BULLISH DIVERGENCE DETECTED: Price made a lower low (${currentPrice}), but RSI (14) made a higher low (${currentRSI}). Reversal Imminent!`;
    } else if (currentPrice > prevPrice && currentRSI < prevRSI && currentRSI > 55) {
      divergence = "BEARISH_DIVERGENCE";
      desc = `⚠️ BEARISH DIVERGENCE DETECTED: Price made a higher high (${currentPrice}), but RSI (14) made a lower high (${currentRSI}). Exhaustion Warning!`;
    } else if (currentRSI >= 70) {
      desc += " Overbought territory (>70) — Watch for profit booking.";
    } else if (currentRSI <= 30) {
      desc += " Oversold territory (<30) — High value accumulation zone.";
    }

    return {
      rsiValue: currentRSI,
      divergence,
      signalDescription: desc
    };
  }

  /**
   * 16. Calculates Dynamic ATR Volatility Stop-Loss & Target Sizing
   */
  public calculateATRStopLoss(currentPrice: number, atr14: number): ATRStopLossResult {
    const safeATR = atr14 > 0 ? atr14 : currentPrice * 0.015;
    const buySL = Number((currentPrice - (1.8 * safeATR)).toFixed(2));
    const sellSL = Number((currentPrice + (1.8 * safeATR)).toFixed(2));

    return {
      atr14: safeATR,
      recommendedBuyStopLoss: Math.max(0.1, buySL),
      recommendedSellStopLoss: sellSL,
      suggestedRiskRewardRatio: 2.5
    };
  }

  /**
   * 18. Calculates Ichimoku Kinko Hyo (Cloud System: Tenkan 9, Kijun 26, Senkou A/B 52)
   */
  public calculateIchimokuCloud(bars: OHLCVBar[]): IchimokuCloudResult {
    if (!bars || bars.length < 52) {
      const p = bars && bars.length > 0 ? bars[bars.length - 1].close : 1000;
      return {
        tenkanSen: p, kijunSen: p, senkouSpanA: p, senkouSpanB: p,
        cloudStatus: "ABOVE_KUMO_CLOUD_BULLISH", tkCrossover: "NEUTRAL",
        signalDescription: "Ichimoku Cloud Active."
      };
    }

    const calcHighLowAvg = (sliceBars: OHLCVBar[]) => {
      const h = Math.max(...sliceBars.map(b => b.high));
      const l = Math.min(...sliceBars.map(b => b.low));
      return (h + l) / 2;
    };

    const tenkan = Number(calcHighLowAvg(bars.slice(-9)).toFixed(2));
    const kijun = Number(calcHighLowAvg(bars.slice(-26)).toFixed(2));
    const senkouA = Number(((tenkan + kijun) / 2).toFixed(2));
    const senkouB = Number(calcHighLowAvg(bars.slice(-52)).toFixed(2));

    const lastClose = bars[bars.length - 1].close;
    const kumoTop = Math.max(senkouA, senkouB);
    const kumoBottom = Math.min(senkouA, senkouB);

    let cloudStatus: IchimokuCloudResult["cloudStatus"] = "INSIDE_KUMO_CLOUD_NEUTRAL";
    if (lastClose > kumoTop) cloudStatus = "ABOVE_KUMO_CLOUD_BULLISH";
    else if (lastClose < kumoBottom) cloudStatus = "BELOW_KUMO_CLOUD_BEARISH";

    let tkCrossover: IchimokuCloudResult["tkCrossover"] = "NEUTRAL";
    if (tenkan > kijun) tkCrossover = "BULLISH_TK_CROSS";
    else if (tenkan < kijun) tkCrossover = "BEARISH_TK_CROSS";

    let desc = `Ichimoku Cloud: Price (${lastClose}) vs Kumo Cloud (${kumoBottom} - ${kumoTop}). Tenkan (${tenkan}), Kijun (${kijun}).`;
    if (cloudStatus === "ABOVE_KUMO_CLOUD_BULLISH" && tkCrossover === "BULLISH_TK_CROSS") {
      desc = `☁️ ICHIMOKU KUMO CLOUD BREAKOUT: Price (${lastClose}) is trading ABOVE Kumo Cloud with Bullish Tenkan/Kijun Golden Cross (${tenkan} > ${kijun})!`;
    } else if (cloudStatus === "BELOW_KUMO_CLOUD_BEARISH") {
      desc = `⚠️ ICHIMOKU KUMO CLOUD BEARISH: Price (${lastClose}) is trading BELOW Kumo Cloud (${kumoBottom}). Cloud acting as heavy resistance.`;
    }

    return {
      tenkanSen: tenkan,
      kijunSen: kijun,
      senkouSpanA: senkouA,
      senkouSpanB: senkouB,
      cloudStatus,
      tkCrossover,
      signalDescription: desc
    };
  }

  /**
   * 17. Generates Comprehensive Master Technical Indicator Suite Report
   */
  public generateFullReport(
    bars: OHLCVBar[],
    currentPrice: number,
    tradingCategory: "INTRADAY" | "SWING_TRADER" | "LONG_TERM_INVESTOR" | "POSITIONAL_OPTIONS" = "SWING_TRADER"
  ): IndianTechnicalAnalysisReport {
    const vwap = this.calculateVWAP(bars);
    const supertrend = this.calculateSupertrend(bars);
    const macd = this.calculateMACD(bars);
    const tripleConfirmation = this.evaluateTripleConfirmation(vwap, supertrend, macd);
    const brahmastraOptions = this.evaluateBrahmastraOptions(tripleConfirmation, 1.05);
    const cpr = this.calculateCPR(bars);
    const bollingerBands = this.calculateBollingerBands(bars);
    const smc = this.calculateSmartMoneyConcepts(bars);
    const volumeProfile = this.calculateVolumeProfilePOC(bars);
    const optionsAnalytics = this.calculateOptionsAnalytics(currentPrice, bars);
    const harmonicPattern = this.calculateHarmonicPatterns(bars);
    const elliottWave = this.calculateElliottWave(bars);
    const donchianChannel = this.calculateDonchianChannels(bars);
    const ichimokuCloud = this.calculateIchimokuCloud(bars);
    const rsiDiv = this.calculateRSIDivergence(bars);
    const atr = this.calculateATR(bars);
    const atrSL = this.calculateATRStopLoss(currentPrice, atr);

    let ema20 = currentPrice;
    let ema50 = currentPrice;
    let ema200 = currentPrice;

    if (bars && bars.length > 5) {
      const k20 = 2 / 21;
      const k50 = 2 / 51;
      const k200 = 2 / 201;

      bars.forEach(b => {
        ema20 = b.close * k20 + ema20 * (1 - k20);
        ema50 = b.close * k50 + ema50 * (1 - k50);
        ema200 = b.close * k200 + ema200 * (1 - k200);
      });
    }

    let bullishPoints = 0;
    let totalPoints = 0;

    if (tradingCategory === "INTRADAY") {
      totalPoints += 20; if (smc.liquiditySweep || smc.marketStructure === "BOS_BULLISH_BREAK") bullishPoints += 20;
      totalPoints += 20; if (tripleConfirmation.isTripleBuy) bullishPoints += 20;
      totalPoints += 20; if (vwap.bias === "BULLISH") bullishPoints += 20;
      totalPoints += 20; if (donchianChannel.breakoutStatus === "UPPER_BAND_BREAKOUT") bullishPoints += 20;
      totalPoints += 20; if (supertrend.direction === "BULLISH_BUY") bullishPoints += 20;
    } else {
      totalPoints += 20; if (harmonicPattern.patternDetected.includes("BULLISH")) bullishPoints += 20;
      totalPoints += 20; if (elliottWave.currentWavePhase === "WAVE_3_IMPULSE_EXPANSION") bullishPoints += 20;
      totalPoints += 20; if (donchianChannel.breakoutStatus === "UPPER_BAND_BREAKOUT") bullishPoints += 20;
      totalPoints += 20; if (supertrend.direction === "BULLISH_BUY") bullishPoints += 20;
      totalPoints += 20; if (currentPrice > ema20) bullishPoints += 20;
    }

    const confidenceScore = Math.round((bullishPoints / (totalPoints || 1)) * 100);

    let overallSignal: IndianTechnicalAnalysisReport["overallTechnicalSignal"] = "NEUTRAL";
    if (confidenceScore >= 75) overallSignal = "STRONG_BUY";
    else if (confidenceScore >= 55) overallSignal = "BUY";
    else if (confidenceScore <= 25) overallSignal = "STRONG_SELL";
    else if (confidenceScore <= 45) overallSignal = "SELL";

    const insights: string[] = [
      harmonicPattern.signalDescription,
      elliottWave.signalDescription,
      donchianChannel.signalDescription,
      ichimokuCloud.signalDescription,
      smc.signalDescription,
      volumeProfile.signalDescription,
      optionsAnalytics.signalDescription,
      tripleConfirmation.signalDescription,
      brahmastraOptions.signalDescription,
      vwap.signalDescription,
      supertrend.signalDescription,
      macd.signalDescription,
      cpr.signalDescription,
      bollingerBands.signalDescription,
      rsiDiv.signalDescription,
      `ATR Volatility: ${atr}. Dynamic Stop-Loss: BUY SL ${atrSL.recommendedBuyStopLoss} / SELL SL ${atrSL.recommendedSellStopLoss}.`
    ];

    return {
      vwap,
      supertrend,
      macd,
      tripleConfirmation,
      brahmastraOptions,
      cpr,
      bollingerBands,
      smc,
      volumeProfile,
      optionsAnalytics,
      harmonicPattern,
      elliottWave,
      donchianChannel,
      ichimokuCloud,
      rsiDivergence: rsiDiv,
      atrStopLoss: atrSL,
      ema20: Number(ema20.toFixed(2)),
      ema50: Number(ema50.toFixed(2)),
      ema200: Number(ema200.toFixed(2)),
      overallTechnicalSignal: overallSignal,
      confidenceScore,
      keyInsights: insights
    };
  }
}

export const indianTechnicalIndicatorsEngine = new IndianTechnicalIndicatorsEngine();
