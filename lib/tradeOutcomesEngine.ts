/**
 * NEXVORA TRADE OUTCOMES & ML FEEDBACK ENGINE (Phase 5 PRD Implementation)
 * Logs every executed decision and closed trade outcome to the trade_outcomes dataset.
 * Provides historical ML training data, walk-forward performance stats, and engine weight recalibration.
 */

export interface TradeOutcomeRecord {
  id: string;
  decisionId: string;
  symbol: string;
  companyName: string;
  type: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  
  // Compounding Milestone System Fields
  initialRisk: number;
  milestonesAchieved: number;
  finalLockedProfit: number;
  
  realizedPnL: number;
  realizedPnLPct: number;
  realizedRR: number; // Realized Risk-to-Reward Ratio
  outcome: "MILESTONE_EXIT" | "HIT_INITIAL_SL" | "HIT_FINAL_TARGET" | "HIT_TRAIL" | "MANUAL_EXIT" | "STILL_OPEN" | "STRUCTURE_REVERSAL_FLIP" | "HIT_STOP" | "HIT_TARGET";
  confidenceScore: number; // AI confidence at trade entry
  currency: "USD" | "INR";
  entryTimestamp: string;
  closedAt: string;
  exitReason: string;
  triggerPatternName?: string; // Optional pattern name that triggered entry
}

const STORAGE_KEY = "NEXVORA_TRADE_OUTCOMES_V1";
const DISK_PATH = "./.trade_outcomes_state.json";

export class TradeOutcomesEngine {
  private outcomes: TradeOutcomeRecord[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    // 1. Load from disk file if available
    try {
      if (typeof window === "undefined") {
        const fs = require("fs");
        if (fs.existsSync(DISK_PATH)) {
          const raw = fs.readFileSync(DISK_PATH, "utf-8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.outcomes = parsed;
            return;
          }
        }
      }
    } catch (e) {
      // Browser ignore
    }

    // 2. Load from browser localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.outcomes = parsed;
          }
        }
      } catch (e) {
        console.warn("[TradeOutcomesEngine] LocalStorage load warning:", e);
      }
    }
  }

  public saveToStorage() {
    // Save to browser localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.outcomes));
      } catch (e) {
        console.warn("[TradeOutcomesEngine] LocalStorage save warning:", e);
      }
    }

    // Save to disk JSON file
    try {
      if (typeof window === "undefined") {
        const fs = require("fs");
        fs.writeFileSync(DISK_PATH, JSON.stringify(this.outcomes, null, 2), "utf-8");
      }
    } catch (e) {
      // Browser ignore
    }
  }

  /**
   * Log a closed trade outcome to the ML training dataset
   */
  public logTradeOutcome(record: Omit<TradeOutcomeRecord, "id">): TradeOutcomeRecord {
    const fullRecord: TradeOutcomeRecord = {
      ...record,
      id: `OUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
    };

    this.outcomes.unshift(fullRecord);
    this.saveToStorage();
    return fullRecord;
  }

  /**
   * Get full trade outcomes history for ML feedback & analytics
   */
  public getTradeOutcomes(): TradeOutcomeRecord[] {
    return [...this.outcomes];
  }

  /**
   * Get ML Performance Stats
   */
  public getMLPerformanceStats() {
    const total = this.outcomes.length;
    const milestoneExitCount = this.outcomes.filter(o => o.outcome === "MILESTONE_EXIT").length;
    const initialSlCount = this.outcomes.filter(o => o.outcome === "HIT_INITIAL_SL").length;
    const winRate = total > 0 ? Number(((milestoneExitCount / total) * 100).toFixed(1)) : 0;

    const avgRealizedRR = total > 0 
      ? Number((this.outcomes.reduce((acc, o) => acc + (o.realizedRR || 0), 0) / total).toFixed(2)) 
      : 0;

    return {
      totalLogCount: total,
      milestoneExitCount,
      initialSlCount,
      manualExitCount: total - (milestoneExitCount + initialSlCount),
      winRatePct: winRate,
      avgRealizedRR,
      readyForMLRecalibration: total >= 10
    };
  }

  /**
   * Real Empirical Resolver: Queries accumulated trade_outcomes dataset for pattern win-rate.
   * Requires sampleSize >= 10 closed trades; returns neutral 50.0% baseline if sampleSize < 10.
   */
  public getPatternEmpiricalWinRate(patternName: string): { winRatePct: number; sampleSize: number; isEmpiricallyValidated: boolean } {
    const MIN_SAMPLE_SIZE = 10;
    const normalizedSearch = patternName.trim().toLowerCase();
    const matching = this.outcomes.filter(o => 
      o.triggerPatternName && o.triggerPatternName.trim().toLowerCase() === normalizedSearch
    );

    const sampleSize = matching.length;
    if (sampleSize < MIN_SAMPLE_SIZE) {
      return { winRatePct: 50.0, sampleSize, isEmpiricallyValidated: false };
    }

    const wins = matching.filter(o => 
      o.realizedPnL > 0 || 
      o.outcome === "MILESTONE_EXIT" || 
      o.outcome === "HIT_FINAL_TARGET" || 
      o.outcome === "HIT_TARGET"
    ).length;

    const winRatePct = Number(((wins / sampleSize) * 100).toFixed(1));
    return { winRatePct, sampleSize, isEmpiricallyValidated: true };
  }
}

export const tradeOutcomesEngine = new TradeOutcomesEngine();
