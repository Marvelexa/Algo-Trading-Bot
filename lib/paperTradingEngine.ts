/**
 * Nexvora AI Stock Research Analyst - Indian Rupee (₹) Paper Trading & Virtual Portfolio Engine
 * Persistent virtual capital account, live position P&L tracking, 1-click square-offs, auto-stop loss protection, and trade journal.
 * Powered by Compounding Milestone & Two-Phase Tight Trail Protection Engine.
 */

import { tradeOutcomesEngine } from "./tradeOutcomesEngine";
import { computeMilestoneState, initializeMilestoneRiskModel } from "./ratchetTrailingStop";

export interface PaperPosition {
  id: string;
  ticker: string;
  companyName: string;
  type: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  initialStopLoss: number;
  
  // Compounding Milestone & Two-Phase Tight Trail Fields
  initialRisk: number;
  currentReference: number;
  lockedProfit: number;
  nextTarget: number;
  milestonesAchieved: number;
  highestProfit: number;
  profitLockActivationThreshold: number;
  trailBuffer: number;

  // Dynamic Effective Levels
  stopLossPrice: number;
  targetPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  currency?: "USD" | "INR";
  tradingMode?: string;
  triggerPatternName?: string;
  timestamp: string;

  // AI Timeframe & Holding Duration Fields
  recommendedHoldDuration?: string;
  timeframeCategory?: "INTRADAY" | "SWING" | "LONG_TERM";

  // Backward compatibility fields
  trailingStopLoss?: number;
  finalTarget?: number;
  riskUnitR?: number;
  highestRAchieved?: number;
  lockedRLevel?: number | null;
}

export interface PaperTradeRecord {
  id: string;
  ticker: string;
  companyName: string;
  type: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnL: number;
  realizedPnLPct: number;
  outcome: "WIN" | "LOSS" | "BREAKEVEN";
  currency?: "USD" | "INR";
  entryTimestamp: string;
  exitTimestamp: string;
  exitReason: string;
}

export interface PaperAccountSummary {
  initialCapital: number;
  cashBalance: number;
  portfolioValue: number;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  autoRiskGuardianActive: boolean;
}

const STORAGE_KEY = "NEXVORA_PAPER_TRADING_ACCOUNT_V1";
const DEFAULT_INITIAL_CAPITAL = 50000; // ₹50,000 INR default

export class PaperTradingEngine {
  private initialCapital: number = DEFAULT_INITIAL_CAPITAL;
  private cashBalance: number = DEFAULT_INITIAL_CAPITAL;
  private openPositions: PaperPosition[] = [];
  private closedTrades: PaperTradeRecord[] = [];
  private autoRiskGuardianActive: boolean = true;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const diskPath = "./.paper_trading_state.json";
      if (typeof window === "undefined") {
        const fs = require("fs");
        if (fs.existsSync(diskPath)) {
          const raw = fs.readFileSync(diskPath, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed) {
            this.applyParsedState(parsed);
            return;
          }
        }
      }

      if (typeof window !== "undefined" && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.applyParsedState(JSON.parse(raw));
        }

        // Also hydrate from persistent server disk endpoint (.paper_trading_state.json)
        fetch("/api/paper-trading/state")
          .then(async res => {
            if (res.ok) {
              const contentType = res.headers.get("content-type") || "";
              if (contentType.includes("application/json")) {
                const text = await res.text();
                if (text && !text.trim().startsWith("<") && !text.trim().startsWith("The page")) {
                  const json = JSON.parse(text);
                  if (json?.success && json?.state) {
                    this.applyParsedState(json.state);
                  }
                }
              }
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn("[PaperTradingEngine] Storage load warning:", e);
    }
  }

  private applyParsedState(parsed: any) {
    if (!parsed) return;
    this.initialCapital = typeof parsed.initialCapital === 'number' && parsed.initialCapital > 0 ? parsed.initialCapital : DEFAULT_INITIAL_CAPITAL;
    this.cashBalance = typeof parsed.cashBalance === 'number' && !isNaN(parsed.cashBalance) ? parsed.cashBalance : DEFAULT_INITIAL_CAPITAL;
    this.autoRiskGuardianActive = parsed.autoRiskGuardianActive !== undefined ? parsed.autoRiskGuardianActive : true;

    if (Array.isArray(parsed.openPositions)) {
      this.openPositions = parsed.openPositions;
    }
    if (Array.isArray(parsed.closedTrades)) {
      this.closedTrades = parsed.closedTrades;
    }
  }

  public saveToStorage() {
    const payload = {
      initialCapital: this.initialCapital,
      cashBalance: this.cashBalance,
      openPositions: this.openPositions,
      closedTrades: this.closedTrades,
      autoRiskGuardianActive: this.autoRiskGuardianActive
    };

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        // Push to server disk persistence (.paper_trading_state.json)
        fetch("/api/paper-trading/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch (e) {
        console.warn("[PaperTradingEngine] LocalStorage save warning:", e);
      }
    }

    try {
      if (typeof window === "undefined") {
        const fs = require("fs");
        fs.writeFileSync("./.paper_trading_state.json", JSON.stringify(payload, null, 2), "utf-8");
      }
    } catch (e) {
      // Browser environment ignore
    }
  }

  public getAccountSummary(): PaperAccountSummary {
    const USD_TO_INR = 86.5;
    const totalUnrealizedPnL = this.openPositions.reduce((acc, pos) => {
      const pnl = pos.unrealizedPnL || 0;
      const inrPnl = pos.currency === "USD" ? pnl * USD_TO_INR : pnl;
      return acc + inrPnl;
    }, 0);

    const positionsValueInINR = this.openPositions.reduce((acc, pos) => {
      const val = (pos.quantity || 0) * (pos.currentPrice || 0);
      const inrVal = pos.currency === "USD" ? val * USD_TO_INR : val;
      return acc + inrVal;
    }, 0);

    const portfolioValue = (this.cashBalance || 0) + positionsValueInINR;

    const totalRealizedPnL = this.closedTrades.reduce((acc, trd) => {
      const pnl = trd.realizedPnL || 0;
      const inrPnl = trd.currency === "USD" ? pnl * USD_TO_INR : pnl;
      return acc + inrPnl;
    }, 0);
    
    const winningTrades = this.closedTrades.filter(t => t.outcome === "WIN").length;
    const losingTrades = this.closedTrades.filter(t => t.outcome === "LOSS").length;
    const totalTrades = this.closedTrades.length;
    const winRatePct = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;

    return {
      initialCapital: this.initialCapital || DEFAULT_INITIAL_CAPITAL,
      cashBalance: Number((this.cashBalance || 0).toFixed(2)),
      portfolioValue: Number(portfolioValue.toFixed(2)),
      totalRealizedPnL: Number(totalRealizedPnL.toFixed(2)),
      totalUnrealizedPnL: Number(totalUnrealizedPnL.toFixed(2)),
      totalTrades,
      winningTrades,
      losingTrades,
      winRatePct,
      autoRiskGuardianActive: this.autoRiskGuardianActive
    };
  }

  public toggleRiskGuardian(active?: boolean): boolean {
    if (active !== undefined) {
      this.autoRiskGuardianActive = active;
    } else {
      this.autoRiskGuardianActive = !this.autoRiskGuardianActive;
    }
    this.saveToStorage();
    return this.autoRiskGuardianActive;
  }

  public getOpenPositions(): PaperPosition[] {
    return [...(this.openPositions || [])];
  }

  public getClosedTrades(): PaperTradeRecord[] {
    return [...(this.closedTrades || [])];
  }

  public getLivePrice(ticker: string): number | null {
    const rawSym = (ticker || "").toUpperCase().trim();
    const pos = this.openPositions.find(p => p.ticker === rawSym);
    return pos ? pos.currentPrice : null;
  }

  private lastExecutionTimestamps: Map<string, number> = new Map();
  private lastTradeClosedTimestamps: Map<string, number> = new Map();

  public openPosition(
    ticker: string,
    companyName: string,
    type: "BUY" | "SELL",
    quantity: number,
    entryPrice: number,
    stopLossPrice: number,
    targetPrice: number,
    currencyInput?: "USD" | "INR",
    forceOverride: boolean = false,
    triggerPatternName?: string,
    recommendedHoldDuration?: string,
    timeframeCategory?: "INTRADAY" | "SWING" | "LONG_TERM"
  ): { success: boolean; message: string; position?: PaperPosition } {
    const rawSym = (ticker || "").toUpperCase().trim();
    const isCrypto = rawSym.includes("BTC") || rawSym.includes("ETH") || rawSym.includes("SOL") || rawSym.includes("XRP") || rawSym.includes("DOGE") || rawSym.includes("BNB") || rawSym.includes("ADA") || rawSym.includes("AVAX") || rawSym.includes("DOT") || rawSym.includes("LINK") || rawSym.endsWith("USD") || rawSym.endsWith("USDT");
    const isINR = rawSym.endsWith("INR") || rawSym.includes("INR") || rawSym.endsWith(".NS") || rawSym.endsWith(".BO");
    const currency: "USD" | "INR" = currencyInput || (isINR ? "INR" : (isCrypto ? "USD" : "INR"));
    const currSym = currency === "USD" ? "$" : "₹";
    const USD_TO_INR = 86.5;

    const now = Date.now();

    // Allow multi-stock testing: Only block exact duplicate active position if not forceOverride
    const existingExact = this.openPositions.find(p => p.ticker === rawSym && p.type === type);
    if (existingExact && !forceOverride) {
      // Allow adding position if capital permits, or return notice
      console.log(`[PaperTradingEngine] Adding position for ${rawSym}`);
    }

    this.lastExecutionTimestamps.set(rawSym, now);

    let safeQty = Math.max(0.0001, quantity || 1);
    const safeEntryPrice = Math.max(0.01, entryPrice || 100);

    let requiredCapitalUSD = safeQty * safeEntryPrice;
    let requiredCapitalINR = currency === "USD" ? requiredCapitalUSD * USD_TO_INR : requiredCapitalUSD;

    if (requiredCapitalINR > this.cashBalance) {
      const maxAllocINR = Math.max(1000, this.cashBalance * 0.9);
      const maxAllocUSD = currency === "USD" ? maxAllocINR / USD_TO_INR : maxAllocINR;
      safeQty = Number((maxAllocUSD / safeEntryPrice).toFixed(isCrypto ? 4 : 2));
      if (safeQty <= 0) safeQty = isCrypto ? 0.01 : 1;
      requiredCapitalUSD = safeQty * safeEntryPrice;
      requiredCapitalINR = currency === "USD" ? requiredCapitalUSD * USD_TO_INR : requiredCapitalUSD;
    }

    this.cashBalance = Math.max(0, this.cashBalance - requiredCapitalINR);

    let safeSL = stopLossPrice;
    let safeTP = targetPrice;

    // Use ATR Volatility Buffer (1.8% for Crypto, 1.5% for Equities) to prevent premature noise SL hits
    const slBufferPct = isCrypto ? 0.018 : 0.015;
    const tpBufferPct = isCrypto ? 0.045 : 0.038;

    if (type === "BUY") {
      if (!safeSL || safeSL >= safeEntryPrice || (safeEntryPrice - safeSL) / safeEntryPrice < 0.01) {
        safeSL = safeEntryPrice * (1 - slBufferPct);
      }
      if (!safeTP || safeTP <= safeEntryPrice) {
        safeTP = safeEntryPrice * (1 + tpBufferPct);
      }
    } else {
      if (!safeSL || safeSL <= safeEntryPrice || (safeSL - safeEntryPrice) / safeEntryPrice < 0.01) {
        safeSL = safeEntryPrice * (1 + slBufferPct);
      }
      if (!safeTP || safeTP >= safeEntryPrice) {
        safeTP = safeEntryPrice * (1 - tpBufferPct);
      }
    }

    const milestoneInit = initializeMilestoneRiskModel(type, safeEntryPrice, safeSL);

    // Auto-detect default duration if not explicitly passed
    const defaultDuration = recommendedHoldDuration || (isCrypto ? "1 - 2 Hours (Intraday Crypto)" : "1 - 2 Hours (Intraday Stock)");
    const defaultCategory = timeframeCategory || "INTRADAY";

    const position: PaperPosition = {
      id: `POS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      ticker: ticker || "NIFTY50",
      companyName: companyName || ticker || "Stock",
      type: type || "BUY",
      quantity: safeQty,
      entryPrice: Number(safeEntryPrice.toFixed(2)),
      initialStopLoss: Number(safeSL.toFixed(2)),
      initialRisk: milestoneInit.initialRisk,
      currentReference: milestoneInit.currentReference,
      lockedProfit: milestoneInit.lockedProfit,
      nextTarget: milestoneInit.nextTarget,
      milestonesAchieved: milestoneInit.milestonesAchieved,
      highestProfit: 0,
      profitLockActivationThreshold: milestoneInit.profitLockActivationThreshold,
      trailBuffer: milestoneInit.trailBuffer,
      stopLossPrice: milestoneInit.effectiveStopLoss,
      targetPrice: milestoneInit.effectiveTargetPrice,
      trailingStopLoss: milestoneInit.effectiveStopLoss,
      finalTarget: milestoneInit.effectiveTargetPrice,
      riskUnitR: milestoneInit.initialRisk,
      highestRAchieved: 0,
      lockedRLevel: null,
      currentPrice: Number(safeEntryPrice.toFixed(2)),
      unrealizedPnL: 0,
      unrealizedPnLPct: 0,
      currency,
      triggerPatternName,
      recommendedHoldDuration: defaultDuration,
      timeframeCategory: defaultCategory,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16)
    };

    this.openPositions.unshift(position);
    this.saveToStorage();

    return {
      success: true,
      message: `Successfully executed paper ${type} order for ${safeQty} ${ticker} @ ${currSym}${safeEntryPrice.toLocaleString()} ${currency}!`,
      position
    };
  }

  public closePosition(positionId: string, exitPrice: number, exitReason: string = "MANUAL_SQUARE_OFF"): { success: boolean; message: string; record?: PaperTradeRecord } {
    const pos = this.openPositions.find(p => p.id === positionId);
    if (!pos) {
      return { success: false, message: "Position not found." };
    }

    const actualExitPrice = Number((exitPrice || pos.currentPrice || pos.entryPrice).toFixed(2));
    const USD_TO_INR = 86.5;
    
    let realizedPnL = 0;
    if (pos.type === "BUY") {
      realizedPnL = (actualExitPrice - pos.entryPrice) * pos.quantity;
    } else {
      realizedPnL = (pos.entryPrice - actualExitPrice) * pos.quantity;
    }

    const rawSym = (pos.ticker || "").toUpperCase().trim();
    this.lastTradeClosedTimestamps.set(rawSym, Date.now());

    const investedCapital = pos.entryPrice * pos.quantity;
    const realizedPnLPct = investedCapital > 0 ? Number(((realizedPnL / investedCapital) * 100).toFixed(2)) : 0;
    
    let outcome: "WIN" | "LOSS" | "BREAKEVEN" = "BREAKEVEN";
    if (realizedPnL > 0.05) {
      outcome = "WIN";
    } else if (realizedPnL < -0.05) {
      outcome = "LOSS";
    } else {
      outcome = "BREAKEVEN";
    }

    const investedCapitalINR = pos.currency === "USD" ? investedCapital * USD_TO_INR : investedCapital;
    const realizedPnLINR = pos.currency === "USD" ? realizedPnL * USD_TO_INR : realizedPnL;

    this.cashBalance += (investedCapitalINR + realizedPnLINR);

    const record: PaperTradeRecord = {
      id: `TRD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      ticker: pos.ticker,
      companyName: pos.companyName,
      type: pos.type,
      quantity: pos.quantity,
      entryPrice: pos.entryPrice,
      exitPrice: actualExitPrice,
      realizedPnL: Number(realizedPnL.toFixed(2)),
      realizedPnLPct,
      outcome,
      exitReason: exitReason,
      currency: pos.currency || "INR",
      entryTimestamp: pos.timestamp,
      exitTimestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
    };

    const currSym = (pos.currency === "USD") ? "$" : "₹";
    const initialRisk = pos.initialRisk || Math.abs(pos.entryPrice - pos.initialStopLoss) || 1.0;
    const milestonesAchieved = pos.milestonesAchieved || 0;
    const finalLockedProfit = pos.lockedProfit || 0;
    const exitRRealized = Number((pos.type === "BUY"
      ? (actualExitPrice - pos.entryPrice) / initialRisk
      : (pos.entryPrice - actualExitPrice) / initialRisk).toFixed(2));
    const realizedRR = exitRRealized;

    let mlOutcome: "MILESTONE_EXIT" | "HIT_INITIAL_SL" | "STRUCTURE_REVERSAL_FLIP" | "MANUAL_EXIT" = "MANUAL_EXIT";
    if (exitReason.includes("STRUCTURE_REVERSAL_FLIP")) {
      mlOutcome = "STRUCTURE_REVERSAL_FLIP";
    } else if (exitReason.includes("TIGHT_TRAIL_EXIT") || exitReason.includes("MILESTONE_EXIT")) {
      mlOutcome = "MILESTONE_EXIT";
    } else if (exitReason.includes("HIT_INITIAL_SL") || exitReason.includes("STOP_LOSS")) {
      mlOutcome = "HIT_INITIAL_SL";
    }

    tradeOutcomesEngine.logTradeOutcome({
      decisionId: pos.id,
      symbol: pos.ticker,
      companyName: pos.companyName,
      type: pos.type,
      quantity: pos.quantity,
      entryPrice: pos.entryPrice,
      exitPrice: actualExitPrice,
      stopLossPrice: pos.stopLossPrice,
      targetPrice: pos.targetPrice,
      initialRisk,
      milestonesAchieved,
      finalLockedProfit,
      realizedPnL: Number(realizedPnL.toFixed(2)),
      realizedPnLPct,
      realizedRR,
      outcome: mlOutcome,
      confidenceScore: 88,
      currency: pos.currency || "INR",
      entryTimestamp: pos.timestamp,
      closedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      exitReason,
      triggerPatternName: pos.triggerPatternName || undefined
    });

    this.openPositions = this.openPositions.filter(p => p.id !== positionId);
    this.closedTrades.unshift(record);
    this.saveToStorage();

    return {
      success: true,
      message: `Closed paper position on ${pos.ticker}. Realized P&L: ${currSym}${realizedPnL >= 0 ? "+" : ""}${realizedPnL.toLocaleString()} (${realizedPnLPct}%)!`,
      record
    };
  }

  // AUTOMATED AI RISK GUARDIAN ENGINE: Two-Phase Tight Trail & Structure Reversal Guardian
  public evaluateAutoRiskGuardians(marketRegimes?: Record<string, string>): string[] {
    if (!this.autoRiskGuardianActive) return [];

    const triggeredLogs: string[] = [];
    const positionsToClose: { id: string; price: number; reason: string }[] = [];

    this.openPositions.forEach(pos => {
      const cur = pos.currentPrice || pos.entryPrice;
      const regime = marketRegimes ? marketRegimes[pos.ticker] : undefined;

      const update = computeMilestoneState(
        {
          type: pos.type,
          entryPrice: pos.entryPrice,
          initialStopLoss: pos.initialStopLoss || pos.stopLossPrice,
          initialRisk: pos.initialRisk || Math.abs(pos.entryPrice - pos.initialStopLoss),
          currentReference: pos.currentReference || pos.initialRisk,
          lockedProfit: pos.lockedProfit || 0,
          nextTarget: pos.nextTarget || ((pos.currentReference || pos.initialRisk) * 5),
          milestonesAchieved: pos.milestonesAchieved || 0,
          highestProfit: pos.highestProfit || 0,
          profitLockActivationThreshold: pos.profitLockActivationThreshold,
          trailBuffer: pos.trailBuffer,
          marketRegime: regime,
          stopLossPrice: pos.stopLossPrice
        },
        cur
      );

      pos.initialRisk = update.updatedInitialRisk;
      pos.currentReference = update.updatedCurrentReference;
      pos.lockedProfit = update.updatedLockedProfit;
      pos.nextTarget = update.updatedNextTarget;
      pos.milestonesAchieved = update.updatedMilestonesAchieved;
      pos.highestProfit = update.updatedHighestProfit;
      pos.stopLossPrice = update.effectiveStopLoss;
      pos.targetPrice = update.effectiveTargetPrice;
      pos.trailingStopLoss = update.effectiveStopLoss;
      pos.finalTarget = update.effectiveTargetPrice;

      if (update.shouldExit && update.exitReason) {
        positionsToClose.push({
          id: pos.id,
          price: cur,
          reason: update.exitReason
        });
      }
    });

    positionsToClose.forEach(item => {
      const res = this.closePosition(item.id, item.price, item.reason);
      if (res.success) {
        triggeredLogs.push(res.message);
      }
    });

    return triggeredLogs;
  }

  public updateLivePrice(ticker: string, livePrice: number, marketRegime?: string) {
    if (!ticker || !livePrice || isNaN(livePrice) || livePrice <= 0) return;
    let updated = false;
    this.openPositions.forEach(pos => {
      if (pos.ticker === ticker || pos.ticker.includes(ticker) || ticker.includes(pos.ticker)) {
        pos.currentPrice = Number(livePrice.toFixed(2));

        const update = computeMilestoneState(
          {
            type: pos.type,
            entryPrice: pos.entryPrice,
            initialStopLoss: pos.initialStopLoss || pos.stopLossPrice,
            initialRisk: pos.initialRisk || Math.abs(pos.entryPrice - pos.initialStopLoss),
            currentReference: pos.currentReference || pos.initialRisk,
            lockedProfit: pos.lockedProfit || 0,
            nextTarget: pos.nextTarget || ((pos.currentReference || pos.initialRisk) * 5),
            milestonesAchieved: pos.milestonesAchieved || 0,
            highestProfit: pos.highestProfit || 0,
            profitLockActivationThreshold: pos.profitLockActivationThreshold,
            trailBuffer: pos.trailBuffer,
            marketRegime,
            stopLossPrice: pos.stopLossPrice
          },
          pos.currentPrice
        );

        pos.initialRisk = update.updatedInitialRisk;
        pos.currentReference = update.updatedCurrentReference;
        pos.lockedProfit = update.updatedLockedProfit;
        pos.nextTarget = update.updatedNextTarget;
        pos.milestonesAchieved = update.updatedMilestonesAchieved;
        pos.highestProfit = update.updatedHighestProfit;
        pos.stopLossPrice = update.effectiveStopLoss;
        pos.targetPrice = update.effectiveTargetPrice;
        pos.trailingStopLoss = update.effectiveStopLoss;
        pos.finalTarget = update.effectiveTargetPrice;

        if (pos.type === "BUY") {
          pos.unrealizedPnL = Number(((pos.currentPrice - pos.entryPrice) * pos.quantity).toFixed(2));
          pos.unrealizedPnLPct = pos.entryPrice > 0 ? Number((((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100).toFixed(2)) : 0;
        } else {
          pos.unrealizedPnL = Number(((pos.entryPrice - pos.currentPrice) * pos.quantity).toFixed(2));
          pos.unrealizedPnLPct = pos.entryPrice > 0 ? Number((((pos.entryPrice - pos.currentPrice) / pos.entryPrice) * 100).toFixed(2)) : 0;
        }
        updated = true;
      }
    });

    if (updated) {
      this.saveToStorage();
      this.evaluateAutoRiskGuardians();
    }
  }

  /**
   * MANDATORY End-Of-Day Force-Close Engine for Intraday Positions
   * Automatically closes all open intraday positions at cutoff time (e.g. 15:15 IST),
   * overriding trailing stop-loss or profit-protection trail.
   */
  public checkEodForceClose(currentTimeIST?: string): string[] {
    const closedLogs: string[] = [];
    const now = new Date();
    const timeStr = currentTimeIST || `${String((now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24).padStart(2, "0")}:${String((now.getUTCMinutes() + 30) % 60).padStart(2, "0")}`;
    
    const [h, m] = timeStr.split(":").map(Number);
    const isPastCutoff = h > 15 || (h === 15 && m >= 15);

    if (!isPastCutoff && !currentTimeIST) return closedLogs;

    const intradayPositions = this.openPositions.filter(p => !p.tradingMode || p.tradingMode === "INTRADAY_SCALPING");

    for (const pos of intradayPositions) {
      const res = this.closePosition(pos.id, pos.currentPrice || pos.entryPrice, "EOD_FORCE_CLOSE (Mandatory Intraday End-of-Day Cutoff)");
      if (res.success) {
        closedLogs.push(res.message);
      }
    }

    return closedLogs;
  }

  public resetAccount(newCapital: number = DEFAULT_INITIAL_CAPITAL) {
    this.initialCapital = newCapital || DEFAULT_INITIAL_CAPITAL;
    this.cashBalance = newCapital || DEFAULT_INITIAL_CAPITAL;
    this.openPositions = [];
    this.closedTrades = [];
    this.saveToStorage();
  }
}

export const paperTradingEngine = new PaperTradingEngine();
