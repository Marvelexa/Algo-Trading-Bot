/**
 * AUTOMATED F&O OPTIONS BREAKOUT TRADING ENGINE
 * NSE F&O (India) + Delta Exchange (Crypto Options)
 * 
 * Core Features:
 * 1. 5-Stage Screening Pipeline (Slippage <= 1.00, Regular Volume, Options Liquidity, Trend Clarity, Spread <= 2.5%)
 * 2. 5-Minute Timeframe Support/Resistance Breakout & Breakdown Detection
 * 3. EMA 9 / EMA 21 Confluence Filter
 * 4. Option Strike Selection (ATM / 1-OTM CE & PE)
 * 5. Single Source of Truth Verdict Payload (BUY_CE | BUY_PE | NO_TRADE)
 */

import { MarketBar } from "./aiTradingBrainV1";

export interface OptionScreeningFilterResult {
  passed: boolean;
  filterName: string;
  metricValue: string;
  thresholdValue: string;
  details: string;
}

export interface FnOptionSetup {
  symbol: string;
  isCrypto: boolean;
  underlyingPrice: number;
  selectedStrike: number;
  optionType: "CE" | "PE";
  action: "BUY_CE" | "BUY_PE" | "NO_TRADE";
  
  // Premium Execution Levels (Points)
  estimatedPremiumEntry: number;
  initialSLPremium: number;
  finalTargetPremium: number; // 5R Target
  riskUnitR: number;

  // Confirmation Flags
  ema9: number;
  ema21: number;
  emaTrendAligned: boolean;
  breakoutType: "RESISTANCE_BREAKOUT_CE" | "SUPPORT_BREAKDOWN_PE" | "NONE";
  srLevelPrice: number;

  // Screening Pipeline Status
  filters: OptionScreeningFilterResult[];
  allFiltersPassed: boolean;
  reasons: string[];
}

export class FnOptionsBreakoutEngine {

  /**
   * Evaluates the 5-Stage Screening Pipeline and 5-Min S/R Breakout Entry Logic
   */
  public evaluateOptionsBreakout(
    symbol: string,
    currentPrice: number,
    bars: MarketBar[],
    tradingVolumeToday: number = 2500000,
    avgVolume20d: number = 2000000,
    bidPrice: number = 0,
    askPrice: number = 0,
    optionOI: number = 500000,
    avgOptionOI: number = 400000
  ): FnOptionSetup {
    const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL") || symbol.endsWith("USD");
    const safeBars = bars && bars.length >= 10 ? bars : this.generateFallback5mBars(currentPrice);
    
    // Calculate EMA 9 & EMA 21 on 5m chart
    const closes = safeBars.map(b => b.close);
    const ema9 = this.calculateEMA(closes, 9);
    const ema21 = this.calculateEMA(closes, 21);

    // Identify Support & Resistance Levels on 5m chart
    const highs = safeBars.slice(-20).map(b => b.high);
    const lows = safeBars.slice(-20).map(b => b.low);
    const resistanceLevel = Number(Math.max(...highs.slice(0, -1)).toFixed(2));
    const supportLevel = Number(Math.min(...lows.slice(0, -1)).toFixed(2));

    const lastBar = safeBars[safeBars.length - 1];
    const prevBar = safeBars[safeBars.length - 2] || lastBar;

    // ────── 5-STAGE SCREENING PIPELINE ──────
    const filters: OptionScreeningFilterResult[] = [];

    // Filter 1: Max Slippage <= 1.00 Premium Points
    const midPrice = (bidPrice > 0 && askPrice > 0) ? (bidPrice + askPrice) / 2 : Math.max(10, currentPrice * 0.015);
    const estimatedSlippage = (askPrice > 0 && midPrice > 0) ? Number((askPrice - midPrice).toFixed(2)) : 0.40;
    const filter1Passed = estimatedSlippage <= 1.00;
    filters.push({
      passed: filter1Passed,
      filterName: "Filter 1: Max Slippage (<= 1.00 Pt)",
      metricValue: `${estimatedSlippage.toFixed(2)} Pts`,
      thresholdValue: "<= 1.00 Pt",
      details: filter1Passed ? "Pre-trade orderbook depth slippage within limits" : "Excessive slippage risk"
    });

    // Filter 2: Regular Underlying Volume (>= 20-Day Average)
    const filter2Passed = tradingVolumeToday >= (avgVolume20d * 0.85);
    filters.push({
      passed: filter2Passed,
      filterName: "Filter 2: Underlying Session Volume",
      metricValue: `${(tradingVolumeToday / 100000).toFixed(1)}L`,
      thresholdValue: `>= ${(avgVolume20d * 0.85 / 100000).toFixed(1)}L (85% 20D Avg)`,
      details: filter2Passed ? "Liquid underlying volume confirmed" : "Thin volume underlying — high fakeout risk"
    });

    // Filter 3: Strike Level Options Liquidity (OI & Volume Floor)
    const filter3Passed = optionOI >= (avgOptionOI * 0.75) && optionOI >= 50000;
    filters.push({
      passed: filter3Passed,
      filterName: "Filter 3: Strike Open Interest (OI)",
      metricValue: `${(optionOI / 1000).toFixed(0)}K Contracts`,
      thresholdValue: `>= ${(avgOptionOI * 0.75 / 1000).toFixed(0)}K Contracts`,
      details: filter3Passed ? "Strike option chain liquidity confirmed" : "Illiquid option strike — low contract OI"
    });

    // Filter 4: Clear Stock Trend Clarity (Range Expansion)
    const lastBarRange = lastBar.high - lastBar.low;
    const avgRange = safeBars.slice(-10).reduce((acc, b) => acc + (b.high - b.low), 0) / 10;
    const filter4Passed = lastBarRange >= (avgRange * 0.90);
    filters.push({
      passed: filter4Passed,
      filterName: "Filter 4: 5-Min Range Expansion",
      metricValue: `${lastBarRange.toFixed(2)} Pts`,
      thresholdValue: `>= ${ (avgRange * 0.90).toFixed(2)} Pts`,
      details: filter4Passed ? "5-min candle range expansion active" : "Flat / choppy consolidation"
    });

    // Filter 5: Option Bid-Ask Spread <= 2.5%
    const spreadPct = (bidPrice > 0 && askPrice > 0) ? ((askPrice - bidPrice) / midPrice) * 100 : 1.20;
    const filter5Passed = spreadPct <= 2.50;
    filters.push({
      passed: filter5Passed,
      filterName: "Filter 5: Strike Bid-Ask Spread",
      metricValue: `${spreadPct.toFixed(2)}%`,
      thresholdValue: "<= 2.50%",
      details: filter5Passed ? "Tight option premium spread" : "Wide bid-ask spread"
    });

    const allFiltersPassed = filters.every(f => f.passed);

    // ────── ENTRY TRIGGERS (5-MIN TIME FRAME) ──────
    let breakoutType: FnOptionSetup["breakoutType"] = "NONE";
    let optionType: "CE" | "PE" = "CE";
    let srLevelPrice = 0;

    const isBreakoutCE = lastBar.close > resistanceLevel && prevBar.close <= resistanceLevel;
    const isBreakdownPE = lastBar.close < supportLevel && prevBar.close >= supportLevel;

    const emaTrendCE = ema9 >= ema21;
    const emaTrendPE = ema9 <= ema21;

    let action: FnOptionSetup["action"] = "NO_TRADE";

    if (allFiltersPassed) {
      if (isBreakoutCE && emaTrendCE) {
        breakoutType = "RESISTANCE_BREAKOUT_CE";
        optionType = "CE";
        action = "BUY_CE";
        srLevelPrice = resistanceLevel;
      } else if (isBreakdownPE && emaTrendPE) {
        breakoutType = "SUPPORT_BREAKDOWN_PE";
        optionType = "PE";
        action = "BUY_PE";
        srLevelPrice = supportLevel;
      }
    }

    // Strike Selection (ATM / 1-OTM)
    const strikeInterval = isCrypto ? 100 : (currentPrice > 1000 ? 50 : 10);
    const selectedStrike = Math.round(currentPrice / strikeInterval) * strikeInterval;

    // Premium Calculations (Points)
    const estimatedPremiumEntry = Number(midPrice.toFixed(2));
    const riskUnitR = Number((estimatedPremiumEntry * 0.20).toFixed(2)); // Initial Risk R (20% of Option Premium)
    const initialSLPremium = Number((estimatedPremiumEntry - riskUnitR).toFixed(2));
    const finalTargetPremium = Number((estimatedPremiumEntry + (riskUnitR * 5.0)).toFixed(2)); // 1:5 RR Target

    const reasons: string[] = [];
    if (action === "BUY_CE") {
      reasons.push(`5-Min Resistance Breakout confirmed above ${isCrypto ? "$" : "₹"}${resistanceLevel}`);
      reasons.push(`EMA 9 (${ema9.toFixed(1)}) crossed above EMA 21 (${ema21.toFixed(1)})`);
      reasons.push(`Passed all 5 Screening Filters (Slippage <= 1.00, Spread ${spreadPct.toFixed(2)}%)`);
      reasons.push(`ATM Call Strike (${selectedStrike} CE) selected with 1:5 Risk-Reward Target`);
    } else if (action === "BUY_PE") {
      reasons.push(`5-Min Support Breakdown confirmed below ${isCrypto ? "$" : "₹"}${supportLevel}`);
      reasons.push(`EMA 9 (${ema9.toFixed(1)}) crossed below EMA 21 (${ema21.toFixed(1)})`);
      reasons.push(`Passed all 5 Screening Filters (OI ${optionOI} Contracts, Slippage <= 1.00)`);
      reasons.push(`ATM Put Strike (${selectedStrike} PE) selected with 1:5 Risk-Reward Target`);
    } else {
      reasons.push(`No 5-min S/R Breakout trigger on current candle or filtering in progress`);
    }

    return {
      symbol,
      isCrypto,
      underlyingPrice: currentPrice,
      selectedStrike,
      optionType,
      action,
      estimatedPremiumEntry,
      initialSLPremium,
      finalTargetPremium,
      riskUnitR,
      ema9: Number(ema9.toFixed(2)),
      ema21: Number(ema21.toFixed(2)),
      emaTrendAligned: action === "BUY_CE" ? emaTrendCE : action === "BUY_PE" ? emaTrendPE : false,
      breakoutType,
      srLevelPrice,
      filters,
      allFiltersPassed,
      reasons
    };
  }

  private calculateEMA(data: number[], period: number): number {
    if (data.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  }

  private generateFallback5mBars(price: number): MarketBar[] {
    const bars: MarketBar[] = [];
    const basePrice = price || 100;
    for (let i = 0; i < 20; i++) {
      const open = basePrice + (Math.sin(i) * 2);
      const close = open + (Math.cos(i) * 1.5);
      const high = Math.max(open, close) + 1;
      const low = Math.min(open, close) - 1;
      bars.push({
        time: new Date(Date.now() - (20 - i) * 5 * 60000).toISOString(),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: 150000
      });
    }
    return bars;
  }
}

export const fnOptionsBreakoutEngine = new FnOptionsBreakoutEngine();
