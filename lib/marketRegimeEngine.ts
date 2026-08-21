/**
 * Production-Grade Market Regime Testing Engine
 * Tests system performance across 12 distinct market regimes:
 * Bull Market, Bear Market, Sideways, High Volatility, Gap Up, Gap Down,
 * Circuit Limit, Low Liquidity, News Spike, Flash Crash, Trending, Mean Reversion.
 */

import { MarketBar, TradingMode, aiTradingBrainEngine } from "./aiTradingBrainV1";
import { backtestingEngine, BacktestReport } from "./backtestingEngine";

export type MarketRegimeType = 
  | "BULL_MARKET" 
  | "BEAR_MARKET" 
  | "SIDEWAYS" 
  | "HIGH_VOLATILITY" 
  | "GAP_UP" 
  | "GAP_DOWN" 
  | "CIRCUIT_LIMIT" 
  | "LOW_LIQUIDITY" 
  | "NEWS_SPIKE" 
  | "FLASH_CRASH" 
  | "TRENDING" 
  | "MEAN_REVERSION";

export interface RegimeTestResult {
  regime: MarketRegimeType;
  description: string;
  barsGeneratedCount: number;
  winRatePct: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  netProfit: number;
  totalTrades: number;
  expectancy: number;
}

export class MarketRegimeEngine {

  /**
   * Generate synthetic candles tailored to a specific Market Regime
   */
  public generateRegimeCandles(regime: MarketRegimeType, basePrice: number = 1000, count: number = 60): MarketBar[] {
    const bars: MarketBar[] = [];
    let curr = basePrice;

    for (let i = 0; i < count; i++) {
      let open = curr;
      let close = curr;
      let high = curr;
      let low = curr;
      let volume = 150000;

      switch (regime) {
        case "BULL_MARKET":
        case "TRENDING":
          close = open + (Math.random() * 8 + 2);
          high = close + (Math.random() * 3);
          low = open - (Math.random() * 2);
          volume = 250000 + Math.floor(Math.random() * 50000);
          break;

        case "BEAR_MARKET":
          close = open - (Math.random() * 8 + 2);
          high = open + (Math.random() * 2);
          low = close - (Math.random() * 3);
          volume = 300000 + Math.floor(Math.random() * 60000);
          break;

        case "SIDEWAYS":
        case "MEAN_REVERSION":
          const wave = Math.sin(i * 0.5) * 6;
          close = basePrice + wave + (Math.random() * 2 - 1);
          high = Math.max(open, close) + 2;
          low = Math.min(open, close) - 2;
          volume = 120000;
          break;

        case "HIGH_VOLATILITY":
          const swing = (Math.random() - 0.48) * 35;
          close = open + swing;
          high = Math.max(open, close) + Math.random() * 15;
          low = Math.min(open, close) - Math.random() * 15;
          volume = 450000;
          break;

        case "GAP_UP":
          if (i % 10 === 0 && i > 0) open = curr + 30; // 30-pt gap up
          close = open + (Math.random() * 5);
          high = close + 3;
          low = open - 1;
          volume = 350000;
          break;

        case "GAP_DOWN":
          if (i % 10 === 0 && i > 0) open = curr - 30; // 30-pt gap down
          close = open - (Math.random() * 5);
          high = open + 1;
          low = close - 3;
          volume = 380000;
          break;

        case "CIRCUIT_LIMIT":
          close = open * 1.05; // 5% upper circuit lock
          high = close;
          low = open;
          volume = 10000; // Low volume due to circuit lock
          break;

        case "LOW_LIQUIDITY":
          close = open + (Math.random() * 1 - 0.5);
          high = open + 0.5;
          low = open - 0.5;
          volume = 500; // Ultra low volume
          break;

        case "NEWS_SPIKE":
          if (i === 30) {
            close = open + 65; // Sudden +65pt news spike
            high = close + 10;
            low = open;
            volume = 900000;
          } else {
            close = open + (Math.random() * 3 - 1.5);
            high = Math.max(open, close) + 1;
            low = Math.min(open, close) - 1;
            volume = 100000;
          }
          break;

        case "FLASH_CRASH":
          if (i === 30) {
            close = open - 85; // Sudden -85pt flash crash
            high = open;
            low = close - 15;
            volume = 1200000;
          } else {
            close = open + (Math.random() * 3 - 1.5);
            high = Math.max(open, close) + 1;
            low = Math.min(open, close) - 1;
            volume = 100000;
          }
          break;
      }

      bars.push({
        time: i,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume
      });
      curr = close;
    }

    return bars;
  }

  /**
   * Audit system across all 12 market regimes
   */
  public auditAllRegimes(symbol: string = "NIFTY50", tradingMode: TradingMode = "INTRADAY_SCALPING"): RegimeTestResult[] {
    const regimes: Array<{ type: MarketRegimeType; desc: string }> = [
      { type: "BULL_MARKET", desc: "Strong sustained uptrend with higher highs" },
      { type: "BEAR_MARKET", desc: "Sustained downtrend with aggressive selling" },
      { type: "SIDEWAYS", desc: "Tight horizontal trading range with low momentum" },
      { type: "HIGH_VOLATILITY", desc: "Extreme price expansion and wide candle tails" },
      { type: "GAP_UP", desc: "Frequent overnight/session opening gap ups" },
      { type: "GAP_DOWN", desc: "Frequent overnight/session opening gap downs" },
      { type: "CIRCUIT_LIMIT", desc: "Locked in upper circuit with minimal trading volume" },
      { type: "LOW_LIQUIDITY", desc: "Low trading volume with wide bid-ask spreads" },
      { type: "NEWS_SPIKE", desc: "Sudden explosive price surge on unexpected news" },
      { type: "FLASH_CRASH", desc: "Sudden violent liquidity drop and downward panic spike" },
      { type: "TRENDING", desc: "Persistent directional momentum" },
      { type: "MEAN_REVERSION", desc: "Oscillating prices reverting back to moving averages" }
    ];

    const results: RegimeTestResult[] = [];

    for (const r of regimes) {
      const bars = this.generateRegimeCandles(r.type, 1000, 60);
      const backtest = backtestingEngine.runBacktest(symbol, bars, tradingMode, "5m", 100000);

      results.push({
        regime: r.type,
        description: r.desc,
        barsGeneratedCount: bars.length,
        winRatePct: backtest.winRatePct,
        profitFactor: backtest.profitFactor,
        sharpeRatio: backtest.sharpeRatio,
        maxDrawdownPct: backtest.maxDrawdownPct,
        netProfit: backtest.netProfit,
        totalTrades: backtest.totalTrades,
        expectancy: backtest.expectancyPerTrade
      });
    }

    return results;
  }
}

export const marketRegimeEngine = new MarketRegimeEngine();
