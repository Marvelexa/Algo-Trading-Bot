/**
 * Production-Grade Historical Backtesting Engine
 * Replays OHLCV market bars without look-ahead bias or future leakage across multi-timeframes (1m -> 1M).
 * Computes institutional performance metrics and exports reports to JSON and CSV.
 */

import { MarketBar, TradingMode, aiTradingBrainEngine } from "./aiTradingBrainV1";
import { computeMilestoneState, initializeMilestoneRiskModel } from "./ratchetTrailingStop";

export type TimeFrame = "1m" | "5m" | "15m" | "1H" | "1D" | "1W" | "1M";

export interface BacktestTradeRecord {
  tradeId: string;
  symbol: string;
  tradingMode: TradingMode;
  timeframe: TimeFrame;
  type: "BUY" | "SELL";
  entryIndex: number;
  entryTime: string | number;
  entryPrice: number;
  exitIndex: number;
  exitTime: string | number;
  exitPrice: number;
  quantity: number;
  initialStopLoss: number;
  targetPrice: number;
  realizedPnL: number;
  realizedPnLPct: number;
  realizedRR: number;
  holdingBarsCount: number;
  exitReason: string;
  outcome: "WIN" | "LOSS" | "BREAKEVEN";
}

export interface BacktestReport {
  symbol: string;
  tradingMode: TradingMode;
  timeframe: TimeFrame;
  initialCapital: number;
  finalCapital: number;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  longTradesCount: number;
  shortTradesCount: number;
  winRatePct: number;
  avgWinAmount: number;
  avgLossAmount: number;
  payoffRatio: number; // Avg Win / Avg Loss
  profitFactor: number; // Gross Profit / Gross Loss
  maxDrawdownPct: number;
  maxDrawdownAmount: number;
  sharpeRatio: number;
  sortinoRatio: number;
  recoveryFactor: number; // Net Profit / Max Drawdown Amount
  cagrPct: number;
  expectancyPerTrade: number;
  avgHoldingBars: number;
  trades: BacktestTradeRecord[];
}

export class BacktestingEngine {

  /**
   * Run historical bar-by-bar backtest simulation without lookahead bias
   */
  public runBacktest(
    symbol: string,
    bars: MarketBar[],
    tradingMode: TradingMode = "INTRADAY_SCALPING",
    timeframe: TimeFrame = "5m",
    initialCapital: number = 100000
  ): BacktestReport {
    if (!bars || bars.length < 20) {
      return this.createEmptyReport(symbol, tradingMode, timeframe, initialCapital);
    }

    let cash = initialCapital;
    let peakCapital = initialCapital;
    let maxDrawdownAmount = 0;
    let maxDrawdownPct = 0;

    const closedTrades: BacktestTradeRecord[] = [];
    let openPosition: {
      id: string;
      type: "BUY" | "SELL";
      entryIndex: number;
      entryTime: string | number;
      entryPrice: number;
      quantity: number;
      initialStopLoss: number;
      targetPrice: number;
      initialRisk: number;
      stopLossPrice: number;
      highestPrice: number;
      lowestPrice: number;
      lockedProfit: number;
      profitLockActivationThreshold: number;
      trailBuffer: number;
    } | null = null;

    const MIN_BARS_FOR_WARMUP = 15;

    // Bar-by-bar chronological simulation
    for (let i = MIN_BARS_FOR_WARMUP; i < bars.length; i++) {
      const currentBar = bars[i];
      const historicalWindow = bars.slice(0, i + 1); // Strictly past + current bar ONLY — NO future leakage!

      // 1. Manage open position
      if (openPosition) {
        const curPrice = currentBar.close;
        const lowPrice = currentBar.low;
        const highPrice = currentBar.high;

        let shouldExit = false;
        let exitPrice = curPrice;
        let exitReason = "";

        // Check SL breach
        if (openPosition.type === "BUY") {
          if (lowPrice <= openPosition.stopLossPrice) {
            shouldExit = true;
            exitPrice = openPosition.stopLossPrice;
            exitReason = "STOP_LOSS_HIT";
          } else if (highPrice >= openPosition.targetPrice) {
            shouldExit = true;
            exitPrice = openPosition.targetPrice;
            exitReason = "TARGET_5R_HIT";
          }
        } else {
          if (highPrice >= openPosition.stopLossPrice) {
            shouldExit = true;
            exitPrice = openPosition.stopLossPrice;
            exitReason = "STOP_LOSS_HIT";
          } else if (lowPrice <= openPosition.targetPrice) {
            shouldExit = true;
            exitPrice = openPosition.targetPrice;
            exitReason = "TARGET_5R_HIT";
          }
        }

        // Two-Phase Tight Trail Update
        if (!shouldExit) {
          const update = computeMilestoneState({
            type: openPosition.type,
            entryPrice: openPosition.entryPrice,
            initialStopLoss: openPosition.initialStopLoss,
            initialRisk: openPosition.initialRisk,
            currentReference: openPosition.initialRisk,
            lockedProfit: openPosition.lockedProfit,
            nextTarget: openPosition.initialRisk * 5,
            milestonesAchieved: 0,
            profitLockActivationThreshold: openPosition.profitLockActivationThreshold,
            trailBuffer: openPosition.trailBuffer,
            stopLossPrice: openPosition.stopLossPrice
          }, curPrice);

          openPosition.stopLossPrice = update.effectiveStopLoss;
          if (update.shouldExit && update.exitReason) {
            shouldExit = true;
            exitPrice = update.effectiveStopLoss;
            exitReason = update.exitReason;
          }
        }

        if (shouldExit) {
          const pnl = openPosition.type === "BUY"
            ? (exitPrice - openPosition.entryPrice) * openPosition.quantity
            : (openPosition.entryPrice - exitPrice) * openPosition.quantity;

          const pnlPct = Number((((exitPrice - openPosition.entryPrice) / openPosition.entryPrice) * (openPosition.type === "BUY" ? 100 : -100)).toFixed(2));
          const rr = Number((pnl / (openPosition.initialRisk * openPosition.quantity)).toFixed(2));
          const outcome: "WIN" | "LOSS" | "BREAKEVEN" = pnl > 0.5 ? "WIN" : pnl < -0.5 ? "LOSS" : "BREAKEVEN";

          cash += (openPosition.entryPrice * openPosition.quantity) + pnl;

          closedTrades.push({
            tradeId: openPosition.id,
            symbol,
            tradingMode,
            timeframe,
            type: openPosition.type,
            entryIndex: openPosition.entryIndex,
            entryTime: openPosition.entryTime,
            entryPrice: openPosition.entryPrice,
            exitIndex: i,
            exitTime: currentBar.time,
            exitPrice,
            quantity: openPosition.quantity,
            initialStopLoss: openPosition.initialStopLoss,
            targetPrice: openPosition.targetPrice,
            realizedPnL: Number(pnl.toFixed(2)),
            realizedPnLPct: pnlPct,
            realizedRR: rr,
            holdingBarsCount: i - openPosition.entryIndex,
            exitReason,
            outcome
          });

          openPosition = null;

          // Track equity peak and drawdown
          if (cash > peakCapital) peakCapital = cash;
          const dd = peakCapital - cash;
          if (dd > maxDrawdownAmount) {
            maxDrawdownAmount = dd;
            maxDrawdownPct = Number(((dd / peakCapital) * 100).toFixed(2));
          }
        }
      }

      // 2. Evaluate entry setup if flat
      if (!openPosition && i < bars.length - 1) {
        const brainResult = aiTradingBrainEngine.analyze(symbol, currentBar.close, historicalWindow, 65, 1.05, tradingMode);

        if (brainResult.action === "BUY" || brainResult.action === "STRONG_BUY" || brainResult.action === "SELL" || brainResult.action === "STRONG_SELL") {
          const tradeType: "BUY" | "SELL" = brainResult.action.includes("BUY") ? "BUY" : "SELL";
          const qty = 10;
          const entryPrice = currentBar.close;
          const stopLoss = brainResult.stopLoss;
          const targetPrice = brainResult.target1;
          const initRisk = Math.abs(entryPrice - stopLoss) || (entryPrice * 0.015);

          const milestoneInit = initializeMilestoneRiskModel(tradeType, entryPrice, stopLoss);

          openPosition = {
            id: `BT-${i}-${Date.now()}`,
            type: tradeType,
            entryIndex: i,
            entryTime: currentBar.time,
            entryPrice,
            quantity: qty,
            initialStopLoss: stopLoss,
            targetPrice,
            initialRisk: initRisk,
            stopLossPrice: stopLoss,
            highestPrice: entryPrice,
            lowestPrice: entryPrice,
            lockedProfit: 0,
            profitLockActivationThreshold: milestoneInit.profitLockActivationThreshold,
            trailBuffer: milestoneInit.trailBuffer
          };

          cash -= (entryPrice * qty);
        }
      }
    }

    // Force close open position at end of backtest
    if (openPosition) {
      const lastBar = bars[bars.length - 1];
      const pnl = openPosition.type === "BUY"
        ? (lastBar.close - openPosition.entryPrice) * openPosition.quantity
        : (openPosition.entryPrice - lastBar.close) * openPosition.quantity;

      const pnlPct = Number((((lastBar.close - openPosition.entryPrice) / openPosition.entryPrice) * (openPosition.type === "BUY" ? 100 : -100)).toFixed(2));
      const rr = Number((pnl / (openPosition.initialRisk * openPosition.quantity)).toFixed(2));

      cash += (openPosition.entryPrice * openPosition.quantity) + pnl;

      closedTrades.push({
        tradeId: openPosition.id,
        symbol,
        tradingMode,
        timeframe,
        type: openPosition.type,
        entryIndex: openPosition.entryIndex,
        entryTime: openPosition.entryTime,
        entryPrice: openPosition.entryPrice,
        exitIndex: bars.length - 1,
        exitTime: lastBar.time,
        exitPrice: lastBar.close,
        quantity: openPosition.quantity,
        initialStopLoss: openPosition.initialStopLoss,
        targetPrice: openPosition.targetPrice,
        realizedPnL: Number(pnl.toFixed(2)),
        realizedPnLPct: pnlPct,
        realizedRR: rr,
        holdingBarsCount: (bars.length - 1) - openPosition.entryIndex,
        exitReason: "BACKTEST_END_FORCE_CLOSE",
        outcome: pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "BREAKEVEN"
      });
    }

    return this.calculateStatistics(symbol, tradingMode, timeframe, initialCapital, cash, maxDrawdownAmount, maxDrawdownPct, closedTrades);
  }

  private calculateStatistics(
    symbol: string,
    tradingMode: TradingMode,
    timeframe: TimeFrame,
    initialCapital: number,
    finalCapital: number,
    maxDrawdownAmount: number,
    maxDrawdownPct: number,
    trades: BacktestTradeRecord[]
  ): BacktestReport {
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.outcome === "WIN");
    const losses = trades.filter(t => t.outcome === "LOSS");
    const breakevens = trades.filter(t => t.outcome === "BREAKEVEN");
    const longTrades = trades.filter(t => t.type === "BUY");
    const shortTrades = trades.filter(t => t.type === "SELL");

    const grossProfit = wins.reduce((acc, t) => acc + t.realizedPnL, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.realizedPnL, 0));
    const netProfit = Number((finalCapital - initialCapital).toFixed(2));

    const winRatePct = totalTrades > 0 ? Number(((wins.length / totalTrades) * 100).toFixed(2)) : 0;
    const avgWinAmount = wins.length > 0 ? Number((grossProfit / wins.length).toFixed(2)) : 0;
    const avgLossAmount = losses.length > 0 ? Number((grossLoss / losses.length).toFixed(2)) : 0;

    const payoffRatio = avgLossAmount > 0 ? Number((avgWinAmount / avgLossAmount).toFixed(2)) : avgWinAmount;
    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit;

    const returns = trades.map(t => t.realizedPnLPct / 100);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1
      ? Math.sqrt(returns.reduce((sq, n) => sq + Math.pow(n - avgReturn, 2), 0) / (returns.length - 1))
      : 0;

    const downsideReturns = returns.filter(r => r < 0);
    const downsideStdDev = downsideReturns.length > 1
      ? Math.sqrt(downsideReturns.reduce((sq, n) => sq + Math.pow(n, 2), 0) / (downsideReturns.length - 1))
      : 0;

    const periodsPerYear = this.estimatePeriodsPerYear(trades, timeframe);
    const annFactor = Math.sqrt(periodsPerYear || 252);

    const sharpeRatio = stdDev > 0 ? Number(((avgReturn / stdDev) * annFactor).toFixed(2)) : 0;
    const sortinoRatio = downsideStdDev > 0 ? Number(((avgReturn / downsideStdDev) * annFactor).toFixed(2)) : 0;

    const yearsCovered = this.estimateYearsCovered(trades, timeframe);
    const cagrPct = yearsCovered > 0 && initialCapital > 0 && finalCapital > 0
      ? Number((((Math.pow(finalCapital / initialCapital, 1 / yearsCovered)) - 1) * 100).toFixed(2))
      : 0;

    const grossWin = wins.reduce((acc, t) => acc + t.realizedPnLPct, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.realizedPnLPct, 0));
    const expectancyPerTrade = totalTrades > 0
      ? Number(((wins.length / totalTrades) * (wins.length ? grossWin / wins.length : 0)
              - (losses.length / totalTrades) * (losses.length ? grossLoss / losses.length : 0)).toFixed(4))
      : 0;

    const recoveryFactor = maxDrawdownAmount > 0 ? Number((netProfit / maxDrawdownAmount).toFixed(2)) : (netProfit > 0 ? Infinity : 0);
    const avgHoldingBars = totalTrades > 0 ? Number((trades.reduce((acc, t) => acc + t.holdingBarsCount, 0) / totalTrades).toFixed(1)) : 0;

    return {
      symbol,
      tradingMode,
      timeframe,
      initialCapital,
      finalCapital: Number(finalCapital.toFixed(2)),
      netProfit,
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      totalTrades,
      winningTrades: wins.length,
      losingTrades: losses.length,
      breakevenTrades: breakevens.length,
      longTradesCount: longTrades.length,
      shortTradesCount: shortTrades.length,
      winRatePct,
      avgWinAmount,
      avgLossAmount,
      payoffRatio,
      profitFactor,
      maxDrawdownPct,
      maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
      sharpeRatio,
      sortinoRatio,
      recoveryFactor,
      cagrPct,
      expectancyPerTrade,
      avgHoldingBars,
      trades
    };
  }

  private createEmptyReport(symbol: string, tradingMode: TradingMode, timeframe: TimeFrame, initialCapital: number): BacktestReport {
    return {
      symbol,
      tradingMode,
      timeframe,
      initialCapital,
      finalCapital: initialCapital,
      netProfit: 0,
      grossProfit: 0,
      grossLoss: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      longTradesCount: 0,
      shortTradesCount: 0,
      winRatePct: 0,
      avgWinAmount: 0,
      avgLossAmount: 0,
      payoffRatio: 0,
      profitFactor: 0,
      maxDrawdownPct: 0,
      maxDrawdownAmount: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      recoveryFactor: 0,
      cagrPct: 0,
      expectancyPerTrade: 0,
      avgHoldingBars: 0,
      trades: []
    };
  }

  /**
   * Estimate number of bars per year based on timeframe
   */
  private estimatePeriodsPerYear(trades: BacktestTradeRecord[], timeframe: TimeFrame): number {
    const tfPerYear: Record<TimeFrame, number> = {
      "1m": 60 * 6.25 * 252,
      "5m": 12 * 6.25 * 252,
      "15m": 4 * 6.25 * 252,
      "1H": 6.25 * 252,
      "1D": 252,
      "1W": 52,
      "1M": 12
    };
    const avgHolding = trades.length > 0
      ? trades.reduce((a, t) => a + t.holdingBarsCount, 0) / trades.length
      : 1;
    if (avgHolding <= 0) return tfPerYear[timeframe] || 252;
    return (tfPerYear[timeframe] || 252) / avgHolding;
  }

  /**
   * Estimate calendar years covered by the backtest
   */
  private estimateYearsCovered(trades: BacktestTradeRecord[], timeframe: TimeFrame): number {
    if (trades.length < 2) return 0;
    const firstEntry = trades[0].entryTime;
    const lastExit = trades[trades.length - 1].exitTime;
    let ms = 0;
    if (typeof firstEntry === "number" && typeof lastExit === "number") {
      ms = Math.abs(lastExit - firstEntry);
    } else {
      const t1 = new Date(firstEntry as string).getTime();
      const t2 = new Date(lastExit as string).getTime();
      if (!isNaN(t1) && !isNaN(t2)) ms = Math.abs(t2 - t1);
    }
    if (ms <= 0) {
      const tfPerYear: Record<TimeFrame, number> = {
        "1m": 60 * 6.25 * 252, "5m": 12 * 6.25 * 252, "15m": 4 * 6.25 * 252,
        "1H": 6.25 * 252, "1D": 252, "1W": 52, "1M": 12
      };
      const barsPerYear = tfPerYear[timeframe] || 252;
      const totalBars = trades.reduce((a, t) => a + t.holdingBarsCount, 0);
      return totalBars / barsPerYear;
    }
    return ms / (365.25 * 24 * 3600 * 1000);
  }

  /**
   * Export backtest report to JSON string
   */
  public exportToJson(report: BacktestReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export trade log to CSV string
   */
  public exportToCsv(report: BacktestReport): string {
    const headers = ["tradeId", "symbol", "tradingMode", "timeframe", "type", "entryTime", "entryPrice", "exitTime", "exitPrice", "quantity", "realizedPnL", "realizedPnLPct", "realizedRR", "holdingBarsCount", "exitReason", "outcome"];
    const rows = report.trades.map(t => [
      t.tradeId, t.symbol, t.tradingMode, t.timeframe, t.type, t.entryTime, t.entryPrice, t.exitTime, t.exitPrice, t.quantity, t.realizedPnL, t.realizedPnLPct, t.realizedRR, t.holdingBarsCount, t.exitReason, t.outcome
    ].join(","));
    return [headers.join(","), ...rows].join("\n");
  }
}

export const backtestingEngine = new BacktestingEngine();
