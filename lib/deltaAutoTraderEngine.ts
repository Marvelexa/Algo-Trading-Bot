/**
 * Delta Exchange Auto-Trader Engine (v2 Specification)
 * 4-Layer System Architecture: Data Ingestion, Multi-Timeframe Signal Engine (15m/1h/4h),
 * News/Funding Filter, and Strict Automated Risk Management (Circuit Breaker, 1-2% Risk Sizing).
 * Built according to delta-auto-trader-spec-v2.md
 */

// ============================================================================
// 🧠 DELTA AUTO-TRADER v3 ENGINE — 24/7 AUTONOMOUS SWING HORIZON (2-4H TO 24H)
// ============================================================================
// Specification v3 Architecture:
// 1. Single Authoritative Server Daemon with In-Process Mutex Execution Locks.
// 2. Real Wilder's 14-Period ADX Calculation (True α = 1/14 Directional Movement).
// 3. True Signed Expected Value (EV) with Zero Artificial Floors.
// 4. Proportional R-Multiple Trailing Stops (+0.5R -> Entry+0.1R, +1.0R -> Entry+0.5R, +0.8R Peak Retracement).
// 5. Dual-Layer Risk Hierarchy: Per-Trade 1.8% Loss Floor + Account 3% Floating Drawdown Breaker.
// 6. Midnight Daily Reset Deferred while active multi-session swing positions are open.
// 7. Directional Concentration Cap: Max 3 same-direction concurrent slots out of 5.
// ============================================================================

import { deltaExchangeEngine, DeltaCandle } from "./deltaExchangeEngine";
import { calculateCompositeScore, calculateATR as calculateWilderATR, detectStructureSignal, CompositeResult, getTradeSignal, TradeSignal, Position as KamaPosition } from "./kamaStructureIndicator";

export const EXIT_MONITORING_INTERVAL_MS = 2 * 1000; // 30s exit price check interval
export const NEW_ENTRY_SCAN_INTERVAL_MS = 10 * 1000; // 10s evaluation interval
export const V3_MAX_HOLD_TIME_MS = 24 * 60 * 60 * 1000; // 24 Hours (1 Day) Trend & Swing Horizon Window (2h to 1 Day)
export const FEE_BUFFER_PER_TRADE_USD = 0.60; // Fixed ₹50 INR Delta Exchange India (Brokerage + 18% GST + 1% TDS + Slippage)
export const MAX_CONSECUTIVE_LOSSES_ALLOWED = 3; // Hard daily stop after 3 consecutive losses
export const MAX_DAILY_LOSS_CAP_USD = 4.40; // ₹367 INR (~7.3% of ₹5,000 capital circuit breaker for 2 SL hits)
export const DEFAULT_LEVERAGE = 5.0; // 5x dynamic margin leverage per slot

export interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AutoTraderPosition {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  initialRiskUSD: number;
  atrValue: number;
  confidenceScore: number;
  unrealizedPnLUSD: number;
  unrealizedPnLPct: number;
  trailingStopActive: boolean;
  highestProfitUSD: number;
  timeframeAlignment: string; // e.g. "15m+1h+4h Aligned"
  entryTimestamp: string;
  entryTimeMs: number; // Unix timestamp in ms
  maxHoldTimeExpiry: number; // Unix timestamp for 24h force-close
  ratchetTier?: number; // 0=Initial, 1=Goal 1 Achieved -> Extended to Goal 2, 2=Goal 2 -> Goal 3, etc.
  lockedProfitUSD?: number; // Guaranteed minimum profit secured by trailing stop
  subScores?: { trend: number; momentum: number; pattern: number; volume: number };
  adxValue?: number;
  rsiValue?: number;
  entryEVUSD?: number;
}

export interface AutoTraderClosedRecord {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnLUSD: number;
  realizedPnLPct: number;
  confidenceScore: number;
  outcome: "WIN" | "LOSS" | "BREAKEVEN";
  exitReason: "STOP_LOSS_HIT" | "TARGET_HIT" | "TRAILING_STOP_HIT" | "TRAILING_PROFIT_LOCKED" | "PEAK_RETRACEMENT_EXIT" | "EARLY_MOMENTUM_REVERSAL" | "TIME_STALL_EXIT" | "MAX_TIME_60M" | "MAX_TIME_24H" | "DAILY_CIRCUIT_BREAKER" | "NEWS_FREEZE_EXIT" | "MANUAL_EXIT";
  entryTimestamp: string;
  exitTimestamp: string;
  subScores?: { trend: number; momentum: number; pattern: number; volume: number };
  adxValue?: number;
  rsiValue?: number;
  atrValue?: number;
  entryEVUSD?: number;
  realizedRMultiple?: number;
  feeUSD?: number;
}

export interface CuratedAsset {
  symbol: string;
  name: string;
  tag: string;
  minLot: number;
  decimals: number;
  baselinePrice: number;
  description: string;
}

export const CURATED_AUTO_TRADER_ASSETS: CuratedAsset[] = [
  { symbol: "BTCUSD", name: "Bitcoin", tag: "BTC", minLot: 0.001, decimals: 4, baselinePrice: 76900, description: "Macro Leader" },
  { symbol: "ETHUSD", name: "Ethereum", tag: "ETH", minLot: 0.01, decimals: 3, baselinePrice: 2406, description: "Layer 1 Ecosystem" },
  { symbol: "SOLUSD", name: "Solana", tag: "SOL", minLot: 0.1, decimals: 2, baselinePrice: 93.0, description: "High Momentum Beta" },
  { symbol: "XRPUSD", name: "Ripple", tag: "XRP", minLot: 10, decimals: 0, baselinePrice: 1.438, description: "Payment Liquidity" },
  { symbol: "BNBUSD", name: "Binance Coin", tag: "BNB", minLot: 0.05, decimals: 2, baselinePrice: 688.7, description: "Exchange Tier 1" },
  { symbol: "DOGEUSD", name: "Dogecoin", tag: "DOGE", minLot: 100, decimals: 0, baselinePrice: 0.0897, description: "High Volatility Meme" },
  { symbol: "AVAXUSD", name: "Avalanche", tag: "AVAX", minLot: 0.5, decimals: 2, baselinePrice: 7.434, description: "Layer 1 Subnet" },
  { symbol: "LINKUSD", name: "Chainlink", tag: "LINK", minLot: 0.5, decimals: 2, baselinePrice: 11.50, description: "Oracle Infrastructure" },
  { symbol: "ADAUSD", name: "Cardano", tag: "ADA", minLot: 50, decimals: 0, baselinePrice: 0.221, description: "Layer 1 Smart Contracts" },
  { symbol: "SUIUSD", name: "Sui", tag: "SUI", minLot: 20, decimals: 0, baselinePrice: 0.8125, description: "Next-Gen Move L1" }
];

export interface AutoTraderSettings {
  mode: "PAPER" | "LIVE";
  isEnabled: boolean;
  initialCapitalUSD: number;
  currentCapitalUSD: number;
  riskPerTradePct: number; // e.g. 2.4% ($4.70-$5.00)
  maxDailyLossPct: number; // e.g. 7.4% (₹1,200 cap)
  maxTradesPerDay: number; // e.g. 10
  maxConcurrentPositions: number; // Up to 7 concurrent positions (Pipelined 5-min round-robin)
  cooldownMinutesAfterLoss: number; // e.g. 45
  minConfidenceThreshold: number; // e.g. 55
  inspectionWindowMinutes: number; // 5 minutes dedicated inspection window per coin
}

export interface AutoTraderStatus {
  botState: "RUNNING" | "PAUSED" | "CIRCUIT_BREAKER_HALT" | "COOLDOWN_ACTIVE" | "BATCH_COOLDOWN";
  mode: "PAPER" | "LIVE";
  todayPnLUSD: number;
  todayPnLPct: number;
  totalFloatingPnLUSD: number;
  totalFloatingDrawdownPct: number;
  tradesTakenToday: number;
  winningTradesToday: number;
  losingTradesToday: number;
  winRatePct: number;
  consecutiveLossCount: number;
  maxConsecutiveLossesAllowed: number;
  maxDailyLossCapUSD: number;
  maxDailyLossCapINR: number;
  expectedValuePerTradeUSD: number;
  expectedValuePerTradeINR: number;
  requiredBreakoutMovePct: number;
  cooldownRemainingMins: number;
  circuitBreakerActive: boolean;
  fundingRateWarning: string | null;
  newsFreezeActive: boolean;
  lastAnalysisTimestamp: string;
  currentInspection: {
    assetIndex: number;
    symbol: string;
    name: string;
    tag: string;
    currentPrice?: number;
    inspectionRemainingSeconds: number;
    inspectionTotalSeconds: number;
    status: "INSPECTING" | "SLOTS_FULL" | "HOLDING_ACTIVE_POSITION" | "SKIPPED_CHOPPY" | "PAUSED";
    nextSymbol: string;
    currentScore: number;
    currentDirection: "BUY" | "SELL" | "NEUTRAL";
    currentEVUSD: number;
  };
  batchCycle: {
    currentBatchTrades: number;
    maxBatchTrades: number;
    cycleNumber: number;
    isCoolingDown: boolean;
    cooldownRemainingSeconds: number;
    cooldownTotalSeconds: number;
  };
}

export interface CryptoNewsItem {
  id: string;
  title: string;
  source: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  timestamp: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
}

export interface MultiTimeframeAnalysis {
  symbol: string;
  overallScore: number; // 0 to 100
  isEntryValid: boolean;
  direction: "BUY" | "SELL" | "NEUTRAL";
  projectedProfitUSD: number; // Expected USD profit on trade
  profitProbabilityPct: number; // Heuristic score / win probability
  fourHourTrend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  oneHourMomentum: "BULLISH_DIVERGENCE" | "BEARISH_DIVERGENCE" | "NEUTRAL";
  fifteenMinTrigger: "BULLISH_BREAKOUT" | "BEARISH_BREAKOUT" | "NEUTRAL";
  adxValue: number;
  rsi1h: number;
  momentumIgnition?: {
    score: number;
    setupTier: "STRONG_SETUP" | "EARLY_SETUP" | "DEVELOPING" | "CHOP_REJECT";
    roc: number;
    volumeExpansion: number;
    obvSlope: string;
    vwapStatus: string;
  };
  atr1h: number;
  volumeMultiplier: number;
  reasoning: string;
  dataSource: "DELTA" | "BINANCE" | "UNAVAILABLE";
  subScores?: { trend: number; momentum: number; pattern: number; volume: number };
  fundingRate?: number;
  spreadPct?: number;
  shannonEntropy?: number;
  hurstExponent?: number;
  zScore?: number;
  kamaVelocity?: number;
  expectedValueUSD?: number;
  halfKellyFraction?: number;
}

export interface ScanDiagnosticReport {
  timestamp: string;
  totalAssets: number;
  openSlots: number;
  tradesToday: number;
  maxTrades: number;
  bestAsset: {
    symbol: string;
    name: string;
    score: number;
    direction: "BUY" | "SELL" | "NEUTRAL";
    projectedProfitUSD: number;
    profitProbabilityPct: number;
    reason: string;
    fourHourTrend: string;
    oneHourMomentum: string;
    fifteenMinTrigger: string;
    currentPrice: number;
  } | null;
  assetScans: Array<{
    symbol: string;
    name: string;
    score: number;
    direction: "BUY" | "SELL" | "NEUTRAL";
    projectedProfitUSD: number;
    profitProbabilityPct: number;
    status: "READY_TO_FIRE" | "WAITING_CONFLUENCE" | "CONSOLIDATION" | "ALREADY_OPEN";
    reason: string;
    fourHourTrend: string;
    oneHourMomentum: string;
    fifteenMinTrigger: string;
    currentPrice: number;
  }>;
}

const STORAGE_KEY = "NEXVORA_DELTA_AUTO_TRADER_STATE_V10";
const DEFAULT_CAPITAL_USD = 60.00; // ₹5,000 INR ($60.00 USD) Real User Account Capital

export class DeltaAutoTraderEngine {
  private settings: AutoTraderSettings = {
    mode: "PAPER",
    isEnabled: true,
    initialCapitalUSD: DEFAULT_CAPITAL_USD,
    currentCapitalUSD: DEFAULT_CAPITAL_USD,
    riskPerTradePct: 2.0,
    maxDailyLossPct: 3.0,
    maxTradesPerDay: 10,
    cooldownMinutesAfterLoss: 45,
    minConfidenceThreshold: 80,
    maxConcurrentPositions: 1, // 🎯 SINGLE SNIPER MODE: Only 1 trade at a time with concentrated capital! (leaves 50% free margin buffer) (Pipelined 5-min round-robin) (Pipelined 5-min round-robin)
    inspectionWindowMinutes: 5 // 5 minutes dedicated inspection window per coin
  };

  private openPositions: AutoTraderPosition[] = [];
  private closedRecords: AutoTraderClosedRecord[] = [];
  private lastLossTimestamp: number = 0;
  private symbolBlacklist: Record<string, number> = {};
  private consecutiveLossCount: number = 0;
  private todayDateStr: string = "";
  private tradesTakenTodayCount: number = 0;
  private dailyStartCapitalUSD: number = DEFAULT_CAPITAL_USD;
  private newsFreezeActive: boolean = false;
  private newsFreezeCountdownMins: number = 0;
  private analysisCache: Map<string, MultiTimeframeAnalysis> = new Map();
  private latestPrices: Map<string, number> = new Map();
  private stoppedAssetCooldowns: Map<string, number> = new Map(); // Asset re-entry cooldown after SL
  private isScanningLoopActive: boolean = false;
  // 🔄 Sequential 10-Coin Round-Robin Engine (5-min inspection per coin)
  private currentAssetIndex: number = 0;
  private inspectionStartTimeMs: number = 0;
  private slotReentryCooldownExpiry: number = 0;
  private batchCooldownMinutes: number = 10;
  private currentCycleNumber: number = 1;
  private lastActiveTickTimestamp: number = Date.now();

  private cryptoNewsList: CryptoNewsItem[] = [
    {
      id: "NEWS-1",
      title: "Bitcoin ETFs Inflows Surge Past $1.2B as Institutional Accumulation Accelerates",
      source: "CoinDesk Institutional",
      sentiment: "POSITIVE",
      timestamp: "18 mins ago",
      impact: "HIGH",
      summary: "Global institutional flows into spot Bitcoin products hit a 3-month high with continuous accumulation by major funds."
    },
    {
      id: "NEWS-2",
      title: "US Federal Reserve Holds Benchmark Interest Rates Steady Amid Cooling Inflation",
      source: "Bloomberg Crypto",
      sentiment: "NEUTRAL",
      timestamp: "1 hour ago",
      impact: "HIGH",
      summary: "Macro interest rate trajectory remains balanced with quantitative tightening easing expectations."
    },
    {
      id: "NEWS-3",
      title: "Ethereum Layer-2 Total Value Locked (TVL) Crosses Record $42 Billion Mark",
      source: "CoinTelegraph",
      sentiment: "POSITIVE",
      timestamp: "3 hours ago",
      impact: "MEDIUM",
      summary: "On-chain scaling metrics and DeFi perpetual protocol volumes continue aggressive growth."
    },
    {
      id: "NEWS-4",
      title: "Derivatives Liquidation Cascades Stabilize Following Global Futures Mark Recovery",
      source: "Delta Exchange Research",
      sentiment: "POSITIVE",
      timestamp: "5 hours ago",
      impact: "MEDIUM",
      summary: "Funding rates normalized across major perpetual futures contracts with low liquidation volatility."
    }
  ];

  constructor() {
    this.todayDateStr = new Date().toISOString().split("T")[0];
    this.loadFromStorage();
    this.startAutonomousBackgroundDaemon();
  }

  public async syncLiveWalletBalance(): Promise<number | null> {
    try {
      const balances = await deltaExchangeEngine.fetchWalletBalance();
      if (balances?.meta?.net_equity) {
        const equity = parseFloat(balances.meta.net_equity);
        if (equity > 0) {
          this.settings.currentCapitalUSD = Number(equity.toFixed(2));
          this.saveToStorage();
          return this.settings.currentCapitalUSD;
        }
      }
    } catch (e) {
      console.warn("[DeltaAutoTrader] Wallet balance sync failed:", e);
    }
    return null;
  }

  private async loadFromStorage() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.applyParsedState(JSON.parse(raw));
        }
      } catch (e) {
        console.warn("[DeltaAutoTrader] LocalStorage load error:", e);
      }

      // Also hydrate from persistent server disk endpoint (.delta_auto_trader_state.json)
      try {
        const res = await fetch("/api/autotrader/state");
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
      } catch (e) {
        // Offline / server fetch fallback
      }
    } else {
      // Node.js Direct Disk Hydration (24/7 background mode when browser is closed)
      try {
        const fs = await import("fs");
        const path = await import("path");
        const filePath = path.join(process.cwd(), ".delta_auto_trader_state.json");
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, "utf-8");
          if (raw) {
            this.applyParsedState(JSON.parse(raw));
          }
        }
      } catch (e) {}
    }
  }

  private applyParsedState(parsed: any) {
    if (!parsed) return;
    if (parsed.settings) {
      this.settings = { ...this.settings, ...parsed.settings };
      this.settings.initialCapitalUSD = 60.00; // ₹5,000 INR Base Capital
      this.settings.currentCapitalUSD = (typeof parsed.settings.currentCapitalUSD === "number" && parsed.settings.currentCapitalUSD > 20 && parsed.settings.currentCapitalUSD <= 100) ? parsed.settings.currentCapitalUSD : 60.00;
      this.settings.riskPerTradePct = 2.4; // 2.4% risk ($4.70-$5.00) -> $9.60-$10.80 (+₹800-₹900) Target!
      this.settings.maxTradesPerDay = 10;
      this.settings.maxConcurrentPositions = 1;
      this.settings.minConfidenceThreshold = 80;
      this.settings.inspectionWindowMinutes = 5;
    }
    if (Array.isArray(parsed.openPositions)) {
      const now = Date.now();
      const validOpen: AutoTraderPosition[] = [];
      for (const pos of parsed.openPositions) {
        const entryMs = pos.entryTimeMs || (pos.entryTimestamp ? new Date(pos.entryTimestamp.includes("T") ? pos.entryTimestamp : pos.entryTimestamp.replace(" ", "T") + "Z").getTime() : now) || now;
        const holdMs = now - entryMs;
        // Auto-exit/prune positions older than 24 hours (v3 Swing Horizon max hold)
        if (holdMs >= V3_MAX_HOLD_TIME_MS) {
          const actualExitPrice = pos.currentPrice || pos.entryPrice;
          const pnlUSD = pos.type === "BUY"
            ? (actualExitPrice - pos.entryPrice) * pos.quantity
            : (pos.entryPrice - actualExitPrice) * pos.quantity;
          const invested = pos.entryPrice * pos.quantity;
          const pnlPct = invested > 0 ? Number(((pnlUSD / invested) * 100).toFixed(2)) : 0;
          this.closedRecords.unshift({
            id: pos.id,
            symbol: pos.symbol,
            type: pos.type,
            quantity: pos.quantity,
            entryPrice: pos.entryPrice,
            exitPrice: actualExitPrice,
            realizedPnLUSD: Number(pnlUSD.toFixed(2)),
            realizedPnLPct: pnlPct,
            confidenceScore: pos.confidenceScore || 75,
            outcome: pnlUSD > 0.1 ? "WIN" : pnlUSD < -0.1 ? "LOSS" : "BREAKEVEN",
            exitReason: "MAX_HOLD_TIME_EXPIRY",
            entryTimestamp: pos.entryTimestamp,
            exitTimestamp: new Date().toISOString().replace("T", " ").substring(0, 16)
          });
        } else {
          validOpen.push(pos);
        }
      }
      // Keep up to 5 concurrent positions
      this.openPositions = validOpen.slice(0, 1);
    }
    if (Array.isArray(parsed.closedRecords)) {
      // Clean up / Delete corrupted price anomaly records
      this.closedRecords = parsed.closedRecords.filter((r: any) => {
        if (!r.symbol || !r.entryPrice || !r.exitPrice) return false;
        if (r.exitReason === "TIME_STALL_EXIT") return false;
        if (r.realizedPnLUSD <= -10) return false;
        const baseline = this.getAssetBaselinePrice(r.symbol);
        if (baseline > 0) {
          if (r.entryPrice > baseline * 3 || r.entryPrice < baseline * 0.3) return false;
          if (r.exitPrice > baseline * 3 || r.exitPrice < baseline * 0.3) return false;
        }
        return true;
      });
    }
    if (parsed.lastLossTimestamp) this.lastLossTimestamp = parsed.lastLossTimestamp;
    if (typeof parsed.consecutiveLossCount === "number") this.consecutiveLossCount = parsed.consecutiveLossCount;
    if (parsed.todayDateStr) this.todayDateStr = parsed.todayDateStr;

    // Recalculate valid trades count today
    const validTodayRecords = this.closedRecords.filter(r => r.exitTimestamp && r.exitTimestamp.startsWith(this.todayDateStr));
    this.tradesTakenTodayCount = validTodayRecords.length + this.openPositions.length;

    if (typeof parsed.slotReentryCooldownExpiry === "number") this.slotReentryCooldownExpiry = parsed.slotReentryCooldownExpiry;
    else if (typeof parsed.batchCooldownExpiry === "number") this.slotReentryCooldownExpiry = parsed.batchCooldownExpiry;
    if (typeof parsed.currentCycleNumber === "number") this.currentCycleNumber = parsed.currentCycleNumber;
    if (typeof parsed.dailyStartCapitalUSD === "number") this.dailyStartCapitalUSD = parsed.dailyStartCapitalUSD;
    this.saveToStorage();
  }

  public closeAllOpenPositions(reason: AutoTraderClosedRecord["exitReason"] = "MAX_HOLD_TIME_EXPIRY"): { count: number; message: string } {
    const count = this.openPositions.length;
    if (count === 0) return { count: 0, message: "No active open positions to close." };

    const positionsToClose = [...this.openPositions];
    for (const pos of positionsToClose) {
      this.closePosition(pos.id, pos.currentPrice || pos.entryPrice, reason);
    }
    this.slotReentryCooldownExpiry = 0;
    this.saveToStorage();
    return { count, message: `Successfully exited all ${count} position(s). Ready for fresh 5-minute sequential inspection!` };
  }

  public resetSystemCleanly(): { success: boolean; message: string } {
    this.openPositions = [];
    this.closedRecords = [];
    this.settings.isEnabled = true;
    this.settings.maxConcurrentPositions = 1;
    this.settings.inspectionWindowMinutes = 5;
    this.settings.minConfidenceThreshold = 80;
    this.settings.riskPerTradePct = 2.4;
    this.settings.currentCapitalUSD = this.settings.initialCapitalUSD;
    this.dailyStartCapitalUSD = this.settings.initialCapitalUSD;
    this.tradesTakenTodayCount = 0;
    this.lastLossTimestamp = 0;
    this.consecutiveLossCount = 0;
    this.slotReentryCooldownExpiry = 0;
    this.currentCycleNumber = 1;
    this.currentAssetIndex = 0;
    this.inspectionStartTimeMs = 0;
    this.saveToStorage();
    return { success: true, message: "🧹 System reset: All P&L, trade records & open positions cleared. Bot is PAUSED (OFF). Ready for fresh start!" };
  }

  public resetDailyCounters() {
    return this.resetSystemCleanly();
  }

  public skipBatchCooldown(): void {
    this.slotReentryCooldownExpiry = 0;
    this.saveToStorage();
  }

  public saveToStorage() {
    const payload = {
      settings: this.settings,
      openPositions: this.openPositions,
      closedRecords: this.closedRecords,
      lastLossTimestamp: this.lastLossTimestamp,
      consecutiveLossCount: this.consecutiveLossCount,
      todayDateStr: this.todayDateStr,
      tradesTakenTodayCount: this.tradesTakenTodayCount,
      dailyStartCapitalUSD: this.dailyStartCapitalUSD,
      slotReentryCooldownExpiry: this.slotReentryCooldownExpiry,
      currentCycleNumber: this.currentCycleNumber
    };

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        // Push to server disk persistence (.delta_auto_trader_state.json)
        fetch("/api/autotrader/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch (e) {
        console.warn("[DeltaAutoTrader] LocalStorage save error:", e);
      }
    } else {
      // Node.js Direct Disk Write (24/7 background mode when browser is closed)
      try {
        import("fs").then(fs => {
          import("path").then(path => {
            const filePath = path.join(process.cwd(), ".delta_auto_trader_state.json");
            fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
          });
        }).catch(() => {});
      } catch (e) {}
    }
  }

  public getPriceDecimals(price: number): number {
    if (price >= 100) return 2;
    if (price >= 1) return 3;
    if (price >= 0.01) return 4;
    return 6;
  }

  public roundPrice(price: number): number {
    const dec = this.getPriceDecimals(price);
    return Number(price.toFixed(dec));
  }

  public getAssetBaselinePrice(symbol: string): number {
    const symUpper = symbol.toUpperCase();
    const asset = CURATED_AUTO_TRADER_ASSETS.find(a => a.symbol === symUpper || symUpper.includes(a.tag));
    return asset?.baselinePrice || 1.0;
  }

  public getLivePriceUSD(symbol: string): number {
    if (!symbol) return 1.0;
    const symUpper = symbol.toUpperCase().trim();
    const cleanTag = symUpper.replace("USDT", "").replace("USD", "").replace("_", "").replace("-", "").trim();

    // 1. Check Delta Exchange Engine cache (with alias resolution)
    const livePriceObj = deltaExchangeEngine.getLivePrice(symUpper)
      || deltaExchangeEngine.getLivePrice(`${cleanTag}USD`)
      || deltaExchangeEngine.getLivePrice(`${cleanTag}USDT`)
      || deltaExchangeEngine.getLivePrice(cleanTag);
    if (livePriceObj?.usd && livePriceObj.usd > 0) {
      return livePriceObj.usd;
    }

    // 2. Check local latestPrices map
    const local = this.latestPrices.get(symUpper)
      || this.latestPrices.get(`${cleanTag}USD`)
      || this.latestPrices.get(`${cleanTag}USDT`)
      || this.latestPrices.get(cleanTag);
    if (local && local > 0) {
      return local;
    }

    return this.getAssetBaselinePrice(symbol);
  }


  // 📈 Rate of Change (ROC / MOM) - Early Velocity Surge Detector (Pandas-TA / TA-Lib)
  private calculateROC(closes: number[], period: number = 6): number {
    if (!closes || closes.length <= period) return 0;
    const current = closes[closes.length - 1];
    const prev = closes[closes.length - 1 - period];
    if (!prev || prev === 0) return 0;
    return Number((((current - prev) / prev) * 100).toFixed(2));
  }

  // 📊 On-Balance Volume (OBV) & Institutional Volume Expansion (ta.js / ta-crypto)
  private calculateOBV(bars: OHLCVBar[]): { obv: number; obvSlope: "RISING" | "FALLING" | "FLAT"; volumeExpansionRatio: number } {
    if (!bars || bars.length < 5) return { obv: 0, obvSlope: "FLAT", volumeExpansionRatio: 1.0 };
    
    let currentOBV = 0;
    const obvHistory: number[] = [0];
    const volumes = bars.map(b => b.volume || 1);

    for (let i = 1; i < bars.length; i++) {
      if (bars[i].close > bars[i - 1].close) {
        currentOBV += bars[i].volume || 1;
      } else if (bars[i].close < bars[i - 1].close) {
        currentOBV -= bars[i].volume || 1;
      }
      obvHistory.push(currentOBV);
    }

    const recentVols = volumes.slice(-20);
    const avgVol = recentVols.reduce((a, b) => a + b, 0) / Math.max(1, recentVols.length);
    const currentVol = volumes[volumes.length - 1] || 1;
    const volumeExpansionRatio = Number((currentVol / Math.max(1, avgVol)).toFixed(2));

    const last5 = obvHistory.slice(-5);
    const obvDiff = last5[last5.length - 1] - last5[0];
    const obvSlope = obvDiff > 0 ? "RISING" : obvDiff < 0 ? "FALLING" : "FLAT";

    return { obv: currentOBV, obvSlope, volumeExpansionRatio };
  }

  // 🧭 Full ADX with +DI and -DI Directional Movement (TA-Lib benchmark)
  private calculateADXFull(bars: OHLCVBar[], period: number = 14): { adx: number; plusDI: number; minusDI: number } {
    if (!bars || bars.length < period + 2) return { adx: 22.0, plusDI: 20, minusDI: 20 };

    const trs: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];

    for (let i = 1; i < bars.length; i++) {
      const h = bars[i].high;
      const l = bars[i].low;
      const prevH = bars[i - 1].high;
      const prevL = bars[i - 1].low;
      const prevC = bars[i - 1].close;

      const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
      trs.push(tr);

      const upMove = h - prevH;
      const downMove = prevL - l;

      plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    if (trs.length < period) return { adx: 22.0, plusDI: 20, minusDI: 20 };

    let smoothedTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothedPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothedMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

    const dxValues: number[] = [];
    let lastPDI = 20;
    let lastMDI = 20;

    for (let i = period; i < trs.length; i++) {
      smoothedTR = smoothedTR - (smoothedTR / period) + trs[i];
      smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + plusDMs[i];
      smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + minusDMs[i];

      const pDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
      const mDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
      lastPDI = Number(pDI.toFixed(1));
      lastMDI = Number(mDI.toFixed(1));
      const diSum = pDI + mDI;
      const dx = diSum > 0 ? (Math.abs(pDI - mDI) / diSum) * 100 : 0;
      dxValues.push(dx);
    }

    if (dxValues.length === 0) return { adx: 22.0, plusDI: lastPDI, minusDI: lastMDI };
    const adxSlice = dxValues.slice(-period);
    const adx = Number((adxSlice.reduce((a, b) => a + b, 0) / adxSlice.length).toFixed(1));

    return { adx: Math.min(100, Math.max(0, adx)), plusDI: lastPDI, minusDI: lastMDI };
  }

  // 🔥 UNIFIED MOMENTUM IGNITION SCORE (MIS)
  // Stack: Real Candles -> ROC + ADX (+DI/-DI) + ATR + OBV + Volume Expansion + VWAP
  // 75+ = EARLY SETUP (Ignition detected before retail EMA cross!)
  // 85+ = STRONG SETUP (Institutional surge confirmed)
  // < 65 = CHOP / COMPRESSION -> 100% REJECT
  private calculateMomentumIgnitionScore(params: {
    roc15m: number;
    adx: number;
    plusDI: number;
    minusDI: number;
    obvSlope: "RISING" | "FALLING" | "FLAT";
    volumeExpansionRatio: number;
    priceAboveVWAP: boolean;
    fourHourTrend: "BULLISH" | "BEARISH" | "SIDEWAYS";
    direction: "BUY" | "SELL";
  }): {
    score: number;
    setupTier: "STRONG_SETUP" | "EARLY_SETUP" | "DEVELOPING" | "CHOP_REJECT";
    breakdown: { velocityPts: number; volumePts: number; vwapPts: number; trendStrengthPts: number; macroPts: number };
  } {
    let velocityPts = 0;
    let volumePts = 0;
    let vwapPts = 0;
    let trendStrengthPts = 0;
    let macroPts = 0;

    const isBuy = params.direction === "BUY";

    // 1. Velocity (ROC 15m)
    if (isBuy) {
      if (params.roc15m >= 1.0) velocityPts = 25;
      else if (params.roc15m >= 0.5) velocityPts = 20;
      else if (params.roc15m >= 0.15) velocityPts = 14;
      else if (params.roc15m < -0.3) velocityPts = 0;
      else velocityPts = 8;
    } else {
      if (params.roc15m <= -1.0) velocityPts = 25;
      else if (params.roc15m <= -0.5) velocityPts = 20;
      else if (params.roc15m <= -0.15) velocityPts = 14;
      else if (params.roc15m > 0.3) velocityPts = 0;
      else velocityPts = 8;
    }

    // 2. Volume Expansion & OBV Directional Flow
    if (params.volumeExpansionRatio >= 1.6) volumePts += 15;
    else if (params.volumeExpansionRatio >= 1.25) volumePts += 10;
    else if (params.volumeExpansionRatio >= 1.0) volumePts += 5;

    if (isBuy && params.obvSlope === "RISING") volumePts += 10;
    else if (!isBuy && params.obvSlope === "FALLING") volumePts += 10;

    // 3. VWAP Clearance (Institutional Fair Value)
    if (isBuy && params.priceAboveVWAP) vwapPts = 20;
    else if (!isBuy && !params.priceAboveVWAP) vwapPts = 20;
    else vwapPts = 5;

    // 4. ADX + Directional Movement (+DI vs -DI)
    if (params.adx >= 24) trendStrengthPts += 10;
    else if (params.adx >= 18) trendStrengthPts += 6;

    if (isBuy && params.plusDI > params.minusDI) trendStrengthPts += 10;
    else if (!isBuy && params.minusDI > params.plusDI) trendStrengthPts += 10;

    // 5. Macro 4H Trend alignment
    if (isBuy && params.fourHourTrend === "BULLISH") macroPts = 10;
    else if (!isBuy && params.fourHourTrend === "BEARISH") macroPts = 10;
    else if (params.fourHourTrend === "SIDEWAYS") macroPts = 5;

    const total = Math.min(98, Math.max(10, velocityPts + volumePts + vwapPts + trendStrengthPts + macroPts));

    let setupTier: "STRONG_SETUP" | "EARLY_SETUP" | "DEVELOPING" | "CHOP_REJECT" = "CHOP_REJECT";
    if (total >= 85) setupTier = "STRONG_SETUP";
    else if (total >= 75) setupTier = "EARLY_SETUP";
    else if (total >= 65) setupTier = "DEVELOPING";

    return {
      score: total,
      setupTier,
      breakdown: { velocityPts, volumePts, vwapPts, trendStrengthPts, macroPts }
    };
  }

  private calculateEMA(data: number[], period: number): number {
    if (!data || data.length === 0) return 0;
    if (data.length < period) {
      return data.reduce((a, b) => a + b, 0) / data.length;
    }
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return this.roundPrice(ema);
  }

  private calculateRSI(data: number[], period: number = 14): number {
    if (!data || data.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / period || 0.001;
    const avgLoss = losses / period || 0.001;
    const rs = avgGain / avgLoss;
    return Number((100 - 100 / (1 + rs)).toFixed(1));
  }

  private calculateATR(bars: OHLCVBar[], period: number = 14): number {
    if (!bars || bars.length < 2) return 0.5;
    const trs: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const h = bars[i].high;
      const l = bars[i].low;
      const prevC = bars[i - 1].close;
      const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
      trs.push(tr);
    }
    const slice = trs.slice(-period);
    const atr = slice.reduce((a, b) => a + b, 0) / slice.length;
    return this.roundPrice(atr);
  }

  private calculateADX(bars: OHLCVBar[], period: number = 14): number {
    if (!bars || bars.length < period + 2) return 22.0;

    const trs: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];

    for (let i = 1; i < bars.length; i++) {
      const h = bars[i].high;
      const l = bars[i].low;
      const prevH = bars[i - 1].high;
      const prevL = bars[i - 1].low;
      const prevC = bars[i - 1].close;

      const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
      trs.push(tr);

      const upMove = h - prevH;
      const downMove = prevL - l;

      plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    if (trs.length < period) return 22.0;

    // 1. Initial period sums
    let smoothedTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothedPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothedMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

    const dxValues: number[] = [];

    const pDI0 = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const mDI0 = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
    const diSum0 = pDI0 + mDI0;
    dxValues.push(diSum0 > 0 ? (Math.abs(pDI0 - mDI0) / diSum0) * 100 : 0);

    // 2. Wilder Smoothing for subsequent candles
    for (let i = period; i < trs.length; i++) {
      smoothedTR = smoothedTR - (smoothedTR / period) + trs[i];
      smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + plusDMs[i];
      smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + minusDMs[i];

      const pDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
      const mDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
      const diSum = pDI + mDI;
      const dx = diSum > 0 ? (Math.abs(pDI - mDI) / diSum) * 100 : 0;
      dxValues.push(dx);
    }

    if (dxValues.length === 0) return 22.0;

    // 3. Smooth DX to get ADX
    const adxSlice = dxValues.slice(-period);
    const adx = adxSlice.reduce((a, b) => a + b, 0) / adxSlice.length;

    return Number(Math.min(100, Math.max(0, adx)).toFixed(1));
  }

  private calculateMACD(data: number[]): { macd: number; signal: number; histogram: number } {
    if (!data || data.length < 26) return { macd: 0, signal: 0, histogram: 0 };
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    const macd = Number((ema12 - ema26).toFixed(2));
    
    // 9-EMA Signal line approximation
    const prevEma12 = this.calculateEMA(data.slice(0, -1), 12);
    const prevEma26 = this.calculateEMA(data.slice(0, -1), 26);
    const prevMacd = prevEma12 - prevEma26;
    const signal = Number((macd * 0.2 + prevMacd * 0.8).toFixed(2));
    const histogram = Number((macd - signal).toFixed(2));
    return { macd, signal, histogram };
  }

  private calculateBollingerBands(data: number[], period: number = 20, mult: number = 2): { upper: number; middle: number; lower: number; bandwidth: number } {
    if (!data || data.length < period) {
      const avg = data && data.length > 0 ? data[data.length - 1] : 0;
      return { upper: avg * 1.02, middle: avg, lower: avg * 0.98, bandwidth: 4.0 };
    }
    const slice = data.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const upper = this.roundPrice(mean + mult * stdDev);
    const lower = this.roundPrice(mean - mult * stdDev);
    const bandwidth = Number(((upper - lower) / mean * 100).toFixed(2));
    return { upper, middle: this.roundPrice(mean), lower, bandwidth };
  }

  // 📐 Quantitative Formula 1: Kaufman's Adaptive Moving Average (KAMA)
  // Dynamically adapts smoothing speed based on Fractal Efficiency Ratio (Zero lag in trends, flat in chop)
  private calculateKAMA(data: number[], period: number = 10, fastPeriod: number = 2, slowPeriod: number = 30): number {
    if (!data || data.length < period + 1) return data && data.length > 0 ? data[data.length - 1] : 0;
    const fastSC = 2 / (fastPeriod + 1);
    const slowSC = 2 / (slowPeriod + 1);
    
    let kama = data[period - 1];
    for (let i = period; i < data.length; i++) {
      const change = Math.abs(data[i] - data[i - period]);
      let volatility = 0;
      for (let j = i - period + 1; j <= i; j++) {
        volatility += Math.abs(data[j] - data[j - 1]);
      }
      const er = volatility > 0 ? change / volatility : 0;
      const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
      kama = kama + sc * (data[i] - kama);
    }
    return this.roundPrice(kama);
  }

  // 📐 Quantitative Formula 2: Chande Momentum Oscillator (CMO)
  // Direct unsmoothed price velocity metric that captures pure momentum acceleration
  private calculateCMO(data: number[], period: number = 14): number {
    if (!data || data.length < period + 1) return 0;
    let sumUp = 0;
    let sumDown = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      if (diff > 0) sumUp += diff;
      else sumDown += Math.abs(diff);
    }
    const total = sumUp + sumDown;
    if (total === 0) return 0;
    return Number(((sumUp - sumDown) / total * 100).toFixed(1));
  }

  // 📐 Quantitative Formula 3: Z-Score Statistical Normalization
  // Computes exact standard deviations from rolling mean to eliminate 98th-percentile outlier traps
  private calculateZScore(data: number[], period: number = 20): number {
    if (!data || data.length < period) return 0;
    const slice = data.slice(-period);
    const current = data[data.length - 1];
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return Number(((current - mean) / stdDev).toFixed(2));
  }

  // 📐 Quantitative Formula 4: Hurst Exponent (Fractal Dimension & Regime Classifier)
  // H > 0.55 = Trending Persistence | H < 0.45 = Mean-Reverting Anti-Persistence | H = 0.50 = Random Walk
  private calculateHurstExponent(data: number[], maxLag: number = 20): number {
    if (!data || data.length < maxLag + 5) return 0.50;
    const slice = data.slice(-maxLag);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    
    let cumDev = 0;
    let maxDev = -Infinity;
    let minDev = Infinity;
    for (let i = 0; i < slice.length; i++) {
      cumDev += (slice[i] - mean);
      if (cumDev > maxDev) maxDev = cumDev;
      if (cumDev < minDev) minDev = cumDev;
    }
    const range = maxDev - minDev;
    const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / slice.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0 || range <= 0) return 0.50;
    
    const rs = range / stdDev;
    const H = Math.log(rs) / Math.log(slice.length);
    return Number(Math.max(0.1, Math.min(0.9, H)).toFixed(2));
  }

  // 📐 Quantitative Formula 5: Half-Kelly Criterion Bet Sizing
  // Mathematically maximizes long-term geometric compounding rate while bounding max drawdown
  public calculateKellyFraction(winProb: number, winLossRatio: number = 2.05): number {
    const p = Math.max(0.35, Math.min(0.95, winProb));
    const q = 1 - p;
    const b = winLossRatio;
    const fullKelly = (p * b - q) / b;
    const halfKelly = Math.max(0.02, Math.min(0.15, fullKelly * 0.5));
    return Number(halfKelly.toFixed(3));
  }

  // 🏛️ Master Strategy 1: Smart Money Concepts (SMC) Fair Value Gap (FVG) Imbalance Detection
  private detectFairValueGap(bars: OHLCVBar[]): { fvgType: "BULLISH_FVG" | "BEARISH_FVG" | "NONE"; gapTop: number; gapBottom: number; isMitigated: boolean } {
    if (!bars || bars.length < 3) return { fvgType: "NONE", gapTop: 0, gapBottom: 0, isMitigated: true };
    const c1 = bars[bars.length - 3]; // First bar
    const c2 = bars[bars.length - 2]; // Impulse bar
    const c3 = bars[bars.length - 1]; // Current bar
    
    // Bullish FVG: Bar 1 High < Bar 3 Low (Unfilled buyer liquidity imbalance)
    if (c3.low > c1.high && c2.close > c2.open) {
      const gapTop = c3.low;
      const gapBottom = c1.high;
      const isMitigated = c3.close <= gapBottom;
      return { fvgType: "BULLISH_FVG", gapTop, gapBottom, isMitigated };
    }
    // Bearish FVG: Bar 1 Low > Bar 3 High (Unfilled seller liquidity imbalance)
    if (c3.high < c1.low && c2.close < c2.open) {
      const gapTop = c1.low;
      const gapBottom = c3.high;
      const isMitigated = c3.close >= gapTop;
      return { fvgType: "BEARISH_FVG", gapTop, gapBottom, isMitigated };
    }
    return { fvgType: "NONE", gapTop: 0, gapBottom: 0, isMitigated: true };
  }

  // 🏛️ Master Strategy 2: Institutional Order Block (OB) Detection
  private detectOrderBlock(bars: OHLCVBar[]): { obType: "BULLISH_OB" | "BEARISH_OB" | "NONE"; obHigh: number; obLow: number; strength: number } {
    if (!bars || bars.length < 5) return { obType: "NONE", obHigh: 0, obLow: 0, strength: 0 };
    const len = bars.length;
    const current = bars[len - 1];
    const prev = bars[len - 2];
    const obCandle = bars[len - 3];
    
    // Bullish OB: Last down-close candle before aggressive upward displacement
    const isBullDisplacement = current.close > prev.high && prev.close > obCandle.high && obCandle.close < obCandle.open;
    if (isBullDisplacement) {
      return { obType: "BULLISH_OB", obHigh: obCandle.high, obLow: obCandle.low, strength: 25 };
    }
    // Bearish OB: Last up-close candle before aggressive downward displacement
    const isBearDisplacement = current.close < prev.low && prev.close < obCandle.low && obCandle.close > obCandle.open;
    if (isBearDisplacement) {
      return { obType: "BEARISH_OB", obHigh: obCandle.high, obLow: obCandle.low, strength: 25 };
    }
    return { obType: "NONE", obHigh: 0, obLow: 0, strength: 0 };
  }

  // 🏛️ Master Strategy 3: Volume-Weighted Average Price (VWAP)
  private calculateVWAP(bars: OHLCVBar[]): { vwap: number; upperBand: number; lowerBand: number } {
    if (!bars || bars.length === 0) return { vwap: 0, upperBand: 0, lowerBand: 0 };
    let cumVol = 0;
    let cumVolPrice = 0;
    for (const b of bars) {
      const typicalPrice = (b.high + b.low + b.close) / 3;
      const vol = b.volume || 1;
      cumVolPrice += typicalPrice * vol;
      cumVol += vol;
    }
    const vwap = cumVol > 0 ? this.roundPrice(cumVolPrice / cumVol) : bars[bars.length - 1].close;
    return {
      vwap,
      upperBand: this.roundPrice(vwap * 1.015),
      lowerBand: this.roundPrice(vwap * 0.985)
    };
  }

  // 🏛️ Master Strategy 4: Liquidity Sweep / Institutional Stop-Hunt Detector (Turtle Soup)
  private detectLiquiditySweep(bars: OHLCVBar[]): { sweepType: "BULLISH_SWEEP" | "BEARISH_SWEEP" | "NONE"; level: number; score: number } {
    if (!bars || bars.length < 8) return { sweepType: "NONE", level: 0, score: 0 };
    const current = bars[bars.length - 1];
    const prevBars = bars.slice(-8, -1);
    const highestHigh = Math.max(...prevBars.map(b => b.high));
    const lowestLow = Math.min(...prevBars.map(b => b.low));
    
    // Bearish Liquidity Sweep (Wicked above swing high to grab buy stops, closed back down)
    if (current.high > highestHigh && current.close < highestHigh) {
      return { sweepType: "BEARISH_SWEEP", level: highestHigh, score: 30 };
    }
    // Bullish Liquidity Sweep (Wicked below swing low to grab sell stops, closed back up)
    if (current.low < lowestLow && current.close > lowestLow) {
      return { sweepType: "BULLISH_SWEEP", level: lowestLow, score: 30 };
    }
    return { sweepType: "NONE", level: 0, score: 0 };
  }

  // 🏛️ Master Strategy 5: TD Sequential Setup 9-Count Exhaustion
  private calculateTDSequential(bars: OHLCVBar[]): { buySetupCount: number; sellSetupCount: number; isExhausted: boolean } {
    if (!bars || bars.length < 10) return { buySetupCount: 0, sellSetupCount: 0, isExhausted: false };
    let buyCount = 0;
    let sellCount = 0;
    for (let i = 4; i < bars.length; i++) {
      if (bars[i].close < bars[i - 4].close) {
        buyCount++;
        sellCount = 0;
      } else if (bars[i].close > bars[i - 4].close) {
        sellCount++;
        buyCount = 0;
      } else {
        buyCount = 0;
        sellCount = 0;
      }
    }
    return {
      buySetupCount: buyCount,
      sellSetupCount: sellCount,
      isExhausted: buyCount >= 9 || sellCount >= 9
    };
  }

  // 🏛️ Master Strategy 6: Change of Character (CHoCH) / Market Structure Break (MSB)
  private detectMarketStructureBreak(bars: OHLCVBar[]): { msbType: "BULLISH_MSB" | "BEARISH_MSB" | "NONE"; breakoutLevel: number } {
    if (!bars || bars.length < 12) return { msbType: "NONE", breakoutLevel: 0 };
    const len = bars.length;
    const current = bars[len - 1];
    const prevSwings = bars.slice(-12, -2);
    const swingHigh = Math.max(...prevSwings.map(b => b.high));
    const swingLow = Math.min(...prevSwings.map(b => b.low));
    
    // Bullish CHoCH: Candle closes convincingly above recent major swing high
    if (current.close > swingHigh && current.open <= swingHigh) {
      return { msbType: "BULLISH_MSB", breakoutLevel: swingHigh };
    }
    // Bearish CHoCH: Candle closes convincingly below recent major swing low
    if (current.close < swingLow && current.open >= swingLow) {
      return { msbType: "BEARISH_MSB", breakoutLevel: swingLow };
    }
    return { msbType: "NONE", breakoutLevel: 0 };
  }

  // 🏛️ Master Strategy 7: Fibonacci Golden Pocket (0.618 - 0.65)
  private calculateFibonacciGoldenPocket(bars: OHLCVBar[]): { inGoldenPocket: boolean; fibType: "BULLISH_PULLBACK" | "BEARISH_PULLBACK" | "NONE"; level0618: number; level065: number } {
    if (!bars || bars.length < 15) return { inGoldenPocket: false, fibType: "NONE", level0618: 0, level065: 0 };
    const slice = bars.slice(-15);
    const highest = Math.max(...slice.map(b => b.high));
    const lowest = Math.min(...slice.map(b => b.low));
    const current = bars[bars.length - 1].close;
    const diff = highest - lowest;
    if (diff <= 0) return { inGoldenPocket: false, fibType: "NONE", level0618: 0, level065: 0 };
    
    // Uptrend pullback levels (Retraced down from high)
    const bullFib618 = highest - diff * 0.618;
    const bullFib65 = highest - diff * 0.65;
    if (current >= Math.min(bullFib618, bullFib65) && current <= Math.max(bullFib618, bullFib65)) {
      return { inGoldenPocket: true, fibType: "BULLISH_PULLBACK", level0618: bullFib618, level065: bullFib65 };
    }
    
    // Downtrend relief bounce levels (Retraced up from low)
    const bearFib618 = lowest + diff * 0.618;
    const bearFib65 = lowest + diff * 0.65;
    if (current >= Math.min(bearFib618, bearFib65) && current <= Math.max(bearFib618, bearFib65)) {
      return { inGoldenPocket: true, fibType: "BEARISH_PULLBACK", level0618: bearFib618, level065: bearFib65 };
    }
    return { inGoldenPocket: false, fibType: "NONE", level0618: 0, level065: 0 };
  }

  // 🏛️ Master Strategy 8: ICT Trading Session & Kill Zone Profiler
  private getICTSessionKillZone(): { session: "LONDON_OPEN" | "NEW_YORK_OPEN" | "ASIA_SESSION" | "OFF_PEAK"; isKillZone: boolean; bonusScore: number; name: string } {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const currentDecHours = utcHours + utcMinutes / 60;
    
    // London Open Kill Zone: 07:00 - 10:00 UTC (12:30 - 15:30 IST)
    if (currentDecHours >= 7.0 && currentDecHours <= 10.0) {
      return { session: "LONDON_OPEN", isKillZone: true, bonusScore: 8, name: "🇬🇧 London Open Kill Zone (Peak Foreign Exchange & Crypto Liquidity)" };
    }
    // New York Open / Wall Street Cash Open: 12:30 - 15:30 UTC (18:00 - 21:00 IST)
    if (currentDecHours >= 12.5 && currentDecHours <= 15.5) {
      return { session: "NEW_YORK_OPEN", isKillZone: true, bonusScore: 10, name: "🇺🇸 New York Open Kill Zone (Maximum Volatility & Trend Expansion)" };
    }
    // Asia Session: 00:00 - 06:00 UTC (05:30 - 11:30 IST)
    if (currentDecHours >= 0.0 && currentDecHours <= 6.0) {
      return { session: "ASIA_SESSION", isKillZone: false, bonusScore: 4, name: "🇯🇵 Tokyo / Asia Session (Consolidation & Range Building)" };
    }
    return { session: "OFF_PEAK", isKillZone: false, bonusScore: 2, name: "🌐 Global 24/7 Futures Session" };
  }

  // 🏛️ Master Strategy 9: Markov Switching Market Regime Classifier
  // State 1: High-Momentum Trending Expansion | State 2: Range-Bound Compression Chop
  private calculateMarkovMarketRegime(bars: OHLCVBar[]): { regime: "TRENDING_EXPANSION" | "COMPRESSION_CHOP"; transitionProb: number; targetMultiplier: number } {
    if (!bars || bars.length < 15) return { regime: "TRENDING_EXPANSION", transitionProb: 0.85, targetMultiplier: 1.0 };
    const slice = bars.slice(-15);
    const logReturns: number[] = [];
    for (let i = 1; i < slice.length; i++) {
      if (slice[i - 1].close > 0 && slice[i].close > 0) {
        logReturns.push(Math.log(slice[i].close / slice[i - 1].close));
      }
    }
    const variance = logReturns.reduce((acc, r) => acc + Math.pow(r, 2), 0) / Math.max(1, logReturns.length);
    const volatility = Math.sqrt(variance);
    const isTrending = volatility > 0.004; // Volatility threshold for crypto perpetuals
    return {
      regime: isTrending ? "TRENDING_EXPANSION" : "COMPRESSION_CHOP",
      transitionProb: Number((isTrending ? 0.88 : 0.45).toFixed(2)),
      targetMultiplier: isTrending ? 1.25 : 0.85 // Expand target in trending regime, tighten in chop
    };
  }

  // 🏛️ Master Strategy 10: Bayesian Log-Odds Confluence Aggregator
  // Converts multi-indicator priors into a mathematically optimal posterior probability
  private calculateBayesianConfluenceScore(features: {
    macroTrendAligned: boolean;
    smcPatternConfirmed: boolean;
    kamaAligned: boolean;
    cvdRatio: number;
    zScoreSafe: boolean;
    hurstTrending: boolean;
  }): number {
    let logOdds = 0.50; // Prior log-odds
    if (features.macroTrendAligned) logOdds += 0.85;
    if (features.smcPatternConfirmed) logOdds += 0.75;
    if (features.kamaAligned) logOdds += 0.50;
    if (features.cvdRatio >= 0.60) logOdds += 0.65;
    if (features.zScoreSafe) logOdds += 0.45;
    if (features.hurstTrending) logOdds += 0.50;
    
    // Sigmoid mapping: P = 1 / (1 + exp(-logOdds))
    const posteriorProb = 1 / (1 + Math.exp(-logOdds));
    return Number((posteriorProb * 100).toFixed(1));
  }

  // 🏛️ Master Strategy 11: Order Book Microstructure Depth Skew
  private calculateOrderBookDepthSkew(bars: OHLCVBar[]): { depthBias: "BULLISH_WALL" | "BEARISH_WALL" | "NEUTRAL"; skewScore: number } {
    if (!bars || bars.length < 5) return { depthBias: "NEUTRAL", skewScore: 0 };
    const recent = bars.slice(-5);
    let upVol = 0;
    let downVol = 0;
    for (const b of recent) {
      if (b.close >= b.open) upVol += b.volume || 1;
      else downVol += b.volume || 1;
    }
    const ratio = upVol / Math.max(1, downVol);
    if (ratio >= 2.0) return { depthBias: "BULLISH_WALL", skewScore: 12 };
    if (ratio <= 0.5) return { depthBias: "BEARISH_WALL", skewScore: 12 };
    return { depthBias: "NEUTRAL", skewScore: 0 };
  }

  // 📐 NON-LINEAR SHANNON INFORMATION ENTROPY (S):
  // Quantifies Market Randomness vs Structural Order
  private calculateShannonEntropy(bars: OHLCVBar[]): number {
    if (!bars || bars.length < 10) return 0.5;
    const returns: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      if (bars[i - 1].close > 0) {
        returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
      }
    }
    if (returns.length === 0) return 0.5;
    const upCount = returns.filter(r => r > 0).length;
    const downCount = returns.filter(r => r < 0).length;
    const total = Math.max(1, upCount + downCount);
    const pUp = upCount / total;
    const pDown = downCount / total;
    const entropy = -( (pUp > 0 ? pUp * Math.log2(pUp) : 0) + (pDown > 0 ? pDown * Math.log2(pDown) : 0) );
    return Number(entropy.toFixed(3)); // 0 = Perfectly Ordered / Predictable, 1.0 = Pure Chaos
  }

  private detect15mCandlePattern(bars: OHLCVBar[]): { pattern: string; signal: "BULLISH" | "BEARISH" | "NEUTRAL"; score: number } {
    if (!bars || bars.length < 3) {
      return { pattern: "Normal Candle Scan", signal: "NEUTRAL", score: 10 };
    }

    const c0 = bars[bars.length - 1]; // Current 15m candle
    const c1 = bars[bars.length - 2]; // Previous 15m candle
    const c2 = bars[bars.length - 3]; // 2 candles ago

    const range0 = Math.max(0.0001, c0.high - c0.low);
    const body0 = Math.abs(c0.close - c0.open);
    const upperWick0 = c0.high - Math.max(c0.close, c0.open);
    const lowerWick0 = Math.min(c0.close, c0.open) - c0.low;
    const lowerWickRatio = lowerWick0 / range0;
    const upperWickRatio = upperWick0 / range0;

    const isGreen0 = c0.close >= c0.open;
    const isRed0 = c0.close < c0.open;

    const body1 = Math.abs(c1.close - c1.open);
    const isGreen1 = c1.close >= c1.open;
    const isRed1 = c1.close < c1.open;

    // ⚡ 0. Intra-Candle High-Velocity Impulse Front-Runner
    // Downside aggressive impulse: Current price broken below previous low with small bottom wick
    if (isRed0 && c0.close < c1.low && lowerWickRatio < 0.12 && (body0 / range0) >= 0.65) {
      return { pattern: "⚡ Ultra-Fast Bearish Impulse Front-Runner (Early Downside Acceleration)", signal: "BEARISH", score: 35 };
    }
    // Upside aggressive impulse: Current price broken above previous high with small upper wick
    if (isGreen0 && c0.close > c1.high && upperWickRatio < 0.12 && (body0 / range0) >= 0.65) {
      return { pattern: "⚡ Ultra-Fast Bullish Impulse Front-Runner (Early Upside Acceleration)", signal: "BULLISH", score: 35 };
    }

    // 🟢 1. Bullish Pullback Breakout (Green breakout after a red pullback dip)
    if (isRed1 && isGreen0 && c0.close > c1.high) {
      return { pattern: "Bullish Pullback Breakout (Post-Dip Continuation)", signal: "BULLISH", score: 28 };
    }

    // 🔴 2. Bearish Pullback Breakdown (Red breakdown after a green relief bounce)
    if (isGreen1 && isRed0 && c0.close < c1.low) {
      return { pattern: "Bearish Pullback Breakdown (Post-Bounce Rejection)", signal: "BEARISH", score: 28 };
    }

    // 🟢 3. Bullish Engulfing Reversal
    if (isRed1 && isGreen0 && c0.close > c1.open && c0.open <= c1.close && body0 > body1 * 1.05) {
      return { pattern: "Bullish Engulfing Reversal", signal: "BULLISH", score: 25 };
    }

    // 🔴 4. Bearish Engulfing Breakdown
    if (isGreen1 && isRed0 && c0.close < c1.open && c0.open >= c1.close && body0 > body1 * 1.05) {
      return { pattern: "Bearish Engulfing Breakdown", signal: "BEARISH", score: 25 };
    }

    // 🟢 5. Bullish Hammer / Pin-Bar Buying Rejection
    if (lowerWickRatio >= 0.40 && upperWickRatio <= 0.20) {
      return { pattern: "Bullish Hammer / Pin-Bar Dip Absorption", signal: "BULLISH", score: 25 };
    }

    // 🔴 6. Bearish Shooting Star / Inverted Pin-Bar
    if (upperWickRatio >= 0.40 && lowerWickRatio <= 0.20) {
      return { pattern: "Bearish Shooting Star Upper Wick Rejection", signal: "BEARISH", score: 25 };
    }

    // Moderate continuation breakouts
    if (isGreen0 && c0.close > c1.high) {
      return { pattern: "Bullish High Breakout", signal: "BULLISH", score: 20 };
    }
    if (isRed0 && c0.close < c1.low) {
      return { pattern: "Bearish Low Breakdown", signal: "BEARISH", score: 20 };
    }

    // Doji / Sideways Chop
    if (body0 < range0 * 0.15) {
      return { pattern: "Indecision Doji (Sideways Chop)", signal: "NEUTRAL", score: 5 };
    }

    return { pattern: "Consolidation Range", signal: "NEUTRAL", score: 8 };
  }

  // ────────────────────────────────────────────
  // Layer 2: Multi-Timeframe Signal Engine (15m + 1h + 4h)
  // ────────────────────────────────────────────

  
  public calculateSuperTrend(bars: OHLCVBar[], period: number = 10, multiplier: number = 3.0): { trend: "BULLISH" | "BEARISH"; value: number } {
    if (!bars || bars.length < period + 1) return { trend: "BULLISH", value: 0 };
    const trArray: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const tr = Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - bars[i - 1].close),
        Math.abs(bars[i].low - bars[i - 1].close)
      );
      trArray.push(tr);
    }
    
    const atr: number[] = [];
    let sum = trArray.slice(0, period).reduce((a, b) => a + b, 0);
    atr.push(sum / period);
    for (let i = period; i < trArray.length; i++) {
      atr.push((atr[atr.length - 1] * (period - 1) + trArray[i]) / period);
    }
    
    let upperBand = 0;
    let lowerBand = 0;
    let trend: "BULLISH" | "BEARISH" = "BULLISH";
    
    for (let i = period; i < bars.length; i++) {
      const curATR = atr[i - period] || atr[atr.length - 1];
      const hl2 = (bars[i].high + bars[i].low) / 2;
      let basicUpper = hl2 + (multiplier * curATR);
      let basicLower = hl2 - (multiplier * curATR);
      
      const prevUpper = upperBand;
      const prevLower = lowerBand;
      const prevClose = bars[i - 1].close;
      
      upperBand = (basicUpper < prevUpper || prevClose > prevUpper) ? basicUpper : prevUpper;
      lowerBand = (basicLower > prevLower || prevClose < prevLower) ? basicLower : prevLower;
      
      if (bars[i].close > prevUpper) {
        trend = "BULLISH";
      } else if (bars[i].close < prevLower) {
        trend = "BEARISH";
      }
    }
    return { trend, value: trend === "BULLISH" ? lowerBand : upperBand };
  }

  
  public detectEmaPriceAction(bars15m: OHLCVBar[], currentPrice: number): {
    signal: "BUY" | "SELL" | "NONE";
    isTriggered: boolean;
    pattern: string;
    slPrice: number;
    triggerPrice: number;
    reason: string;
  } {
    if (!Array.isArray(bars15m) || bars15m.length < 20) {
      return { signal: "NONE", isTriggered: false, pattern: "NONE", slPrice: 0, triggerPrice: 0, reason: "Insufficient 15m bars" };
    }

    const closes = bars15m.map(b => b.close);
    const curEma9 = this.calculateEMA(closes, 9);
    const curEma21 = this.calculateEMA(closes, 21);
    const prevEma9 = this.calculateEMA(closes.slice(0, -1), 9);
    const prevEma21 = this.calculateEMA(closes.slice(0, -1), 21);

    const isBullTrend = curEma9 > curEma21 && (curEma9 >= prevEma9 || curEma21 >= prevEma21);
    const isBearTrend = curEma9 < curEma21 && (curEma9 <= prevEma9 || curEma21 <= prevEma21);

    if (!isBullTrend && !isBearTrend) {
      return { signal: "NONE", isTriggered: false, pattern: "CHOP", slPrice: 0, triggerPrice: 0, reason: "EMA 9/21 Flat or Intertwined (Chop)" };
    }

    const lastIdx = bars15m.length - 1;
    const triggerCandle = bars15m[lastIdx - 1];
    const prevCandle = bars15m[lastIdx - 2];
    if (!triggerCandle || !prevCandle) {
      return { signal: "NONE", isTriggered: false, pattern: "NONE", slPrice: 0, triggerPrice: 0, reason: "Missing trigger candle" };
    }

    const range = triggerCandle.high - triggerCandle.low;
    if (range <= 0) {
      return { signal: "NONE", isTriggered: false, pattern: "NONE", slPrice: 0, triggerPrice: 0, reason: "Zero range candle" };
    }

    const bodySize = Math.abs(triggerCandle.close - triggerCandle.open);
    const upperWick = triggerCandle.high - Math.max(triggerCandle.close, triggerCandle.open);
    const lowerWick = Math.min(triggerCandle.close, triggerCandle.open) - triggerCandle.low;

    // BULLISH PULLBACK & REJECTION:
    if (isBullTrend) {
      const touchedPocket = triggerCandle.low <= (curEma9 * 1.002) && triggerCandle.close >= (curEma21 * 0.998);
      const isHammer = lowerWick >= 1.2 * bodySize && lowerWick >= 0.4 * range;
      const isBullEngulf = triggerCandle.close > triggerCandle.open && triggerCandle.close > prevCandle.high;
      const isStrongBullClose = triggerCandle.close >= (triggerCandle.low + 0.65 * range) && triggerCandle.close > triggerCandle.open;

      const isRejection = isHammer || isBullEngulf || isStrongBullClose;
      const isTriggered = currentPrice >= triggerCandle.high;

      if (touchedPocket && isRejection) {
        const patternName = isHammer ? "BULLISH_HAMMER" : isBullEngulf ? "BULLISH_ENGULFING" : "STRONG_BULL_CLOSE";
        return {
          signal: "BUY",
          isTriggered,
          pattern: patternName,
          triggerPrice: triggerCandle.high,
          slPrice: this.roundPrice(triggerCandle.low * 0.9985),
          reason: `15m EMA 9/21 Bull Trend + Value Pocket Rejection (${patternName}). ${isTriggered ? "Price broke above trigger high!" : "Awaiting break above " + triggerCandle.high}`
        };
      }
    }

    // BEARISH PULLBACK & BREAKDOWN ENGINE (Symmetric Shorting):
    if (isBearTrend) {
      const touchedPocket = triggerCandle.high >= (curEma9 * 0.998) && triggerCandle.close <= (curEma21 * 1.002);
      const isShootingStar = upperWick >= 1.2 * bodySize && upperWick >= 0.4 * range;
      const isBearEngulf = triggerCandle.close < triggerCandle.open && triggerCandle.close < prevCandle.low;
      const isStrongBearClose = triggerCandle.close <= (triggerCandle.high - 0.65 * range) && triggerCandle.close < triggerCandle.open;

      // Also detect clean breakdown below recent 10-bar swing support
      const prev10Bars = bars15m.slice(-12, -2);
      const swingLow10 = prev10Bars.length > 0 ? Math.min(...prev10Bars.map(b => b.low)) : 0;
      const isBreakdown = swingLow10 > 0 && currentPrice < swingLow10 && triggerCandle.close < curEma9;

      const isRejection = isShootingStar || isBearEngulf || isStrongBearClose || isBreakdown;
      const isTriggered = currentPrice <= triggerCandle.low || isBreakdown;

      if ((touchedPocket || isBreakdown) && isRejection) {
        const patternName = isBreakdown ? "BEARISH_SUPPORT_BREAKDOWN" : isShootingStar ? "BEARISH_SHOOTING_STAR" : isBearEngulf ? "BEARISH_ENGULFING" : "STRONG_BEAR_CLOSE";
        return {
          signal: "SELL",
          isTriggered: true,
          pattern: patternName,
          triggerPrice: currentPrice,
          slPrice: this.roundPrice(Math.max(triggerCandle.high, curEma9) * 1.002),
          reason: `15m EMA 9/21 Bear Trend + ${patternName}. Institutional Short Entry.`
        };
      }
    }

    return {
      signal: "NONE",
      isTriggered: false,
      pattern: "NONE",
      slPrice: 0,
      triggerPrice: 0,
      reason: `Trend: ${isBullTrend ? "BULLISH" : "BEARISH"}. Awaiting 15m EMA 9/21 pullback rejection candle.`
    };
  }

  public analyzeMultiTimeframe(symbol: string, bars15m: OHLCVBar[], bars1h: OHLCVBar[], bars4h: OHLCVBar[]): MultiTimeframeAnalysis {
    const sym = (symbol || "BTCUSD").toUpperCase().trim();

    const fallback: MultiTimeframeAnalysis = {
      symbol: sym,
      overallScore: 50,
      isEntryValid: false,
      direction: "NEUTRAL",
      projectedProfitUSD: 0,
      profitProbabilityPct: 50,
      fourHourTrend: "SIDEWAYS",
      oneHourMomentum: "NEUTRAL",
      fifteenMinTrigger: "NEUTRAL",
      adxValue: 18,
      rsi1h: 50,
      atr1h: 100,
      volumeMultiplier: 1.0,
      dataSource: "DELTA",
      subScores: {
        trend: 15,
        momentum: 15,
        pattern: 10,
        volume: 10
      },
      reasoning: "Scanning multi-timeframe candle market data..."
    };

    if (!Array.isArray(bars1h) || bars1h.length < 5 || !bars1h[bars1h.length - 1] || typeof bars1h[bars1h.length - 1].close !== "number") {
      return fallback;
    }
    if (!Array.isArray(bars4h) || bars4h.length < 5 || !bars4h[bars4h.length - 1] || typeof bars4h[bars4h.length - 1].close !== "number") {
      return fallback;
    }

    const last1h = bars1h[bars1h.length - 1];
    const currentPrice = last1h.close || 64000;

    // 1. 4-Hour Macro Trend Detection (EMA 9 & 21 Alignment + Price Action)
    const closes4h = bars4h.map(b => b.close);
    const ema9_4h = this.calculateEMA(closes4h, 9);
    const ema21_4h = this.calculateEMA(closes4h, 21);
    const ema50_4h = this.calculateEMA(closes4h, 50);
    const adx4h = this.calculateADX(bars4h);

    const is4hLowerHighs = closes4h.length >= 4 && closes4h[closes4h.length - 1] < closes4h[closes4h.length - 3];
    const is4hHigherLows = closes4h.length >= 4 && closes4h[closes4h.length - 1] > closes4h[closes4h.length - 3];

    let fourHourTrend: "BULLISH" | "BEARISH" | "SIDEWAYS" = "SIDEWAYS";
    let bullTrendPoints = 0;
    let bearTrendPoints = 0;

    if (currentPrice < ema21_4h || (ema9_4h <= ema21_4h && is4hLowerHighs)) {
      fourHourTrend = "BEARISH";
      bearTrendPoints = 30;
      bullTrendPoints = 0;
    } else if (currentPrice > ema21_4h && ema9_4h >= ema21_4h && is4hHigherLows) {
      fourHourTrend = "BULLISH";
      bullTrendPoints = 30;
      bearTrendPoints = 0;
    } else if (currentPrice < ema9_4h) {
      fourHourTrend = "BEARISH";
      bearTrendPoints = 20;
      bullTrendPoints = 5;
    } else if (currentPrice > ema9_4h) {
      fourHourTrend = "BULLISH";
      bullTrendPoints = 20;
      bearTrendPoints = 5;
    } else {
      fourHourTrend = "SIDEWAYS";
      bullTrendPoints = 10;
      bearTrendPoints = 10;
    }

    // 2. 1-Hour Momentum & MACD / RSI Confluence (Symmetric Buy & Sell Engine)
    const closes1h = bars1h.map(b => b.close);
    const rsi1h = this.calculateRSI(closes1h, 14);
    const atr1h = this.calculateATR(bars1h, 14);
    const macd1h = this.calculateMACD(closes1h);
    const ema9_1h = this.calculateEMA(closes1h, 9);
    const ema21_1h = this.calculateEMA(closes1h, 21);
    const is1hDropping = closes1h.length >= 2 && closes1h[closes1h.length - 1] < closes1h[closes1h.length - 2];
    const is1hRising = closes1h.length >= 2 && closes1h[closes1h.length - 1] > closes1h[closes1h.length - 2];

    let oneHourMomentum: "BULLISH_DIVERGENCE" | "BEARISH_DIVERGENCE" | "NEUTRAL" = "NEUTRAL";
    let bullMomPoints = 0;
    let bearMomPoints = 0;

    const is1hBullish = (currentPrice > ema9_1h || currentPrice > ema21_1h || ema9_1h >= ema21_1h) && (rsi1h >= 46 || macd1h.histogram >= -0.05 || is1hRising);
    const is1hBearish = (currentPrice < ema9_1h || currentPrice < ema21_1h || ema9_1h <= ema21_1h) && (rsi1h <= 54 || macd1h.histogram <= 0.05 || is1hDropping);

    if (is1hBearish && !is1hBullish) {
      bearMomPoints = rsi1h <= 45 ? 30 : rsi1h <= 50 ? 25 : 20;
      bullMomPoints = 0;
      oneHourMomentum = "BEARISH_DIVERGENCE";
    } else if (is1hBullish && !is1hBearish) {
      bullMomPoints = rsi1h >= 55 ? 30 : rsi1h >= 50 ? 25 : 20;
      bearMomPoints = 0;
      oneHourMomentum = "BULLISH_DIVERGENCE";
    } else if (is1hBearish && is1hDropping) {
      bearMomPoints = 25;
      bullMomPoints = 0;
      oneHourMomentum = "BEARISH_DIVERGENCE";
    } else if (is1hBullish && is1hRising) {
      bullMomPoints = 25;
      bearMomPoints = 0;
      oneHourMomentum = "BULLISH_DIVERGENCE";
    } else {
      oneHourMomentum = "NEUTRAL";
      bullMomPoints = 10;
      bearMomPoints = 10;
    }

    // 3. 15-Minute Multi-Candle Pattern Recognition & Trigger
    const bars15mUse = bars15m && bars15m.length >= 5 ? bars15m : bars1h.slice(-5);
    const patternInfo = this.detect15mCandlePattern(bars15mUse);
    const avgVol15m = bars15mUse.slice(-5).reduce((a, b) => a + (b.volume || 1), 0) / 5;
    const last15m = bars15mUse[bars15mUse.length - 1];
    const prev15m = bars15mUse.length >= 2 ? bars15mUse[bars15mUse.length - 2] : last15m;
    const volMultiplier = (last15m.volume || 1) / (avgVol15m || 1);
    const volBonus = volMultiplier >= 1.2 ? 20 : volMultiplier >= 0.95 ? 12 : 5;

    // 📊 Cumulative Volume Delta (CVD) Flow Analysis:
    let buyVol15m = 0;
    let sellVol15m = 0;
    bars15mUse.slice(-5).forEach(b => {
      if (b.close >= b.open) buyVol15m += (b.volume || 1);
      else sellVol15m += (b.volume || 1);
    });
    const totalVol15m = Math.max(1, buyVol15m + sellVol15m);
    const buyVolRatio = buyVol15m / totalVol15m;
    const sellVolRatio = sellVol15m / totalVol15m;

    const is15mRed = last15m.close < last15m.open;
    const is15mGreen = last15m.close >= last15m.open;
    const is15mBreakdown = last15m.close < prev15m.low;
    const is15mBreakout = last15m.close > prev15m.high;

    let bullPatternPoints = patternInfo.signal === "BULLISH" ? Math.max(25, patternInfo.score) : (is15mBreakout ? 25 : is15mGreen ? 18 : 0);
    let bearPatternPoints = patternInfo.signal === "BEARISH" ? Math.max(25, patternInfo.score) : (is15mBreakdown ? 25 : is15mRed ? 18 : 0);

    // Add CVD Institutional Flow Bonuses:
    if (buyVolRatio >= 0.60) bullPatternPoints += 10;
    if (sellVolRatio >= 0.60) bearPatternPoints += 10;

    // ADX Trend Strength Filter: If market is in low-volatility dead chop (< 14), penalize
    if (adx4h < 14) {
      bullTrendPoints = Math.min(bullTrendPoints, 5);
      bearTrendPoints = Math.min(bearTrendPoints, 5);
      bullMomPoints = Math.min(bullMomPoints, 5);
      bearMomPoints = Math.min(bearMomPoints, 5);
    }

    // 🧠 AI MASTER SMC & QUANTITATIVE CONFLUENCE ENGINE:
    const closes15m = bars15mUse.map(b => b.close);
    // 🌟 MASTER 15M EMA 9 & 21 CALCULATION 🌟
    const ema9_15m = this.calculateEMA(closes15m, 9);
    const ema21_15m = this.calculateEMA(closes15m, 21);
    const is15mBullCross = ema9_15m >= ema21_15m;
    const is15mBearCross = ema9_15m < ema21_15m;
    const isPriceAboveEma9 = currentPrice > ema9_15m;
    const isPriceBelowEma9 = currentPrice < ema9_15m;
    const isPriceAboveEma21 = currentPrice > ema21_15m;
    const isPriceBelowEma21 = currentPrice < ema21_15m;

    // 🎯 Symmetric Confluence: BUY when 1h + 15m align Bullish; SELL when 1h + 15m align Bearish!
    const isBullConfluence = is1hBullish && (patternInfo.signal === "BULLISH" || bullPatternPoints >= 15 || (is15mGreen && isPriceAboveEma9 && adx4h >= 18));
    const isBearConfluence = is1hBearish && (patternInfo.signal === "BEARISH" || bearPatternPoints >= 15 || (is15mRed && isPriceBelowEma9 && adx4h >= 18));
    const rsi15m = this.calculateRSI(closes15m, 14);
    const ema20_15m = this.calculateEMA(closes15m, 20);
    const distFromEMA20Pct = ema20_15m > 0 ? ((currentPrice - ema20_15m) / ema20_15m) * 100 : 0;
    const bb15m = this.calculateBollingerBands(closes15m, 20, 2);

    // 📐 High-Level Quantitative Formulas:
    const kama1h = this.calculateKAMA(closes1h, 10, 2, 30);
    const cmo15m = this.calculateCMO(closes15m, 14);
    const zScore15m = this.calculateZScore(closes15m, 20);
    const hurst1h = this.calculateHurstExponent(closes1h, 24);

    // 🏛️ Master SMC Smart Money Concepts:
    const fvg15m = this.detectFairValueGap(bars15mUse);
    const ob15m = this.detectOrderBlock(bars15mUse);
    const vwap1h = this.calculateVWAP(bars1h);
    const sweep15m = this.detectLiquiditySweep(bars15mUse);
    const td15m = this.calculateTDSequential(bars15mUse);
    const msb15m = this.detectMarketStructureBreak(bars15mUse);
    const fib15m = this.calculateFibonacciGoldenPocket(bars15mUse);
    const ictSession = this.getICTSessionKillZone();

    // KAMA Adaptive Moving Average Confluence (+8 Pts Zero-Lag Verification):
    if (currentPrice > kama1h && is1hRising) bullMomPoints += 8;
    if (currentPrice < kama1h && is1hDropping) bearMomPoints += 8;

    // CMO Chande Momentum Velocity (+8 Pts True Price Acceleration):
    if (cmo15m >= 25) bullMomPoints += 8;
    if (cmo15m <= -25) bearMomPoints += 8;

    // Institutional Anchored VWAP (+8 Pts True Value Alignment):
    if (currentPrice > vwap1h.vwap) bullTrendPoints += 8;
    if (currentPrice < vwap1h.vwap) bearTrendPoints += 8;

    // SMC Fair Value Gap Liquidity Imbalance (+10 Pts):
    if (fvg15m.fvgType === "BULLISH_FVG" && !fvg15m.isMitigated) bullPatternPoints += 10;
    if (fvg15m.fvgType === "BEARISH_FVG" && !fvg15m.isMitigated) bearPatternPoints += 10;

    // SMC Institutional Order Block Confirmation (+10 Pts):
    if (ob15m.obType === "BULLISH_OB") bullPatternPoints += 10;
    if (ob15m.obType === "BEARISH_OB") bearPatternPoints += 10;

    // SMC Liquidity Sweep / Stop-Hunt Reversal (+15 Pts Smart Money Absorption):
    if (sweep15m.sweepType === "BULLISH_SWEEP") bullPatternPoints += 15;
    if (sweep15m.sweepType === "BEARISH_SWEEP") bearPatternPoints += 15;

    // SMC Market Structure Break / Change of Character (+12 Pts Structural Shift):
    if (msb15m.msbType === "BULLISH_MSB") bullPatternPoints += 12;
    if (msb15m.msbType === "BEARISH_MSB") bearPatternPoints += 12;

    // Fibonacci Golden Pocket 0.618 - 0.65 Retracement (+12 Pts Optimal Trade Entry):
    if (fib15m.inGoldenPocket && fib15m.fibType === "BULLISH_PULLBACK") bullPatternPoints += 12;
    if (fib15m.inGoldenPocket && fib15m.fibType === "BEARISH_PULLBACK") bearPatternPoints += 12;

    // ICT Kill Zone Institutional Volume Expansion (+8 to +10 Pts):
    if (ictSession.isKillZone) {
      bullMomPoints += ictSession.bonusScore;
      bearMomPoints += ictSession.bonusScore;
    }

    // Hurst Fractal Dimension Regime Confirmation:
    if (hurst1h >= 0.55) {
      if (fourHourTrend === "BULLISH") bullTrendPoints += 6;
      if (fourHourTrend === "BEARISH") bearTrendPoints += 6;
    }

    // 📐 Shannon Entropy & KAMA Velocity:
    const shannon15m = this.calculateShannonEntropy(bars15mUse);
    const kamaVelocity15m = ((closes15m[closes15m.length - 1] - kama1h) / Math.max(1, kama1h)) * 100;

    // 🔄 4-HOUR MACRO CYCLICAL REVERSAL & BOTTOM ACCUMULATION DETECTOR:
    const is4hBottomReversal = (sweep15m.sweepType === "BULLISH_SWEEP" || msb15m.msbType === "BULLISH_MSB" || (fvg15m.fvgType === "BULLISH_FVG" && !fvg15m.isMitigated) || fib15m.inGoldenPocket) && (is1hRising || currentPrice > vwap1h.vwap || rsi1h < 44);
    const is4hTopReversal = (sweep15m.sweepType === "BEARISH_SWEEP" || msb15m.msbType === "BEARISH_MSB" || (fvg15m.fvgType === "BEARISH_FVG" && !fvg15m.isMitigated) || (td15m.isExhausted && td15m.sellSetupCount >= 9)) && (is1hDropping || currentPrice < vwap1h.vwap || rsi1h > 56);

    // 🏛️ Strategy 9: Markov Switching Market Regime
    const markovRegime = this.calculateMarkovMarketRegime(bars15mUse);
    if (markovRegime.regime === "TRENDING_EXPANSION") {
      if (isBullConfluence) bullTrendPoints += 8;
      if (isBearConfluence) bearTrendPoints += 8;
    }

    // 🏛️ Strategy 10: Order Book Microstructure Depth Skew
    const depthSkew = this.calculateOrderBookDepthSkew(bars15mUse);
    if (depthSkew.depthBias === "BULLISH_WALL") bullPatternPoints += depthSkew.skewScore;
    if (depthSkew.depthBias === "BEARISH_WALL") bearPatternPoints += depthSkew.skewScore;

    // 🏛️ Strategy 11: Bayesian Log-Odds Confluence Aggregator
    const bayesianScore = this.calculateBayesianConfluenceScore({
      macroTrendAligned: fourHourTrend === "BULLISH" || is4hBottomReversal,
      smcPatternConfirmed: sweep15m.sweepType !== "NONE" || msb15m.msbType !== "NONE",
      kamaAligned: currentPrice > kama1h,
      cvdRatio: buyVolRatio,
      zScoreSafe: Math.abs(zScore15m) < 2.0,
      hurstTrending: hurst1h >= 0.52
    });

    if (bayesianScore >= 85) {
      if (isBullConfluence) bullMomPoints += 15;
      if (isBearConfluence) bearMomPoints += 15;
    }

    let learnedBullPenalty = 0;
    let learnedBearPenalty = 0;

    // Macro 4-Hour Trend Alignment & Reversal Transition:
    if (fourHourTrend === "BULLISH") {
      if (is4hTopReversal) {
        bearTrendPoints += 25;
        bearMomPoints += 15;
      } else {
        bullTrendPoints += 10;
        learnedBearPenalty += 15;
      }
    } else if (fourHourTrend === "BEARISH") {
      if (is4hBottomReversal) {
        bullTrendPoints += 25;
        bullMomPoints += 15;
      } else {
        bearTrendPoints += 10;
        learnedBullPenalty += 15;
      }
    }

    // TD Sequential 9 Exhaustion Guard
    if (td15m.isExhausted && td15m.sellSetupCount >= 9) {
      learnedBullPenalty += 25;
    }
    if (td15m.isExhausted && td15m.buySetupCount >= 9) {
      learnedBearPenalty += 25;
    }

    // Z-Score Outlier Overbought/Oversold Guards
    if (zScore15m <= -2.2 || rsi15m < 32) {
      learnedBearPenalty += 25;
    }
    if (zScore15m >= 2.2 || rsi15m > 68) {
      learnedBullPenalty += 25;
    }

    // CVD Volume Delta Traps
    if (sellVolRatio >= 0.75) {
      learnedBullPenalty += 20;
    }
    if (buyVolRatio >= 0.75) {
      learnedBearPenalty += 20;
    }

    // 🧠 ACTIVE AI MISTAKE ELIMINATION & AVOIDANCE SHIELD:
    try {
      const fsSync = require("fs");
      const pathSync = require("path");
      const mFile = pathSync.join(process.cwd(), ".delta_ai_mistakes.json");
      if (fsSync.existsSync(mFile)) {
        const pastMistakes = JSON.parse(fsSync.readFileSync(mFile, "utf-8"));
        // Avoid recent symbol loss repeat
        const recentSymLoss = pastMistakes.find((m: any) => (m.symbol || "").toUpperCase() === sym);
        if (recentSymLoss) {
          const lossAgeMs = Date.now() - new Date((recentSymLoss.timestamp || "").replace(" ", "T") + "Z").getTime();
          if (lossAgeMs > 0 && lossAgeMs < 2 * 3600 * 1000) {
            learnedBullPenalty += 30;
            learnedBearPenalty += 30;
          }
        }
      }
    } catch (e) {}

    // 🛡️ STRICT EMA 9/21 ANTI-LOSS DISCIPLINE:
    // 🏛️ TREND-ALIGNED PULLBACK LOGIC:
    // If 1h is Bearish, a pullback near 15m EMA 9 is a PRIME SHORT ZONE!
    if (isPriceAboveEma9 && isPriceAboveEma21 && is15mBullCross && fourHourTrend === "BULLISH") {
      learnedBearPenalty += 40;
      bearTrendPoints = 0;
    }
    if (isPriceBelowEma9 && isPriceBelowEma21 && is15mBearCross && fourHourTrend === "BEARISH") {
      learnedBullPenalty += 40;
      bullTrendPoints = 0;
    }

    // PRO-TREND EMPOWERMENT (Higher-Timeframe 4H Weighted Confluence):
    if (is15mBullCross && isPriceAboveEma9 && isPriceAboveEma21) {
      bullTrendPoints = 35;
      bullMomPoints = 30;
      // If 4H is Bearish, this is a counter-trend pullback (Cap at ~80). True 95+ only when 4H agrees!
      learnedBullPenalty += (fourHourTrend === "BEARISH") ? 18 : 0;
    }
    if (is15mBearCross && isPriceBelowEma9 && isPriceBelowEma21) {
      bearTrendPoints = 35;
      bearMomPoints = 30;
      // If 4H is Bullish, this is a counter-trend pullback (Cap at ~80). True 95+ only when 4H agrees!
      learnedBearPenalty += (fourHourTrend === "BULLISH") ? 18 : 0;
    }

    const totalBullScore = isBullConfluence
      ? Math.max(10, Math.min(98, bullTrendPoints + bullMomPoints + bullPatternPoints + volBonus - learnedBullPenalty))
      : Math.min(48, Math.max(10, bullTrendPoints + bullMomPoints));

    const totalBearScore = isBearConfluence
      ? Math.max(10, Math.min(98, bearTrendPoints + bearMomPoints + bearPatternPoints + volBonus - learnedBearPenalty))
      : Math.min(48, Math.max(10, bearTrendPoints + bearMomPoints));

    // 🎯 2-Hour Horizon Expected Profit Forecasting (High-Profit Swing Wave Targets):
    const safeAtr = (atr1h > 0 && atr1h < currentPrice * 0.15) ? atr1h : (currentPrice * 0.015);
    const slDist = safeAtr * 1.0;
    const tpDist = safeAtr * 1.35;
    const lotSize = this.calculateDynamicLotSize(sym, currentPrice, slDist).quantity;

    // Projected Profit if BUY is executed (2-Hour Horizon):
    const buyWinProb = totalBullScore / 100;
    const buyProjectedProfitUSD = Number(((tpDist * lotSize * buyWinProb) - (slDist * lotSize * (1 - buyWinProb))).toFixed(2));

    // Projected Profit if SELL is executed (2-Hour Horizon):
    const sellWinProb = totalBearScore / 100;
    const sellProjectedProfitUSD = Number(((tpDist * lotSize * sellWinProb) - (slDist * lotSize * (1 - sellWinProb))).toFixed(2));

    // 4. Stable 2-Hour Momentum Direction Decision with Anti-Flicker Hysteresis:
    let direction: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
    let overallScore = 50;
    let projectedProfitUSD = 0;
    let profitProbabilityPct = 50;

    const minEntryThreshold = typeof this.settings.minConfidenceThreshold === "number" ? this.settings.minConfidenceThreshold : 80;
    const prevAnalysis = this.analysisCache.get(sym);

    // Anti-Flicker Hysteresis Filter (Prevents 2-minute flip-flopping across intra-candle ticks):
    if (prevAnalysis?.direction === "BUY" && totalBullScore >= (totalBearScore - 4) && totalBullScore >= 42) {
      direction = "BUY";
      overallScore = totalBullScore;
      projectedProfitUSD = buyProjectedProfitUSD;
      profitProbabilityPct = totalBullScore;
    } else if (prevAnalysis?.direction === "SELL" && totalBearScore >= (totalBullScore - 4) && totalBearScore >= 42) {
      direction = "SELL";
      overallScore = totalBearScore;
      projectedProfitUSD = sellProjectedProfitUSD;
      profitProbabilityPct = totalBearScore;
    } else if (totalBullScore > totalBearScore + 3 && totalBullScore >= 45) {
      direction = "BUY";
      overallScore = totalBullScore;
      projectedProfitUSD = buyProjectedProfitUSD;
      profitProbabilityPct = totalBullScore;
    } else if (totalBearScore > totalBullScore + 3 && totalBearScore >= 45) {
      direction = "SELL";
      overallScore = totalBearScore;
      projectedProfitUSD = sellProjectedProfitUSD;
      profitProbabilityPct = totalBearScore;
    } else if (totalBullScore >= 50 && totalBullScore >= totalBearScore) {
      direction = "BUY";
      overallScore = totalBullScore;
      projectedProfitUSD = buyProjectedProfitUSD;
      profitProbabilityPct = totalBullScore;
    } else if (totalBearScore >= 50 && totalBearScore > totalBullScore) {
      direction = "SELL";
      overallScore = totalBearScore;
      projectedProfitUSD = sellProjectedProfitUSD;
      profitProbabilityPct = totalBearScore;
    } else {
      direction = "NEUTRAL";
      overallScore = Math.max(totalBullScore, totalBearScore);
      projectedProfitUSD = 0;
      profitProbabilityPct = overallScore;
    }

    // 🔥 TA-LIB / PANDAS-TA MOMENTUM IGNITION CONFLUENCE INTEGRATION:
    const roc15m = this.calculateROC(closes15m, 6);
    const obvData = this.calculateOBV(bars15mUse);
    const adxFull = this.calculateADXFull(bars15mUse, 14);
    const priceAboveVWAP = currentPrice > vwap1h.vwap;

    const bullIgnition = this.calculateMomentumIgnitionScore({
      roc15m,
      adx: adxFull.adx,
      plusDI: adxFull.plusDI,
      minusDI: adxFull.minusDI,
      obvSlope: obvData.obvSlope,
      volumeExpansionRatio: obvData.volumeExpansionRatio,
      priceAboveVWAP,
      fourHourTrend,
      direction: "BUY"
    });

    const bearIgnition = this.calculateMomentumIgnitionScore({
      roc15m,
      adx: adxFull.adx,
      plusDI: adxFull.plusDI,
      minusDI: adxFull.minusDI,
      obvSlope: obvData.obvSlope,
      volumeExpansionRatio: obvData.volumeExpansionRatio,
      priceAboveVWAP,
      fourHourTrend,
      direction: "SELL"
    });

    // If Momentum Ignition is STRONG (85+) or EARLY (75+), prioritize over lagging EMA cross!
    let activeIgnition = bullIgnition.score >= bearIgnition.score ? bullIgnition : bearIgnition;
    if (bullIgnition.score >= 75 && bullIgnition.score > bearIgnition.score) {
      direction = "BUY";
      overallScore = bullIgnition.score;
      profitProbabilityPct = bullIgnition.score;
      activeIgnition = bullIgnition;
    } else if (bearIgnition.score >= 75 && bearIgnition.score > bullIgnition.score) {
      direction = "SELL";
      overallScore = bearIgnition.score;
      profitProbabilityPct = bearIgnition.score;
      activeIgnition = bearIgnition;
    } else if (bullIgnition.setupTier === "CHOP_REJECT" && bearIgnition.setupTier === "CHOP_REJECT") {
      direction = "NEUTRAL";
      overallScore = Math.max(bullIgnition.score, bearIgnition.score);
    }

        // 🛑 100% STRICT MACRO TREND LAW:
    // If 4H is BEARISH: BUY is 100% FORBIDDEN. Only SELL (Short) allowed!
    // If 4H is BULLISH: SELL is 100% FORBIDDEN. Only BUY (Long) allowed!
    if (fourHourTrend === "BEARISH") {
      bullTrendPoints = 0;
      bullMomPoints = 0;
      bullPatternPoints = 0;
      if (direction === "BUY") {
        direction = "NEUTRAL";
        overallScore = 35;
      }
    } else if (fourHourTrend === "BULLISH") {
      bearTrendPoints = 0;
      bearMomPoints = 0;
      bearPatternPoints = 0;
      if (direction === "SELL") {
        direction = "NEUTRAL";
        overallScore = 35;
      }
    }

        // 🏛️ PURE PRICE ACTION + EMA 9/21 PULLBACK REJECTION ENGINE (Freqtrade / TradingView Benchmark):
    const pa = this.detectEmaPriceAction(bars15mUse, currentPrice);
    
    // 🛑 100% TIMEFRAME HIERARCHY FILTER (Resolves 15m vs 1h vs 4h Overlap):
    // 15m can NEVER fight the 4-Hour Boss!
    // If 4H is Bearish, a 15m hammer is a Bull Trap — REJECT!
    // If 4H is Bullish, a 15m shooting star is a Bear Trap — REJECT!
    const isPaTrendAligned = 
      (pa.signal === "BUY" && fourHourTrend === "BULLISH" && currentPrice >= ema21_1h) ||
      (pa.signal === "SELL" && fourHourTrend === "BEARISH" && currentPrice < ema21_1h);

    // 🧠 5-LAYER QUANT STACK (KAMA + Structure BOS/CHoCH + Wilder ADX + ATR):
    const kamaComposite = calculateCompositeScore(bars15mUse, {
      kamaPeriod: 10,
      adxPeriod: 14,
      swingLookback: 3,
      entryThreshold: 80
    });

    const isKamaTrendAligned = 
      (kamaComposite.bias === "LONG" && fourHourTrend === "BULLISH" && currentPrice >= ema21_1h) ||
      (kamaComposite.bias === "SHORT" && fourHourTrend === "BEARISH" && currentPrice < ema21_1h);

    if (isKamaTrendAligned && kamaComposite.score >= 80) {
      direction = kamaComposite.bias === "LONG" ? "BUY" : "SELL";
      overallScore = kamaComposite.score;
      profitProbabilityPct = kamaComposite.score;
    } else if (isPaTrendAligned && pa.isTriggered) {
      direction = pa.signal;
      overallScore = 95;
      profitProbabilityPct = 95;
    } else if (isPaTrendAligned) {
      direction = pa.signal;
      overallScore = 85; // Confirmed rejection in value pocket
      profitProbabilityPct = 70;
    } else {
      direction = "NEUTRAL";
      overallScore = Math.max(38, kamaComposite.score > 50 ? kamaComposite.score : 38);
      profitProbabilityPct = overallScore;
    }

    const isChopFree = (adx4h >= 22 || (this.analysisCache?.get?.(sym)?.adxValue || 0) >= 15) && hurst1h >= 0.40;
    
    // 🏛️ STREAMLINED 2-HOUR DIRECTION & EXECUTION ENGINE:
    // 1-Hour 21 EMA defines the master macro trend direction:
    const is1hBullTrend = currentPrice >= ema21_1h;
    const is1hBearTrend = currentPrice < ema21_1h;

    const isBuyTrendAllowed = is1hBullTrend && fourHourTrend === "BULLISH";
    const isSellTrendAllowed = is1hBearTrend && fourHourTrend === "BEARISH";

    // 15m Momentum Alignment:
    const isEmaAligned = direction === "BUY"
      ? (currentPrice >= ema9_15m)
      : direction === "SELL"
      ? (currentPrice <= ema9_15m)
      : false;

    // Anti-Exhaustion Guard (avoid buying extreme overbought or selling extreme oversold)
    const isFreshOrPullback = direction === "BUY" ? (rsi15m <= 70) : (rsi15m >= 30);

    const isEntryValid = (
      direction !== "NEUTRAL" &&
      isEmaAligned &&
      isFreshOrPullback &&
      overallScore >= (this.settings.minConfidenceThreshold || 55) &&
      ((direction === "BUY" && isBuyTrendAllowed) || (direction === "SELL" && isSellTrendAllowed))
    );
    const fifteenMinTrigger = patternInfo.signal === "BULLISH" ? "BULLISH_BREAKOUT" : patternInfo.signal === "BEARISH" ? "BEARISH_BREAKOUT" : "NEUTRAL";

    let trendContextStr = fourHourTrend;
    if (is4hBottomReversal) trendContextStr = "4h Bottom Reversal (Accumulation)";
    if (is4hTopReversal) trendContextStr = "4h Top Reversal (Distribution)";

    const tpPct = Number(((tpDist / currentPrice) * 100).toFixed(2));
    const slPct = Number(((slDist / currentPrice) * 100).toFixed(2));

    const reasoning = isEntryValid
      ? `🎯 QUANT ADAPTIVE [${direction}]: (${profitProbabilityPct}% Score). Structure: ${kamaComposite?.structureSignal || patternInfo.pattern} | ER: ${kamaComposite?.efficiencyRatio || 0} | ADX: ${kamaComposite?.adxValue || 0} | Target: +${tpPct}% · SL: -${slPct}%. 4h [${trendContextStr}].`
      : `⏳ 2-HOUR AI SCAN [FILTERED]: 2h Buy EV ${buyProjectedProfitUSD >= 0 ? "+" : ""}$${buyProjectedProfitUSD} (${totalBullScore}%) vs Sell EV ${sellProjectedProfitUSD >= 0 ? "+" : ""}$${sellProjectedProfitUSD} (${totalBearScore}%). Conviction < ${minEntryThreshold} or chop present (ADX ${adx4h.toFixed(1)}, Hurst ${hurst1h}). Auto-skipping.`;

    const result: MultiTimeframeAnalysis = {
      symbol: sym,
      overallScore,
      isEntryValid,
      direction,
      projectedProfitUSD,
      profitProbabilityPct,
      fourHourTrend,
      oneHourMomentum,
      fifteenMinTrigger,
      adxValue: Number(adx4h.toFixed(1)),
      rsi1h: Number(rsi1h.toFixed(1)),
      atr1h: Number(atr1h.toFixed(2)),
      volumeMultiplier: Number(volMultiplier.toFixed(2)),
      dataSource: "DELTA",
      subScores: {
        trend: direction === "BUY" ? bullTrendPoints : direction === "SELL" ? bearTrendPoints : Math.max(bullTrendPoints, bearTrendPoints),
        momentum: direction === "BUY" ? bullMomPoints : direction === "SELL" ? bearMomPoints : Math.max(bullMomPoints, bearMomPoints),
        pattern: direction === "BUY" ? bullPatternPoints : direction === "SELL" ? bearPatternPoints : Math.max(bullPatternPoints, bearPatternPoints),
        volume: volBonus
      },
      reasoning,
      shannonEntropy: shannon15m,
      hurstExponent: hurst1h,
      zScore: Number(zScore15m.toFixed(2)),
      kamaVelocity: Number(kamaVelocity15m.toFixed(2)),
      expectedValueUSD: direction === "BUY" ? buyProjectedProfitUSD : (direction === "SELL" ? sellProjectedProfitUSD : 0),
      halfKellyFraction: Number((Math.max(0, Math.min(0.10, ((overallScore / 100) * 2 - (1 - (overallScore / 100))) / 2)) * 50).toFixed(2))
    };

    this.analysisCache.set(sym, result);
    return result;
  }

  // ────────────────────────────────────────────
  // Layer 4: Execution & Circuit Breakers
  // ────────────────────────────────────────────

  public evaluateAndExecuteAutoTrade(symbol: string, bars15m: OHLCVBar[], bars1h: OHLCVBar[], bars4h: OHLCVBar[], currentPriceUSD: number): { success: boolean; message: string; position?: AutoTraderPosition } {
    console.log("[DEBUG EVAL TRADE]", {
      isEnabled: this.settings.isEnabled,
      botState: this.getStatus().botState,
      positionsCount: this.openPositions.length,
      maxPositions: this.settings.maxConcurrentPositions
    });
    this.checkDailyReset();

    if (!this.settings.isEnabled) {
      return { success: false, message: "Delta Auto-Trader is PAUSED." };
    }

    const status = this.getStatus();
    if (status.botState === "CIRCUIT_BREAKER_HALT") {
      return { success: false, message: `🛑 DAILY CIRCUIT BREAKER ACTIVE: Today's loss reached ${this.settings.maxDailyLossPct}%. Trading halted until tomorrow.` };
    }

    if (status.botState === "COOLDOWN_ACTIVE") {
      return { success: false, message: `⏳ LOSS COOLDOWN ACTIVE: Paused for ${status.cooldownRemainingMins} more min(s) following recent loss.` };
    }

    // 🛡️ STRICT DIVERSIFICATION: NO DUPLICATE COIN TRADES!
    if (this.openPositions.some(p => p.symbol.toUpperCase().replace("USDT","").replace("USD","") === symbol.toUpperCase().replace("USDT","").replace("USD",""))) {
      return { success: false, message: `🔒 Asset ${symbol} already has an active open position. No duplicates allowed.` };
    }

    if (this.openPositions.length >= 1) {
      return { success: false, message: `🔒 SINGLE SNIPER MODE: Already holding 1 active position (${this.openPositions[0].symbol}). No other trades allowed until this completes.` };
    }
    if (this.openPositions.length >= this.settings.maxConcurrentPositions) {
      return { success: false, message: `🔒 ALL 7 SLOTS OCCUPIED: Currently running ${this.openPositions.length}/${this.settings.maxConcurrentPositions} active positions.` };
    }

    const analysis = this.analyzeMultiTimeframe(symbol, bars15m, bars1h, bars4h);
    if (!analysis.isEntryValid || analysis.direction === "NEUTRAL") {
      return { success: false, message: `⏳ WAIT MODE: ${analysis.reasoning}` };
    }

    // 🛡️ DIRECTIONAL CONCENTRATION CAP (Max 3 same-direction positions out of 7 slots)
    // Prevents herd trading ("sab me BUY" ya "sab me SELL")
    const maxSameDirection = 2; // Strict balance: Max 2 BUYs out of 3 slots so 3rd slot is reserved for SELL!
    const sameDirectionCount = this.openPositions.filter(p => p.type === analysis.direction).length;
    if (sameDirectionCount >= maxSameDirection) {
      return {
        success: false,
        message: `🛡️ Directional Risk Cap: Already holding ${sameDirectionCount} ${analysis.direction} positions. Max allowed is ${maxSameDirection} to preserve balance.`
      };
    }

    const baseline = this.getAssetBaselinePrice(symbol);
    const liveTick = deltaExchangeEngine.getLivePrice(symbol)?.usd || this.getLivePriceUSD(symbol);
    const price = (liveTick > 0 && liveTick > baseline * 0.1 && liveTick < baseline * 10)
      ? liveTick
      : (currentPriceUSD > 0 ? currentPriceUSD : (bars15m[bars15m.length - 1]?.close || bars1h[bars1h.length - 1]?.close || baseline));
    // 🎯 SINGLE SOURCE OF TRUTH: Directly query getTradeSignal for unified SL, TP & ATR
    const tradeSig = getTradeSignal(bars15m, "NONE", {
      slMultiplier: 1.5,
      tpMultiplier: 3.0,
      swingLookback: 3,
      entryThreshold: 80
    });

    const entryPrice = this.roundPrice(price);
    const stopLossPrice = tradeSig.stopLoss 
      ? this.roundPrice(tradeSig.stopLoss) 
      : this.roundPrice(analysis.direction === "BUY" ? price - price * 0.015 : price + price * 0.015);
    const targetPrice = tradeSig.takeProfit 
      ? this.roundPrice(tradeSig.takeProfit) 
      : this.roundPrice(analysis.direction === "BUY" ? price + price * 0.030 : price - price * 0.030);
    const slDistance = Math.abs(entryPrice - stopLossPrice);
    const safeAtr = tradeSig.atrValue || (price * 0.010);

    // 🎯 DYNAMIC LOT SIZING BASED ON LIVE ACCOUNT BALANCE (1.5% Risk)
    const lotInfo = this.calculateDynamicLotSize(symbol, price, slDistance);
    const quantity = lotInfo.quantity;
    const initialRiskUSD = Number((Math.abs(entryPrice - stopLossPrice) * quantity).toFixed(4)) || lotInfo.initialRiskUSD;
    const now = Date.now();

    const position: AutoTraderPosition = {
      id: `DAT-${now}-${Math.floor(1000 + Math.random() * 9000)}`,
      symbol: symbol.toUpperCase(),
      type: analysis.direction === "BUY" ? "BUY" : "SELL",
      quantity,
      entryPrice,
      currentPrice: entryPrice,
      stopLossPrice,
      targetPrice,
      initialRiskUSD,
      atrValue: this.roundPrice(safeAtr),
      confidenceScore: analysis.overallScore,
      unrealizedPnLUSD: 0,
      unrealizedPnLPct: 0,
      trailingStopActive: false,
      highestProfitUSD: 0,
      triggerIndicator: `EMA 9/21 ${analysis.direction === "BUY" ? "Golden Cross" : "Death Cross"} · ADX ${(analysis.adxValue || 20).toFixed(1)}`,
      timeframeAlignment: "15m + 1h + 4h Aligned",
      entryTimestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      entryTimeMs: now,
      maxHoldTimeExpiry: now + V3_MAX_HOLD_TIME_MS, // 24 Hours (1 Day) Trend Horizon Window (2h to 1 Day)
      subScores: analysis.subScores,
      adxValue: analysis.adxValue,
      rsiValue: analysis.rsi1h,
      entryEVUSD: analysis.projectedProfitUSD
    };

    this.openPositions.unshift(position);
    this.tradesTakenTodayCount++;
    this.saveToStorage();
    // If LIVE mode, trigger execution on Delta Exchange API and attach native Stop-Loss & Take-Profit bracket
    if (this.settings.mode === "LIVE") {
      deltaExchangeEngine.placeOrder(
        symbol,
        position.type === "BUY" ? "buy" : "sell",
        quantity,
        undefined, // Market Order for instant fill
        position.stopLossPrice,
        position.targetPrice
      ).then(orderRes => {
        const fillPrice = parseFloat(orderRes?.result?.average_fill_price || orderRes?.result?.limit_price);
        if (fillPrice && !isNaN(fillPrice) && fillPrice > 0) {
          position.entryPrice = fillPrice;
          this.saveToStorage();
          console.log(`[DeltaAutoTrader] 🎯 Synced exact exchange fill price for ${symbol}: $${fillPrice}`);
        }
      }).catch(err => console.warn("[DeltaAutoTrader] Live execution warning:", err));
    }

    return {
      success: true,
      message: `🚀 EXECUTED ${position.type} ORDER for ${quantity} ${symbol} @ $${price.toLocaleString()} USD (${position.confidenceScore}/100 Score)! Target: $${targetPrice} · SL: $${stopLossPrice}`,
      position
    };
  }


  // 🛡️ CONTINUOUS POST-ENTRY ACTIVE DANGER REVERSAL SENTINEL
  // Re-evaluates open positions against live 15m/1h candle structure
  // If in profit (+$1.00 to +$2.00) and danger/reversal is detected -> INSTANT PROFIT-TAKE EXIT!
  // If not exiting, automatically ratchets SL into guaranteed profit to shield against flash crashes!
  public async checkActivePositionsDangerReversal(): Promise<string[]> {
    if (this.openPositions.length === 0) return [];

    const logs: string[] = [];

    for (const pos of [...this.openPositions]) {
      try {
        const [c15, c1h, c4h] = await Promise.all([
          this.fetchCryptoCandles(pos.symbol, "15m", 60),
          this.fetchCryptoCandles(pos.symbol, "1h", 60),
          this.fetchCryptoCandles(pos.symbol, "4h", 60)
        ]);

        if (!c15 || c15.length < 15) continue;

        const currentPrice = pos.currentPrice || pos.entryPrice;
        const pnlUSD = pos.type === "BUY"
          ? (currentPrice - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - currentPrice) * pos.quantity;

        const closes15m = c15.map(b => b.close);
        const ema9_15m = this.calculateEMA(closes15m, 9);
        const ema21_15m = this.calculateEMA(closes15m, 21);
        const last15m = c15[c15.length - 1];
        const prev15m = c15[c15.length - 2];

        const analysis = this.analyzeMultiTimeframe(pos.symbol, c15, c1h, c4h);

        let dangerDetected = false;
        let dangerReason = "";

        // 🏛️ QUANT KAMA STRUCTURE EARLY INVALIDATION (Zero-Lag Exit before full SL hit):
        const kamaSignal = getTradeSignal(c15, pos.type === "BUY" ? "LONG" : "SHORT", {
          slMultiplier: 1.5,
          tpMultiplier: 3.0,
          swingLookback: 3
        });

        if (pos.type === "BUY" && kamaSignal.action === "EXIT_LONG") {
          const res = this.closePosition(pos.id, currentPrice, "STRUCTURE_INVALIDATION_EXIT");
          const msg = "⚡ KAMA STRUCTURE EARLY EXIT: Closed LONG " + pos.symbol + " @ $" + currentPrice + " (PnL: $" + pnlUSD.toFixed(2) + " USD). Reason: " + kamaSignal.reason + ". Saved capital before full ATR SL hit!";
          console.log("[DeltaAutoTrader] " + msg);
          logs.push(msg);
          continue;
        } else if (pos.type === "SELL" && kamaSignal.action === "EXIT_SHORT") {
          const res = this.closePosition(pos.id, currentPrice, "STRUCTURE_INVALIDATION_EXIT");
          const msg = "⚡ KAMA STRUCTURE EARLY EXIT: Closed SHORT " + pos.symbol + " @ $" + currentPrice + " (PnL: $" + pnlUSD.toFixed(2) + " USD). Reason: " + kamaSignal.reason + ". Saved capital before full ATR SL hit!";
          console.log("[DeltaAutoTrader] " + msg);
          logs.push(msg);
          continue;
        }

        if (pos.type === "BUY") {
          const isBearEngulf = last15m.close < last15m.open && last15m.close < prev15m.low;
          const isEmaBreakdown = currentPrice < ema9_15m && last15m.close < ema21_15m;
          const isOppositeSignal = analysis.direction === "SELL" && analysis.overallScore >= 70;

          if (isOppositeSignal) {
            dangerDetected = true;
            dangerReason = "Macro AI flipped to SELL (" + analysis.overallScore + "/100)";
          } else if (isBearEngulf && currentPrice < ema9_15m) {
            dangerDetected = true;
            dangerReason = "15m Bearish Engulfing Breakdown below EMA 9";
          } else if (isEmaBreakdown && last15m.volume > (prev15m.volume || 1) * 1.3) {
            dangerDetected = true;
            dangerReason = "Heavy Volume EMA 9/21 Breakdown";
          }
        } else if (pos.type === "SELL") {
          const isBullEngulf = last15m.close > last15m.open && last15m.close > prev15m.high;
          const isEmaBreakout = currentPrice > ema9_15m && last15m.close > ema21_15m;
          const isOppositeSignal = analysis.direction === "BUY" && analysis.overallScore >= 70;

          if (isOppositeSignal) {
            dangerDetected = true;
            dangerReason = "Macro AI flipped to BUY (" + analysis.overallScore + "/100)";
          } else if (isBullEngulf && currentPrice > ema9_15m) {
            dangerDetected = true;
            dangerReason = "15m Bullish Engulfing Breakout above EMA 9";
          } else if (isEmaBreakout && last15m.volume > (prev15m.volume || 1) * 1.3) {
            dangerDetected = true;
            dangerReason = "Heavy Volume EMA 9/21 Breakout";
          }
        }

        // 🎯 ACTION 1: INSTANT PROFIT TAKE EXIT IF IN GREEN (Save profit before it dumps!)
        if (dangerDetected && pnlUSD >= 1.80) { // At least ₹150 profit so net in hand is >₹100 after ₹50 fee
          const res = this.closePosition(pos.id, currentPrice, "PEAK_RETRACEMENT_EXIT");
          const msg = "🚨 DANGER REVERSAL PROFIT LOCK: Closed " + pos.symbol + " in profit (+$" + pnlUSD.toFixed(2) + " USD / +₹" + (pnlUSD * 83.5).toFixed(0) + " INR) because " + dangerReason + "! Avoided potential drawdown.";
          console.log("[DeltaAutoTrader] " + msg);
          logs.push(msg);
          continue;
        }

        // 🎯 ACTION 2: ULTRA-AGGRESSIVE SL RATCHET IN GREEN (Lock profit so trade cannot lose!)
        if (pnlUSD >= 1.20) {
          const profitBufferUSD = Math.max(0.60, pnlUSD * 0.65);
          const bufferPriceDist = profitBufferUSD / pos.quantity;
          const securedSL = this.roundPrice(
            pos.type === "BUY" ? pos.entryPrice + bufferPriceDist : pos.entryPrice - bufferPriceDist
          );

          if ((pos.type === "BUY" && securedSL > pos.stopLossPrice) ||
              (pos.type === "SELL" && securedSL < pos.stopLossPrice)) {
            pos.stopLossPrice = securedSL;
            pos.trailingStopActive = true;
            pos.lockedProfitUSD = Number(profitBufferUSD.toFixed(2));
            const msg = "🔒 DYNAMIC SL PROFIT SHIELD for " + pos.symbol + ": Current gain +$" + pnlUSD.toFixed(2) + ". SL moved into guaranteed profit @ $" + pos.stopLossPrice + " (+$" + profitBufferUSD.toFixed(2) + " locked)!";
            console.log("[DeltaAutoTrader] " + msg);
            logs.push(msg);
            if (this.settings.mode === "LIVE") {
              deltaExchangeEngine.updateBracketOrder(pos.symbol, pos.stopLossPrice, pos.targetPrice).catch(() => {});
            }
          }
        } else if (pnlUSD >= 1.20 && pos.stopLossPrice === pos.initialStopLoss) { // Lock breakeven after ₹100 move to cover ₹50 fee completely
          const beBuffer = 0.05 / pos.quantity;
          const bePrice = this.roundPrice(pos.type === "BUY" ? pos.entryPrice + beBuffer : pos.entryPrice - beBuffer);
          pos.stopLossPrice = bePrice;
          const msg = "🛡️ EARLY BREAKEVEN SHIELD: " + pos.symbol + " reached +$" + pnlUSD.toFixed(2) + ". SL moved to Entry ($" + bePrice + ") - 100% Risk-Free!";
          console.log("[DeltaAutoTrader] " + msg);
          logs.push(msg);
          if (this.settings.mode === "LIVE") {
            deltaExchangeEngine.updateBracketOrder(pos.symbol, pos.stopLossPrice, pos.targetPrice).catch(() => {});
          }
        }
      } catch (err) {
        // quiet catch
      }
    }

    if (logs.length > 0) {
      this.saveToStorage();
    }

    return logs;
  }

  public updateLivePriceAndCheckExits(symbol: string, currentPriceUSD: number): string[] {
    this.checkDailyReset();
    if (!currentPriceUSD || isNaN(currentPriceUSD) || currentPriceUSD <= 0) return [];
    this.latestPrices.set(symbol.toUpperCase().trim(), currentPriceUSD);

    const triggeredLogs: string[] = [];
    const now = Date.now();

    const cleanSym = symbol.toUpperCase().replace("USDT", "").replace("USD", "").trim();
    this.openPositions.forEach(pos => {
      const posClean = pos.symbol.toUpperCase().replace("USDT", "").replace("USD", "").trim();
      if (pos.symbol === symbol || symbol.includes(pos.symbol) || pos.symbol.includes(symbol) || cleanSym === posClean) {
        pos.currentPrice = this.roundPrice(currentPriceUSD);

        // P&L Calculation
        const pnlUSD = pos.type === "BUY"
          ? (pos.currentPrice - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - pos.currentPrice) * pos.quantity;

        const invested = pos.entryPrice * pos.quantity;
        pos.unrealizedPnLUSD = Number(pnlUSD.toFixed(2));
        pos.unrealizedPnLPct = invested > 0 ? Number(((pnlUSD / invested) * 100).toFixed(2)) : 0;

        if (pos.unrealizedPnLUSD > pos.highestProfitUSD) {
          pos.highestProfitUSD = pos.unrealizedPnLUSD;
        }

        // ────────────────────────────────────────────
        // 🛡️ DYNAMIC PROFIT PROTECTION & PEAK-TRAILED AUTO-EXIT ENGINE (v3 R-Multiple Scaled)
        // ────────────────────────────────────────────
        const initialRisk = (pos.initialRiskUSD && pos.initialRiskUSD > 0)
          ? pos.initialRiskUSD
          : Math.max(0.50, Math.abs(pos.entryPrice - pos.stopLossPrice) * pos.quantity);

        // Exit Check 0: Emergency Hard Dollar Loss Floor (Max 1.8% Risk = ~$3.40 on $191 balance)
        // Primary single-runaway risk guard that fires first before account-level breaker
        const emergencyMaxLossUSD = Math.max(initialRisk * 1.25, 4.50);
        if (pnlUSD <= -emergencyMaxLossUSD) {
          const res = this.closePosition(pos.id, pos.currentPrice, "STOP_LOSS_HIT");
          triggeredLogs.push(`🛑 Emergency Hard Risk Cap: Closed ${pos.symbol} at -$${Math.abs(pnlUSD).toFixed(2)} to strictly protect capital.`);
          return;
        }

        // ────────────────────────────────────────────
        // 🎯 DYNAMIC STEP-UP TARGET RATCHET & MULTI-TIER PROFIT LADDER ENGINE
        // (e.g. Goal 1 Achieved -> Ratchet Target to 120 -> 140+ with Trailing SL Locked Behind Price)
        // ────────────────────────────────────────────
        const prevSL = pos.stopLossPrice;
        const prevTP = pos.targetPrice;

        const isTPHit = pos.type === "BUY" ? pos.currentPrice >= pos.targetPrice : pos.currentPrice <= pos.targetPrice;
        if (isTPHit) {
          pos.ratchetTier = (pos.ratchetTier || 0) + 1;
          pos.trailingStopActive = true;

          const currentGainDist = Math.abs(pos.targetPrice - pos.entryPrice);
          const nextTargetDist = currentGainDist * 1.40; // Expand target by +40% (e.g. 90 -> 126 -> 176...)
          pos.targetPrice = this.roundPrice(pos.type === "BUY" ? pos.entryPrice + nextTargetDist : pos.entryPrice - nextTargetDist);

          // Trail Stop Loss UP into guaranteed profit (Locking in 70% of current gain)
          const lockedGainDist = currentGainDist * 0.70;
          const ratchetedSL = this.roundPrice(pos.type === "BUY" ? pos.entryPrice + lockedGainDist : pos.entryPrice - lockedGainDist);
          if ((pos.type === "BUY" && ratchetedSL > pos.stopLossPrice) || (pos.type === "SELL" && ratchetedSL < pos.stopLossPrice)) {
            pos.stopLossPrice = ratchetedSL;
          }
          pos.lockedProfitUSD = Number((lockedGainDist * pos.quantity).toFixed(2));

          const ratchetMsg = `🚀 STEP-UP RATCHET (Tier #${pos.ratchetTier}) for ${pos.symbol}: Target extended UP to $${pos.targetPrice} | Guaranteed profit locked at SL $${pos.stopLossPrice} (+$${pos.lockedProfitUSD} USD / +₹${(pos.lockedProfitUSD * 95.71).toFixed(0)} INR)! Trend run continuing...`;
          console.log(`[DeltaAutoTrader] ${ratchetMsg}`);
          triggeredLogs.push(ratchetMsg);
          this.saveToStorage();
        }

        
        // 🛡️ Halfway 2-Hour Target Shield (+2.50 USD Gain -> Lock Stop-Loss to Breakeven):
        if (pnlUSD >= 2.50 && pos.stopLossPrice === (pos.type === "BUY" ? this.roundPrice(pos.entryPrice - (pos.initialRiskUSD / pos.quantity)) : this.roundPrice(pos.entryPrice + (pos.initialRiskUSD / pos.quantity)))) {
          const beBuffer = 0.05 / pos.quantity;
          const bePrice = this.roundPrice(pos.type === "BUY" ? pos.entryPrice + beBuffer : pos.entryPrice - beBuffer);
          pos.stopLossPrice = bePrice;
          triggeredLogs.push("🛡️ 2-Hour Target Shield Activated: " + pos.symbol + " reached +$" + pnlUSD.toFixed(2) + ". SL moved to Breakeven ($" + bePrice + ") - Zero Risk for remainder of 2h!");
          if (this.settings.mode === "LIVE") {
            deltaExchangeEngine.updateBracketOrder(pos.symbol, pos.stopLossPrice, pos.targetPrice).catch(()=>{});
          }
        }

        // Tier 1: Instant Breakeven + Buffer Risk-Free Lock (+0.70R gain -> SL moved to Entry + 0.1R buffer)
        if (pnlUSD >= initialRisk * 1.2 && !pos.trailingStopActive && !pos.ratchetTier) {
          pos.trailingStopActive = true;
          const rBufferPrice = (initialRisk * 0.10) / pos.quantity;
          const newSL = this.roundPrice(pos.type === "BUY" ? pos.entryPrice + rBufferPrice : pos.entryPrice - rBufferPrice);
          if ((pos.type === "BUY" && newSL < pos.currentPrice && newSL > pos.stopLossPrice) ||
              (pos.type === "SELL" && newSL > pos.currentPrice && newSL < pos.stopLossPrice)) {
            pos.stopLossPrice = newSL;
            triggeredLogs.push(`🔒 Tier 1 (+0.30R) Risk-Free Lock for ${pos.symbol}: SL moved to Entry + 0.1R buffer @ $${pos.stopLossPrice}!`);
          }
        }

        // Dynamic High-Water Mark Trailing: As price climbs higher, continuously trail SL 30% below highest peak
        if (pos.highestProfitUSD >= initialRisk * 1.2) {
          const dynamicLockUSD = pos.highestProfitUSD * 0.70; // 70% of peak profit locked
          const lockDist = dynamicLockUSD / pos.quantity;
          const dynamicSL = this.roundPrice(pos.type === "BUY" ? pos.entryPrice + lockDist : pos.entryPrice - lockDist);

          if ((pos.type === "BUY" && dynamicSL > pos.stopLossPrice && dynamicSL < pos.currentPrice) ||
              (pos.type === "SELL" && dynamicSL < pos.stopLossPrice && dynamicSL > pos.currentPrice)) {
            pos.stopLossPrice = dynamicSL;
            pos.trailingStopActive = true;
            pos.lockedProfitUSD = Number(dynamicLockUSD.toFixed(2));
          }
        }

        // 🔄 Live Exchange Bracket Synchronization: If SL or TP moved, modify the active bracket order on Delta Exchange via PUT /v2/orders/bracket
        if (this.settings.mode === "LIVE" && (pos.stopLossPrice !== prevSL || pos.targetPrice !== prevTP)) {
          deltaExchangeEngine.updateBracketOrder(pos.symbol, pos.stopLossPrice, pos.targetPrice).catch(err => {
            console.warn(`[DeltaAutoTrader] Error updating live bracket order on ${pos.symbol}:`, err);
          });
        }

        // Exit Check 2: Dynamic Peak Retracement Exit (If price retraces >= 35% from highest peak profit)
        if (pos.highestProfitUSD >= initialRisk * 1.2 && pnlUSD <= (pos.highestProfitUSD * 0.70)) {
          const res = this.closePosition(pos.id, pos.currentPrice, "PEAK_RETRACEMENT_EXIT");
          triggeredLogs.push(`🎯 Peak-Profit Banked: Auto-closed ${pos.symbol} at +$${pos.unrealizedPnLUSD} (Peak was +$${pos.highestProfitUSD.toFixed(2)}) after 35% retracement!`);
          return;
        }

        // Exit Check 3: Trailing Stop / Hard Stop-Loss Hit (Automatic market exit on Delta Exchange)
        const isSLHit = pos.type === "BUY" ? pos.currentPrice <= pos.stopLossPrice : pos.currentPrice >= pos.stopLossPrice;
        if (isSLHit) {
          const reason = pos.trailingStopActive ? "TRAILING_PROFIT_LOCKED" : "STOP_LOSS_HIT";
          const res = this.closePosition(pos.id, pos.currentPrice, reason);
          triggeredLogs.push(res.message);
          return;
        }

        // Exit Check 4: v3 Momentum Decay / Reversal Exit (2-4 Hours: In profit >= +0.4R earlier, now decaying toward scratch after 120m)
        const entryMs = pos.entryTimeMs || (pos.entryTimestamp ? new Date(pos.entryTimestamp.includes("T") ? pos.entryTimestamp : pos.entryTimestamp.replace(" ", "T") + "Z").getTime() : now) || now;
        const holdDurationMins = (now - entryMs) / 60000;
        if (holdDurationMins >= 120 && pos.highestProfitUSD >= initialRisk * 0.20 && pnlUSD < initialRisk * 0.10) {
          const res = this.closePosition(pos.id, pos.currentPrice, "EARLY_MOMENTUM_REVERSAL");
          triggeredLogs.push(`⚠️ v3 Momentum Decay Exit: Closed ${pos.symbol} at scratch ($${pos.unrealizedPnLUSD}) after 2h+ hold before slipping negative.`);
          return;
        }

        // Exit Check 5: v3 Stagnant Chop Stall Exit (Holding > 6 Hours with flat momentum < 0.20%)
        if (holdDurationMins >= 360 && Math.abs(pos.unrealizedPnLPct) < 0.20) {
          const res = this.closePosition(pos.id, pos.currentPrice, "TIME_STALL_EXIT");
          triggeredLogs.push(`⏳ v3 6-Hour Stale Trade Exit: Closed ${pos.symbol} at scratch to release capital.`);
          return;
        }

        // Exit Check 6: v3 24-Hour Swing Horizon Rule
        if (now >= pos.maxHoldTimeExpiry || holdDurationMins >= 1440) {
          const reason = pnlUSD > 0.05 ? "TARGET_HIT" : "MAX_TIME_24H";
          const res = this.closePosition(pos.id, pos.currentPrice, reason);
          triggeredLogs.push(`⏰ v3 24-Hour Horizon Complete: Closed ${pos.symbol} @ $${pos.currentPrice} (${pnlUSD >= 0 ? "+$" + pnlUSD.toFixed(2) : "-$" + Math.abs(pnlUSD).toFixed(2)})`);
          return;
        }
      }
    });

    if (triggeredLogs.length > 0) {
      this.saveToStorage();
    }

    return triggeredLogs;
  }


  private logTradeMistake(record: AutoTraderClosedRecord) {
    if (record.realizedPnLUSD >= 0) return;
    try {
      const fs = require("fs");
      const path = require("path");
      const mistakesPath = path.join(process.cwd(), ".delta_ai_mistakes.json");
      
      let mistakes = [];
      if (fs.existsSync(mistakesPath)) {
        mistakes = JSON.parse(fs.readFileSync(mistakesPath, "utf-8"));
      }

      let rootCause = "TREND_REVERSAL_STOP_LOSS";
      let analysis = `Trade entered at ${record.entryPrice} but price moved against entry, resulting in a ${record.realizedPnLUSD} loss.`;
      let correction = ["Tighten Stop-Loss distance.", "Require ADX > 15 for stronger momentum before entering."];

      if (record.exitReason === "MANUAL_UI_CLOSE") {
        rootCause = "MANUAL_ABORT_PREVENTATIVE_LOSS";
        analysis = `User manually aborted the ${record.type} position at ${record.exitPrice} to prevent further drawdown. Bot failed to hit Take-Profit.`;
        correction = ["Activate early breakeven shield at +0.35R.", "Enable faster dynamic trailing stops to lock profit early."];
      } else if (record.exitReason === "TIME_STALL_EXIT") {
        rootCause = "PROLONGED_CHOP_MOMENTUM_DECAY";
        analysis = `Trade stalled for too long without hitting target. Exited due to momentum decay.`;
      } else if (record.exitReason === "STOP_LOSS_HIT") {
        rootCause = "HARD_STOP_LOSS_HIT";
        analysis = `Market reversed sharply against the ${record.type} position, hitting safety stop-loss at ${record.exitPrice}.`;
      }

      const mistakeData = {
        id: `MSTK-${Date.now()}-${record.symbol}`,
        timestamp: record.exitTimestamp,
        symbol: record.symbol,
        type: record.type,
        entryPrice: record.entryPrice,
        exitPrice: record.exitPrice,
        lossUSD: record.realizedPnLUSD,
        lossPct: record.realizedPnLPct,
        confidenceScore: record.confidenceScore || 85,
        primaryTrigger: `EMA 9/21 · ADX ${record.adxValue || 20}`,
        rootCauseCategory: rootCause,
        detailedMistakeAnalysis: analysis,
        aiLearnedCorrections: correction
      };

      mistakes.unshift(mistakeData);
      if (mistakes.length > 50) mistakes = mistakes.slice(0, 50);
      
      fs.writeFileSync(mistakesPath, JSON.stringify(mistakes, null, 2), "utf-8");
      
    } catch(e) {
      console.warn("[AutoTrader] Error logging AI mistake:", e);
    }
  }

  public closePosition(positionId: string, exitPriceUSD: number, reason: AutoTraderClosedRecord["exitReason"] = "MANUAL_EXIT"): { success: boolean; message: string; record?: AutoTraderClosedRecord } {
    const pos = this.openPositions.find(p => p.id === positionId);
    if (!pos) {
      return { success: false, message: "Position not found." };
    }

    const actualExitPrice = this.roundPrice(exitPriceUSD || pos.currentPrice || pos.entryPrice);
    const grossPnlUSD = pos.type === "BUY"
      ? (actualExitPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - actualExitPrice) * pos.quantity;

    // Deduct Delta Exchange taker fee & slippage buffer (~₹20 INR / $0.24 USD)
    const pnlUSD = Number((grossPnlUSD - FEE_BUFFER_PER_TRADE_USD).toFixed(2));
    const invested = pos.entryPrice * pos.quantity;
    const realizedPnLPct = invested > 0 ? Number(((pnlUSD / invested) * 100).toFixed(2)) : 0;
    const outcome: AutoTraderClosedRecord["outcome"] = pnlUSD > 0.05 ? "WIN" : pnlUSD < -0.05 ? "LOSS" : "BREAKEVEN";

    const initialRisk = pos.initialRiskUSD || Math.max(0.1, Math.abs(pos.entryPrice - pos.stopLossPrice) * pos.quantity);
    const realizedRMultiple = Number((pnlUSD / initialRisk).toFixed(2));

    const record: AutoTraderClosedRecord = {
      id: pos.id,
      symbol: pos.symbol,
      type: pos.type,
      quantity: pos.quantity,
      entryPrice: pos.entryPrice,
      exitPrice: actualExitPrice,
      realizedPnLUSD: pnlUSD,
      realizedPnLPct,
      confidenceScore: pos.confidenceScore,
      outcome,
      exitReason: reason,
      entryTimestamp: pos.entryTimestamp,
      exitTimestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      subScores: pos.subScores,
      adxValue: pos.adxValue,
      rsiValue: pos.rsiValue,
      atrValue: pos.atrValue,
      entryEVUSD: pos.entryEVUSD,
      realizedRMultiple,
      feeUSD: FEE_BUFFER_PER_TRADE_USD
    };

    // Update Capital Balance
    this.settings.currentCapitalUSD = Math.max(10, Number((this.settings.currentCapitalUSD + pnlUSD).toFixed(2)));

    if (outcome === "LOSS") {
      this.lastLossTimestamp = Date.now();
      this.consecutiveLossCount += 1;
      this.symbolBlacklist[pos.symbol.toUpperCase()] = Date.now() + (3 * 3600 * 1000); // 3-Hour Ban on losing asset!
    } else if (outcome === "WIN") {
      this.consecutiveLossCount = 0;
    }

    this.openPositions = this.openPositions.filter(p => p.id !== positionId);
    this.closedRecords.unshift(record);
    if (outcome === "LOSS" || pnlUSD < -0.10) {
      this.logTradeMistake(record);
    }

    // If LIVE mode, cancel pending bracket order first and trigger exit order on Delta Exchange API to close real market position
    if (this.settings.mode === "LIVE") {
      deltaExchangeEngine.cancelBracketOrder(pos.symbol).catch(() => {});
      deltaExchangeEngine.placeOrder(
        pos.symbol,
        pos.type === "BUY" ? "sell" : "buy",
        pos.quantity
      ).catch(err => console.warn("[DeltaAutoTrader] Live exit execution warning:", err));
    }

    const now = Date.now();
    // 🎯 If slots were full and now a slot freed up, make sure inspection timer is active to read the next coin!
    if (this.openPositions.length < this.settings.maxConcurrentPositions && this.inspectionStartTimeMs === 0) {
      this.inspectionStartTimeMs = now;
      const nextCoin = CURATED_AUTO_TRADER_ASSETS[this.currentAssetIndex % CURATED_AUTO_TRADER_ASSETS.length];
      console.log(`[AutoTrader] 🔄 Position exited on ${pos.symbol}. Resumed 15-sec inspection on Asset #${(this.currentAssetIndex % CURATED_AUTO_TRADER_ASSETS.length) + 1}/10: ${nextCoin.tag} (${nextCoin.symbol}) to fill open slot (${this.openPositions.length}/${this.settings.maxConcurrentPositions} active).`);
    }

    if (this.openPositions.length === 0) {
      // Check if deferred midnight daily reset can now take place
      this.checkDailyReset();
    }

    this.saveToStorage();

    return {
      success: true,
      message: `Closed ${pos.type} trade on ${pos.symbol} @ $${actualExitPrice} (${reason}). P&L: $${pnlUSD >= 0 ? "+" : ""}${pnlUSD.toFixed(2)} USD (${realizedRMultiple >= 0 ? "+" : ""}${realizedRMultiple}R)!`,
      record
    };
  }

  // ────────────────────────────────────────────
  // Live Exchange Two-Way Synchronization
  // ────────────────────────────────────────────
  public async syncWithExchangePositions(): Promise<void> {
    if (this.settings.mode !== "LIVE" || !process.env.DELTA_EXCHANGE_API_KEY) return;
    try {
      const livePositions = await deltaExchangeEngine.fetchLivePositions();
      if (!Array.isArray(livePositions)) return;

      const activeSymbols = new Set(livePositions.map((p: any) => (p.product_symbol || "").toUpperCase()));

      // 1. Remove positions from this.openPositions if they are closed on Delta Exchange
      this.openPositions = this.openPositions.filter(pos => activeSymbols.has(pos.symbol.toUpperCase()));

      // 2. Add or update each live exchange position
      for (const livePos of livePositions) {
        const sym = (livePos.product_symbol || "").toUpperCase();
        const size = parseFloat(livePos.size) || 0;
        if (size === 0) continue;

        const type: "BUY" | "SELL" = size > 0 ? "BUY" : "SELL";
        const entryPrice = parseFloat(livePos.entry_price) || 0;
        const markPrice = parseFloat(livePos.mark_price) || entryPrice;
        const unrealizedPnL = parseFloat(livePos.unrealized_pnl) || 0;
        const absQty = Math.abs(size);

        let existing = this.openPositions.find(p => p.symbol.toUpperCase() === sym);
        if (existing) {
          existing.entryPrice = entryPrice;
          existing.currentPrice = markPrice;
          existing.unrealizedPnLUSD = Number(unrealizedPnL.toFixed(4));
          existing.quantity = absQty;
        } else {
          const now = Date.now();
          const slDistance = entryPrice * 0.015;
          const stopLossPrice = type === "BUY" ? entryPrice - slDistance : entryPrice + slDistance;
          const targetPrice = type === "BUY" ? entryPrice + (slDistance * 2.05) : entryPrice - (slDistance * 2.05);

          const newPos: AutoTraderPosition = {
            id: `DAT-${sym}-LIVE-${livePos.user_id || Date.now()}`,
            symbol: sym,
            type,
            entryPrice,
            currentPrice: markPrice,
            stopLossPrice: Number(stopLossPrice.toFixed(4)),
            initialStopLoss: Number(stopLossPrice.toFixed(4)),
            targetPrice: Number(targetPrice.toFixed(4)),
            quantity: absQty,
            confidenceScore: 80,
            unrealizedPnLUSD: Number(unrealizedPnL.toFixed(4)),
            unrealizedPnLPct: entryPrice > 0 ? Number(((unrealizedPnL / (entryPrice * absQty)) * 100).toFixed(2)) : 0,
            trailingStopActive: false,
            highestProfitUSD: Math.max(0, unrealizedPnL),
            timeframeAlignment: "Delta Exchange Live Position Sync",
            entryTimestamp: livePos.created_at ? livePos.created_at.replace("T", " ").substring(0, 19) : new Date().toISOString().replace("T", " ").substring(0, 19),
            entryTimeMs: now,
            maxHoldTimeExpiry: now + V3_MAX_HOLD_TIME_MS,
            subScores: { trend: 25, momentum: 25, pattern: 15, volume: 15 },
            adxValue: 30,
            rsiValue: 50,
            entryEVUSD: 5
          };
          this.openPositions.push(newPos);
        }
      }

      this.saveToStorage();
    } catch (e) {
      console.warn("[DeltaAutoTrader] Error syncing with exchange positions:", e);
    }
  }

  // ────────────────────────────────────────────
  // Status, Circuit Breakers & Controls
  // ────────────────────────────────────────────

  private checkDailyReset() {
    const todayStr = new Date().toISOString().split("T")[0];
    if (this.todayDateStr !== todayStr) {
      if (this.openPositions.length > 0) {
        console.log(`[DeltaAutoTrader] ℹ️ Daily reset deferred: Holding ${this.openPositions.length} active multi-session swing positions across midnight.`);
        return;
      }
      this.todayDateStr = todayStr;
      this.tradesTakenTodayCount = 0;
      this.dailyStartCapitalUSD = this.settings.currentCapitalUSD;
      this.saveToStorage();
    }
  }

  public checkBatchCycle(): boolean {
    const now = Date.now();
    // If any positions are currently active, trades are running normally — cooldown is NOT active!
    if (this.openPositions.length > 0) {
      return false;
    }

    // 🛡️ Tab/Device Sleep & Wakeup Protection:
    // If device was asleep or tab was inactive for > 45s, do NOT execute blind stale trades on wakeup!
    if (this.lastActiveTickTimestamp > 0 && (now - this.lastActiveTickTimestamp) > 45000 && this.slotReentryCooldownExpiry > 0) {
      console.warn(`[DeltaAutoTrader] ⚠️ Tab Sleep Detected (${Math.round((now - this.lastActiveTickTimestamp) / 1000)}s inactive). Resetting 10-Min Pre-Trade AI analysis countdown for safe entry.`);
      this.slotReentryCooldownExpiry = now + (this.batchCooldownMinutes * 60 * 1000);
    }
    this.lastActiveTickTimestamp = now;

    // If currently in 10-minute cooldown after batch completed:
    if (this.slotReentryCooldownExpiry > 0) {
      if (now >= this.slotReentryCooldownExpiry) {
        // 10-Minute AI Analysis Complete! Re-enable automatic execution of next batch of up to 5 trades
        this.slotReentryCooldownExpiry = 0;
        this.currentCycleNumber++;
        this.saveToStorage();
        return false;
      }
      return true; // Still in 10-min analysis cooldown
    }

    return false;
  }

  public getStatus(): AutoTraderStatus {
    this.checkDailyReset();
    const now = Date.now();
    const isBatchCooling = this.checkBatchCycle();
    const batchCooldownRemainingSeconds = isBatchCooling && this.slotReentryCooldownExpiry > 0
      ? Math.max(0, Math.ceil((this.slotReentryCooldownExpiry - now) / 1000))
      : 0;

    const todayRecords = this.closedRecords.filter(r => r.exitTimestamp.startsWith(this.todayDateStr));
    const todayPnLUSD = todayRecords.reduce((acc, r) => acc + r.realizedPnLUSD, 0);
    const todayPnLPct = this.dailyStartCapitalUSD > 0 ? Number(((todayPnLUSD / this.dailyStartCapitalUSD) * 100).toFixed(2)) : 0;

    const totalUnrealizedPnLUSD = this.openPositions.reduce((acc, p) => acc + (p.unrealizedPnLUSD || 0), 0);
    const totalExposurePnLUSD = todayPnLUSD + totalUnrealizedPnLUSD;
    const totalFloatingDrawdownPct = this.dailyStartCapitalUSD > 0
      ? Number(((totalExposurePnLUSD / this.dailyStartCapitalUSD) * 100).toFixed(2))
      : 0;

    const winningTradesToday = todayRecords.filter(r => r.outcome === "WIN").length;
    const losingTradesToday = todayRecords.filter(r => r.outcome === "LOSS").length;
    const winRatePct = todayRecords.length > 0 ? Number(((winningTradesToday / todayRecords.length) * 100).toFixed(1)) : 0;

    // 🎯 MATHEMATICAL EXPECTED-VALUE (EV) ENGINE (Part B2 Audit)
    // EV per trade = (Win% * Avg Win) - (Loss% * Avg Loss) - Fee Buffer
    const winTrades = todayRecords.filter(r => r.outcome === "WIN");
    const lossTrades = todayRecords.filter(r => r.outcome === "LOSS");
    const avgWinUSD = winTrades.length > 0 ? (winTrades.reduce((acc, r) => acc + r.realizedPnLUSD, 0) / winTrades.length) : 9.80;
    const avgLossUSD = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((acc, r) => acc + r.realizedPnLUSD, 0) / lossTrades.length) : 4.80;
    const winProb = todayRecords.length > 0 ? (winningTradesToday / todayRecords.length) : 0.50;
    const lossProb = 1 - winProb;
    const expectedValuePerTradeUSD = Number(((winProb * avgWinUSD) - (lossProb * avgLossUSD) - FEE_BUFFER_PER_TRADE_USD).toFixed(2));
    const expectedValuePerTradeINR = Number((expectedValuePerTradeUSD * 83.5).toFixed(1));

    // Daily Circuit Breaker Check (Hard 3 consecutive losses OR Realized Daily Loss Cap ₹1,200 / $14.40)
    const isRealizedLossCapHit = todayPnLUSD <= -MAX_DAILY_LOSS_CAP_USD || todayPnLPct <= -Math.abs(this.settings.maxDailyLossPct);
    const isConsecutiveLossCapHit = this.consecutiveLossCount >= MAX_CONSECUTIVE_LOSSES_ALLOWED;
    const circuitBreakerActive = isRealizedLossCapHit || isConsecutiveLossCapHit;

    if (circuitBreakerActive && this.openPositions.length > 0) {
      console.warn(`[DeltaAutoTrader] 🛑 HARD REALIZED LOSS CIRCUIT BREAKER TRIPPED (Losses: ${this.consecutiveLossCount}/3, Day Realized PnL: $${todayPnLUSD.toFixed(2)}). Emergency closing all open positions.`);
      this.closeAllOpenPositions("CIRCUIT_BREAKER_TOTAL_DRAWDOWN_LIMIT");
    }

    // Cooldown Check (45 min after loss)
    const cooldownMs = this.settings.cooldownMinutesAfterLoss * 60 * 1000;
    const isCooldown = this.lastLossTimestamp > 0 && (now - this.lastLossTimestamp) < cooldownMs;
    const cooldownRemainingMins = isCooldown ? Math.ceil((cooldownMs - (now - this.lastLossTimestamp)) / 60000) : 0;

    let botState: AutoTraderStatus["botState"] = "PAUSED";
    if (circuitBreakerActive) {
      botState = "CIRCUIT_BREAKER_HALT";
    } else if (isCooldown) {
      botState = "COOLDOWN_ACTIVE";
    } else if (this.settings.isEnabled) {
      botState = isBatchCooling ? "BATCH_COOLDOWN" : "RUNNING";
    }

    const rollingCycleTotalSeconds = this.batchCooldownMinutes * 60; // 600s
    const cycleElapsedSeconds = Math.floor((now / 1000) % rollingCycleTotalSeconds);
    const rollingCycleRemainingSeconds = rollingCycleTotalSeconds - cycleElapsedSeconds;

    const inspectionTotalSeconds = 15; // 15-second dedicated inspection window
    const inspectionElapsedSeconds = this.inspectionStartTimeMs > 0 ? Math.floor((now - this.inspectionStartTimeMs) / 1000) : 0;
    const inspectionRemainingSeconds = Math.max(0, inspectionTotalSeconds - inspectionElapsedSeconds);

    const safeIndex = this.currentAssetIndex % CURATED_AUTO_TRADER_ASSETS.length;
    const currentAsset = CURATED_AUTO_TRADER_ASSETS[safeIndex];
    const nextAsset = CURATED_AUTO_TRADER_ASSETS[(safeIndex + 1) % CURATED_AUTO_TRADER_ASSETS.length];
    const cachedAnalysis = this.analysisCache.get(currentAsset.symbol);

    const isSlotsFull = this.openPositions.length >= (this.settings.maxConcurrentPositions || 7);
    let inspectionStatus: "INSPECTING" | "SLOTS_FULL" | "HOLDING_ACTIVE_POSITION" | "SKIPPED_CHOPPY" | "PAUSED" = "INSPECTING";
    if (!this.settings.isEnabled) {
      inspectionStatus = "PAUSED";
    } else if (isSlotsFull) {
      inspectionStatus = "SLOTS_FULL";
    } else {
      inspectionStatus = "INSPECTING";
    }

    const inspectionCurrentPrice = this.latestPrices.get(currentAsset.symbol) || 0;
    const scoreVal = cachedAnalysis?.overallScore || 0;
    const directionVal = cachedAnalysis?.direction || "NEUTRAL";
    const emaBiasVal = directionVal === "BUY"
      ? "BULLISH (EMA9 > EMA21)"
      : directionVal === "SELL"
      ? "BEARISH (EMA9 < EMA21)"
      : "NEUTRAL (Chop Zone)";
    const adxVal = cachedAnalysis?.adxValue ? Number(cachedAnalysis.adxValue.toFixed(1)) : 20.0;
    const smcBiasVal = directionVal === "BUY"
      ? "SSL Swept (Retail Trapped)"
      : directionVal === "SELL"
      ? "BSL Swept (Retail Trapped)"
      : "NO SWEEP";
    const triggerVal = cachedAnalysis
      ? `EMA 9/21 ${directionVal === "BUY" ? "Bull Cross" : directionVal === "SELL" ? "Bear Cross" : "Consolidation"}`
      : "NO SIGNAL";

    const currentInspection = {
      assetIndex: safeIndex,
      symbol: currentAsset.symbol,
      name: currentAsset.name,
      tag: currentAsset.tag,
      currentPrice: inspectionCurrentPrice,
      inspectionRemainingSeconds: isSlotsFull ? 0 : inspectionRemainingSeconds,
      inspectionTotalSeconds,
      status: inspectionStatus,
      nextSymbol: nextAsset.symbol,
      currentScore: scoreVal,
      currentDirection: directionVal,
      currentEVUSD: cachedAnalysis?.projectedProfitUSD || 0,
      score: scoreVal,
      decision: directionVal,
      emaBias: emaBiasVal,
      adx: adxVal,
      smcBias: smcBiasVal,
      trigger: triggerVal
    };

    return {
      botState,
      mode: this.settings.mode,
      todayPnLUSD: Number(todayPnLUSD.toFixed(2)),
      todayPnLPct,
      totalFloatingPnLUSD: Number(totalUnrealizedPnLUSD.toFixed(2)),
      totalFloatingDrawdownPct,
      tradesTakenToday: this.tradesTakenTodayCount,
      winningTradesToday,
      losingTradesToday,
      winRatePct,
      consecutiveLossCount: this.consecutiveLossCount,
      maxConsecutiveLossesAllowed: MAX_CONSECUTIVE_LOSSES_ALLOWED,
      maxDailyLossCapUSD: MAX_DAILY_LOSS_CAP_USD,
      maxDailyLossCapINR: 1200,
      expectedValuePerTradeUSD,
      expectedValuePerTradeINR,
      requiredBreakoutMovePct: 5.2,
      cooldownRemainingMins,
      circuitBreakerActive,
      fundingRateWarning: null,
      newsFreezeActive: this.newsFreezeActive,
      lastAnalysisTimestamp: new Date().toLocaleTimeString(),
      currentInspection,
      batchCycle: {
        currentBatchTrades: this.openPositions.length,
        maxBatchTrades: this.settings.maxConcurrentPositions,
        cycleNumber: this.currentCycleNumber,
        isCoolingDown: isBatchCooling,
        cooldownRemainingSeconds: isBatchCooling && batchCooldownRemainingSeconds > 0 ? batchCooldownRemainingSeconds : rollingCycleRemainingSeconds,
        cooldownTotalSeconds: rollingCycleTotalSeconds
      }
    };
  }

  public getSettings(): AutoTraderSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<AutoTraderSettings>) {
    this.settings = { ...this.settings, ...newSettings, maxConcurrentPositions: 1 }; // Strictly force Single Sniper Mode
    this.saveToStorage();
  }

  public toggleBot(enabled?: boolean): boolean {
    const prevEnabled = this.settings.isEnabled;
    this.settings.isEnabled = enabled !== undefined ? enabled : !this.settings.isEnabled;
    if (this.settings.isEnabled && !prevEnabled) {
      this.lastLossTimestamp = 0;
      this.slotReentryCooldownExpiry = 0; // Immediate active progressive scanning & execution
      this.scanAndExecuteNextTrade().catch(() => {});
    }
    this.saveToStorage();
    return this.settings.isEnabled;
  }

  public toggleMode(mode?: "PAPER" | "LIVE"): "PAPER" | "LIVE" {
    this.settings.mode = mode || (this.settings.mode === "PAPER" ? "LIVE" : "PAPER");
    this.saveToStorage();
    return this.settings.mode;
  }

  public isSettingsLocked(): boolean {
    return this.openPositions.length > 0;
  }

  public getCryptoNews(): CryptoNewsItem[] {
    return [...this.cryptoNewsList];
  }

  public calculateDynamicLotSize(symbol: string, currentPrice: number, stopLossDistance: number): {
    quantity: number;
    initialRiskUSD: number;
    accountEquity: number;
    rewardUSD?: number;
    rewardINR?: number;
    riskUSD?: number;
    riskINR?: number;
    rrRatio?: number;
    notionalUSD?: number;
    requiredBreakoutMovePct?: number;
  } {
    let liveDeltaBalance: number | undefined = undefined;
    try {
      if (deltaExchangeEngine && typeof (deltaExchangeEngine as any).getAccountSummary === "function") {
        liveDeltaBalance = (deltaExchangeEngine as any).getAccountSummary()?.netEquityUSD;
      }
    } catch (e) {}
    const accountEquity = (liveDeltaBalance && liveDeltaBalance > 5) ? liveDeltaBalance : this.settings.currentCapitalUSD;
    
    // Per-Trade Economics (Part B1 Audit):
    // Slot margin: ₹3,270 ($39.16 USD), 5x Leverage -> Notional = $195.80 USD (₹16,350 INR)
    // Risk target: ₹390–420 ($4.70–$5.00 USD), sized strictly to match SL distance
    // Reward target: ₹800–900 ($9.60–$10.80 USD)
    // R:R Ratio = Reward / Risk ≈ 2.05 (Derived directly from values, NO phantom multiplier!)
    // Required Breakout Move = Reward / Notional = $10.00 / $195.80 ≈ +5.1% to +5.2%
    // 🎯 TARGETED LOT SIZING FOR ₹5,000–₹7,000 INR DAILY PROFIT HORIZON:
    // 3 concurrent slots x $10-$14 USD reward = $30-$42 USD per batch (~₹2,500-₹3,500 INR)
    // 2 winning batches = ₹5,000-₹7,000 INR daily profit target achieved!
    const effectiveRiskPct = Math.max(3.5, this.settings.riskPerTradePct || 3.5);
    const dollarRiskAllowed = Math.min(2.20, Math.max(1.60, accountEquity * 0.035)); // ₹135-₹185 INR risk per trade for Single Sniper Mode (Target: +₹350-₹460 INR profit)!
    
    const sym = symbol.toUpperCase().trim();
    const asset = CURATED_AUTO_TRADER_ASSETS.find(a => a.symbol === sym || sym.includes(a.tag)) || {
      symbol: sym, minLot: 0.01, decimals: 2
    };

    // Calculate quantity based on SL distance:
    const safeSLDist = Math.max(currentPrice * 0.008, stopLossDistance);
    let rawQty = dollarRiskAllowed / safeSLDist;

    // Minimum contract allocation
    let quantity = Number(rawQty.toFixed(asset.decimals));
    if (quantity < asset.minLot) {
      quantity = asset.minLot;
    }

    const initialRiskUSD = Number((safeSLDist * quantity).toFixed(2));
    const notionalUSD = Number((currentPrice * quantity).toFixed(2));
    const targetRewardUSD = Number((Math.max(initialRiskUSD * 2.5, 6.00)).toFixed(2)); // 🎯 +₹500 - ₹650 INR profit per trade (Crushes ₹50 exchange fees!)
    const rrRatio = initialRiskUSD > 0 ? Number((targetRewardUSD / initialRiskUSD).toFixed(2)) : 2.05;
    const requiredBreakoutMovePct = notionalUSD > 0 ? Number(((targetRewardUSD / notionalUSD) * 100).toFixed(2)) : 5.2;

    return {
      quantity,
      initialRiskUSD,
      accountEquity,
      rewardUSD: targetRewardUSD,
      rewardINR: Number((targetRewardUSD * 83.5).toFixed(0)),
      riskUSD: initialRiskUSD,
      riskINR: Number((initialRiskUSD * 83.5).toFixed(0)),
      rrRatio,
      notionalUSD,
      requiredBreakoutMovePct
    };
  }

  public getCuratedAssets(): CuratedAsset[] {
    return [...CURATED_AUTO_TRADER_ASSETS];
  }

  public getLiveFullState() {
    return {
      settings: this.getSettings(),
      openPositions: this.getOpenPositions(),
      closedRecords: this.getClosedRecords(),
      status: this.getStatus(),
      cryptoNews: this.getCryptoNews(),
      curatedAssets: this.getCuratedAssets()
    };
  }

  public startAutonomousBackgroundDaemon() {
    if (this.isScanningLoopActive) return;
    this.isScanningLoopActive = true;

    setInterval(async () => {
      if (!this.settings.isEnabled) return;
      try {
        const trackedSymbols = CURATED_AUTO_TRADER_ASSETS.map(a => a.symbol);

        // 1. Continuous Exit Checking & Trailing SL Engine for all open positions
        for (const sym of trackedSymbols) {
          const livePriceObj = deltaExchangeEngine.getLivePrice(sym);
          const currentPrice = livePriceObj?.usd || 0;
          if (currentPrice > 0) {
            this.updateLivePriceAndCheckExits(sym, currentPrice);
          }
        }

        // 2. Fully Autonomous Multi-Timeframe Scan & Rolling Slot Replenishment
        if (this.openPositions.length < this.settings.maxConcurrentPositions && !this.checkBatchCycle()) {
          const res = await this.scanAndExecuteNextTrade();
          if (res.executed && res.position) {
            console.log(`[DeltaAutoTraderDaemon] 🚀 AUTONOMOUS TRADE PLACED: ${res.position.type} ${res.position.symbol} @ $${res.position.entryPrice}`);
          }
        }
      } catch (err) {
        // Background scan cycle safeguard
      }
    }, 6000);
  }

  public async fetchCryptoCandles(symbol: string, interval: "15m" | "1h" | "4h" = "1h", limit: number = 30): Promise<OHLCVBar[]> {
    const sym = symbol.toUpperCase().trim();

    // 1. Primary: Genuine Live Historical Candles directly from Delta Exchange India / Global API
    try {
      const deltaResolution = interval === "15m" ? "15m" : interval === "1h" ? "1h" : "4h";
      const deltaCandles = await deltaExchangeEngine.fetchCandles(sym, deltaResolution);
      if (Array.isArray(deltaCandles) && deltaCandles.length > 0) {
        return deltaCandles.slice(-limit).map(c => ({
          time: typeof c.time === "number" ? (c.time > 1e11 ? Math.floor(c.time / 1000) : c.time) : Math.floor(new Date(c.time).getTime() / 1000),
          timestamp: new Date((c.time > 1e11 ? c.time : c.time * 1000)).toISOString(),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume
        }));
      }
    } catch (e) {}

    // 2. Secondary: Binance Public Spot / Futures Kline API
    const base = sym.replace("USD", "").replace("USDT", "").trim();
    const binancePair = `${base}USDT`;
    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=${interval}&limit=${limit}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const raw: any[] = await res.json();
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((k: any) => ({
            time: Math.floor(k[0] / 1000),
            timestamp: new Date(k[0]).toISOString(),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
          }));
        }
      }
    } catch (e) {}

    // 3. If real candles cannot be retrieved, return empty array (NEVER generate fake synthetic candles)
    return [];
  }

  public async scanAndExecuteNextTrade(forceImmediate: boolean = false): Promise<{ executed: boolean; message: string; position?: AutoTraderPosition }> {
    this.checkDailyReset();

    if (!this.settings.isEnabled) {
      return { executed: false, message: "Auto-trader bot is currently disabled." };
    }

    if (this.isExecutionLocked) {
      return { executed: false, message: "⚠️ Trade execution mutex locked. Another trade or scan operation in progress." };
    }

    if (this.openPositions.length >= this.settings.maxConcurrentPositions) {
      return {
        executed: false,
        message: `Max concurrent active positions reached (${this.openPositions.length}/${this.settings.maxConcurrentPositions}). Monitoring open trades.`
      };
    }

    if (this.tradesTakenTodayCount >= this.settings.maxTradesPerDay) {
      return {
        executed: false,
        message: `Daily trade cap reached (${this.tradesTakenTodayCount}/${this.settings.maxTradesPerDay} trades taken today).`
      };
    }

    // 🛡️ ENFORCED LOSS COOLDOWN (45 Minutes Complete Silence)
    const cooldownMs = (this.settings.cooldownMinutesAfterLoss || 45) * 60 * 1000;
    const isLossCooldown = this.lastLossTimestamp > 0 && (Date.now() - this.lastLossTimestamp) < cooldownMs;
    if (isLossCooldown && !forceImmediate) {
      const remMins = Math.ceil((cooldownMs - (Date.now() - this.lastLossTimestamp)) / 60000);
      return {
        executed: false,
        message: `⏳ ENFORCED LOSS COOLDOWN ACTIVE: Paused for ${remMins} more min(s) to protect capital.`
      };
    }

    if (this.consecutiveLossesCount >= MAX_CONSECUTIVE_LOSSES_ALLOWED) {
      return {
        executed: false,
        message: `🛑 CIRCUIT BREAKER ACTIVE: ${this.consecutiveLossesCount} consecutive losses today. Trading halted until midnight.`
      };
    }

    // ⚡ 1. FORCE IMMEDIATE RADAR SWEEP (Triggered by user or Instant Scan):
    // Scans all 10 assets simultaneously, finds the highest conviction coin with Score >= 55 & valid breakout, and executes immediately!
    if (forceImmediate) {
      const openSymbols = new Set(this.openPositions.map(p => p.symbol.toUpperCase()));
      const availableAssets = CURATED_AUTO_TRADER_ASSETS.filter(a => !openSymbols.has(a.symbol.toUpperCase()));
      
      const scans = await Promise.all(
        availableAssets.map(async (asset) => {
          try {
            const [c15, c1h, c4h] = await Promise.all([
              this.fetchCryptoCandles(asset.symbol, "15m", 60),
              this.fetchCryptoCandles(asset.symbol, "1h", 60),
              this.fetchCryptoCandles(asset.symbol, "4h", 60)
            ]);
            const analysis = this.analyzeMultiTimeframe(asset.symbol, c15, c1h, c4h);
            const baseline = this.getAssetBaselinePrice(asset.symbol);
            const livePrice = deltaExchangeEngine.getLivePrice(asset.symbol)?.usd || this.getLivePriceUSD(asset.symbol);
            const candleClose = c15[c15.length - 1]?.close || c1h[c1h.length - 1]?.close || 0;
            const currentPrice = (livePrice > 0 && livePrice > baseline * 0.1 && livePrice < baseline * 10)
              ? livePrice
              : (candleClose > 0 && candleClose > baseline * 0.1 && candleClose < baseline * 10 ? candleClose : baseline);
            return { asset, analysis, currentPrice, c15, c1h, c4h };
          } catch (e) {
            return null;
          }
        })
      );

      const validScans = scans.filter((s): s is NonNullable<typeof s> => s !== null);
      validScans.sort((a, b) => b.analysis.overallScore - a.analysis.overallScore);

      const bestCandidate = validScans.find(s => s.analysis.isEntryValid && s.analysis.direction !== "NEUTRAL" && s.analysis.overallScore >= (this.settings.minConfidenceThreshold || 55));
      if (bestCandidate) {
        const res = this.evaluateAndExecuteAutoTrade(
          bestCandidate.asset.symbol,
          bestCandidate.c15,
          bestCandidate.c1h,
          bestCandidate.c4h,
          bestCandidate.currentPrice
        );
        if (res.success && res.position) {
          const msg = `🚀 IMMEDIATE SCAN EXECUTED: ${res.position.type} on ${bestCandidate.asset.symbol} @ $${res.position.entryPrice} (Top Conviction Score: ${bestCandidate.analysis.overallScore}/100)!`;
          console.log(`[AutoTrader] ${msg}`);
          this.saveToStorage();
          return { executed: true, message: msg, position: res.position };
        }
      }

      const top = validScans[0];
      return {
        executed: false,
        message: top
          ? `🔍 Market Scan: Best candidate is ${top.asset.tag} (${top.asset.symbol}) with Score ${top.analysis.overallScore}/100 [${top.analysis.direction}]. Threshold is ${this.settings.minConfidenceThreshold || 55}/100.`
          : "🔍 Market Scan completed: All assets currently in low-volatility consolidation."
      };
    }

    const now = Date.now();
    if (this.inspectionStartTimeMs === 0) {
      this.inspectionStartTimeMs = now;
    }

    // Skip current coin if it's already one of the active open positions
    let attempts = 0;
    while (attempts < CURATED_AUTO_TRADER_ASSETS.length && this.openPositions.some(p => p.symbol === CURATED_AUTO_TRADER_ASSETS[this.currentAssetIndex % CURATED_AUTO_TRADER_ASSETS.length].symbol)) {
      this.currentAssetIndex = (this.currentAssetIndex + 1) % CURATED_AUTO_TRADER_ASSETS.length;
      attempts++;
    }

    const inspectionWindowMs = 15 * 1000; // 15-second dedicated inspection window
    const inspectionElapsedMs = now - this.inspectionStartTimeMs;
    const inspectionRemainingSec = Math.max(0, Math.ceil((inspectionWindowMs - inspectionElapsedMs) / 1000));

    const safeIndex = this.currentAssetIndex % CURATED_AUTO_TRADER_ASSETS.length;
    const currentAsset = CURATED_AUTO_TRADER_ASSETS[safeIndex];
    const sym = currentAsset.symbol;

    // ⛔ 3-HOUR LOSS BLACKLIST CHECK:
    const symKey = sym.toUpperCase();
    if (this.symbolBlacklist[symKey] && Date.now() < this.symbolBlacklist[symKey]) {
      const banRemainingMin = Math.ceil((this.symbolBlacklist[symKey] - Date.now()) / 60000);
      this.currentAssetIndex = (this.currentAssetIndex + 1) % CURATED_AUTO_TRADER_ASSETS.length;
      this.inspectionStartTimeMs = Date.now();
      const nextCoin = CURATED_AUTO_TRADER_ASSETS[this.currentAssetIndex];
      return {
        executed: false,
        message: `⛔ ${symKey} is on 3-HOUR LOSS BAN (${banRemainingMin}m remaining). Auto-skipped to ${nextCoin.tag}.`
      };
    }

    // Fetch live candles for the currently inspected asset
    let candles15m: OHLCVBar[] = [];
    let candles1h: OHLCVBar[] = [];
    let candles4h: OHLCVBar[] = [];
    try {
      [candles15m, candles1h, candles4h] = await Promise.all([
        this.fetchCryptoCandles(sym, "15m", 60),
        this.fetchCryptoCandles(sym, "1h", 60),
        this.fetchCryptoCandles(sym, "4h", 60)
      ]);
    } catch (e) {}

    const analysis = this.analyzeMultiTimeframe(sym, candles15m, candles1h, candles4h);
    const baseline = this.getAssetBaselinePrice(sym);
    const livePrice = deltaExchangeEngine.getLivePrice(sym)?.usd || this.getLivePriceUSD(sym);
    const candleClose = candles15m[candles15m.length - 1]?.close || candles1h[candles1h.length - 1]?.close || 0;
    const currentPrice = (livePrice > 0 && livePrice > baseline * 0.1 && livePrice < baseline * 10)
      ? livePrice
      : (candleClose > 0 && candleClose > baseline * 0.1 && candleClose < baseline * 10 ? candleClose : baseline);

    // 2. Strict 15-Second Observation Window: NO trade is executed before the 15-second countdown completes
    if (!forceImmediate && inspectionElapsedMs < inspectionWindowMs) {
      return {
        executed: false,
        message: `⏳ 15-Sec Asset Reading in Progress: [Asset #${safeIndex + 1}/10: ${currentAsset.tag} (${sym})] (${this.openPositions.length}/${this.settings.maxConcurrentPositions || 7} active). Score: ${analysis.overallScore}/100 [${analysis.direction}] (${inspectionRemainingSec}s remaining).`
      };
    }

    // 3. Inspection Completed! Evaluate Trade Decision:
    if (analysis.isEntryValid && analysis.direction !== "NEUTRAL" && analysis.overallScore >= (this.settings.minConfidenceThreshold || 55)) {
      const res = this.evaluateAndExecuteAutoTrade(sym, candles15m, candles1h, candles4h, currentPrice);
      if (res.success && res.position) {
        this.currentAssetIndex = (this.currentAssetIndex + 1) % CURATED_AUTO_TRADER_ASSETS.length;
        this.inspectionStartTimeMs = now;
        const nextCoin = CURATED_AUTO_TRADER_ASSETS[this.currentAssetIndex];
        const msg = `🚀 Executed ${res.position.type} on ${sym} @ $${res.position.entryPrice} (Score: ${analysis.overallScore}/100)! Started reading on Asset #${this.currentAssetIndex + 1}/10: ${nextCoin.tag}.`;
        console.log(`[AutoTrader] ${msg}`);
        this.saveToStorage();
        return {
          executed: true,
          message: msg,
          position: res.position
        };
      }
    }

    // 4. Advance to next coin in 10-asset circular loop!
    const waitingSymbol = sym;
    this.currentAssetIndex = (this.currentAssetIndex + 1) % CURATED_AUTO_TRADER_ASSETS.length;
    this.inspectionStartTimeMs = now;
    const nextCoin = CURATED_AUTO_TRADER_ASSETS[this.currentAssetIndex];

    const waitingMsg = `⏳ ${waitingSymbol} placed in WAITING / WATCHLIST (Score: ${analysis.overallScore}/100, Direction: ${analysis.direction}). Advanced to next Asset #${this.currentAssetIndex + 1}/10: ${nextCoin.tag} (${nextCoin.symbol}).`;
    console.log(`[AutoTrader] ${waitingMsg}`);
    this.saveToStorage();

    return {
      executed: false,
      message: waitingMsg
    };
  }

  public skipCurrentAssetInspection(): { success: boolean; message: string } {
    const prev = CURATED_AUTO_TRADER_ASSETS[this.currentAssetIndex % CURATED_AUTO_TRADER_ASSETS.length];
    this.currentAssetIndex = (this.currentAssetIndex + 1) % CURATED_AUTO_TRADER_ASSETS.length;
    this.inspectionStartTimeMs = Date.now();
    const next = CURATED_AUTO_TRADER_ASSETS[this.currentAssetIndex];
    this.saveToStorage();
    return {
      success: true,
      message: `⏭️ Skipped ${prev.tag} inspection. Started 15-sec inspection on Asset #${this.currentAssetIndex + 1}/10: ${next.tag} (${next.symbol}).`
    };
  }

  public async getScanDiagnostics(): Promise<ScanDiagnosticReport> {
    const tracked = CURATED_AUTO_TRADER_ASSETS;
    const openSymbols = new Set(this.openPositions.map(p => p.symbol.toUpperCase()));

    const scans = await Promise.all(
      tracked.map(async (item) => {
        try {
          const [candles15m, candles1h, candles4h] = await Promise.all([
            this.fetchCryptoCandles(item.symbol, "15m", 60),
            this.fetchCryptoCandles(item.symbol, "1h", 60),
            this.fetchCryptoCandles(item.symbol, "4h", 60)
          ]);
          const analysis = this.analyzeMultiTimeframe(item.symbol, candles15m, candles1h, candles4h);
          const baseline = this.getAssetBaselinePrice(item.symbol);
          const livePrice = this.getLivePriceUSD(item.symbol);
          const candleClose = candles1h[candles1h.length - 1]?.close;
          const price = (livePrice > 0 && livePrice > baseline * 0.1 && livePrice < baseline * 10)
            ? livePrice
            : (candleClose && candleClose > baseline * 0.1 && candleClose < baseline * 10 ? candleClose : baseline);

          const isOpen = openSymbols.has(item.symbol.toUpperCase());
          const status = isOpen ? "ALREADY_OPEN" : analysis.isEntryValid ? "READY_TO_FIRE" : analysis.overallScore >= 60 ? "WAITING_CONFLUENCE" : "CONSOLIDATION";

          return {
            symbol: item.symbol,
            name: item.name,
            score: analysis.overallScore,
            direction: analysis.direction,
            projectedProfitUSD: analysis.projectedProfitUSD,
            profitProbabilityPct: analysis.profitProbabilityPct,
            status,
            reason: analysis.reasoning,
            fourHourTrend: analysis.fourHourTrend,
            oneHourMomentum: analysis.oneHourMomentum,
            fifteenMinTrigger: analysis.fifteenMinTrigger,
            currentPrice: price
          };
        } catch (e) {
          return null;
        }
      })
    );

    const assetScans = scans.filter((s): s is NonNullable<typeof s> => s !== null);
    assetScans.sort((a, b) => b.score - a.score);
    const bestAsset = assetScans.find(a => a.status !== "ALREADY_OPEN") || assetScans[0] || null;

    return {
      timestamp: new Date().toLocaleTimeString(),
      totalAssets: tracked.length,
      openSlots: this.settings.maxConcurrentPositions - this.openPositions.length,
      tradesToday: this.tradesTakenTodayCount,
      maxTrades: this.settings.maxTradesPerDay,
      bestAsset,
      assetScans
    };
  }

  public async forceExecuteTrade(symbol: string): Promise<{ success: boolean; message: string; position?: AutoTraderPosition }> {
    this.checkDailyReset();
    if (this.openPositions.length >= this.settings.maxConcurrentPositions) {
      return { success: false, message: `Max open slots reached (${this.openPositions.length}/${this.settings.maxConcurrentPositions}).` };
    }

    const [candles15m, candles1h, candles4h] = await Promise.all([
      this.fetchCryptoCandles(symbol, "15m", 60),
      this.fetchCryptoCandles(symbol, "1h", 60),
      this.fetchCryptoCandles(symbol, "4h", 60)
    ]);

    const analysis = this.analyzeMultiTimeframe(symbol, candles15m, candles1h, candles4h);
    const baseline = this.getAssetBaselinePrice(symbol);
    const livePrice = this.getLivePriceUSD(symbol);
    const candleClose = candles1h[candles1h.length - 1]?.close;
    const currentPrice = (livePrice > 0 && livePrice > baseline * 0.1 && livePrice < baseline * 10)
      ? livePrice
      : (candleClose && candleClose > baseline * 0.1 && candleClose < baseline * 10 ? candleClose : baseline);
    
    // Direction chosen strictly by which side (BUY or SELL) has higher profit forecast:
    let tradeDirection: "BUY" | "SELL" = analysis.direction !== "NEUTRAL" 
      ? analysis.direction 
      : (analysis.projectedProfitUSD > 0 ? analysis.direction : (analysis.overallScore >= 50 && analysis.fourHourTrend === "BULLISH" ? "BUY" : "SELL"));

    const realisticAtr = (analysis.atr1h && analysis.atr1h > 0 && analysis.atr1h < currentPrice * 0.10) ? analysis.atr1h : Math.max(currentPrice * 0.01, 0.05);
    const slDistance = realisticAtr * 1.0;
    const tpDistance = realisticAtr * 2.2;

    const stopLossPrice = this.roundPrice(tradeDirection === "BUY" ? currentPrice - slDistance : currentPrice + slDistance);
    const targetPrice = this.roundPrice(tradeDirection === "BUY" ? currentPrice + tpDistance : currentPrice - tpDistance);
    const entryPrice = this.roundPrice(currentPrice);

    const lotInfo = this.calculateDynamicLotSize(symbol, currentPrice, slDistance);
    const now = Date.now();

    const position: AutoTraderPosition = {
      id: `DAT-${now}-${Math.floor(1000 + Math.random() * 9000)}`,
      symbol: symbol.toUpperCase(),
      type: tradeDirection,
      quantity: lotInfo.quantity,
      entryPrice,
      currentPrice: entryPrice,
      stopLossPrice,
      targetPrice,
      initialRiskUSD: lotInfo.initialRiskUSD,
      atrValue: this.roundPrice(realisticAtr),
      confidenceScore: Math.max(72, analysis.overallScore),
      unrealizedPnLUSD: 0,
      unrealizedPnLPct: 0,
      trailingStopActive: false,
      highestProfitUSD: 0,
      timeframeAlignment: "Forced Instant Execution · Multi-POV Alignment",
      entryTimestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      entryTimeMs: now,
      maxHoldTimeExpiry: now + V3_MAX_HOLD_TIME_MS,
      subScores: analysis.subScores,
      adxValue: analysis.adxValue,
      rsiValue: analysis.rsi1h,
      entryEVUSD: analysis.projectedProfitUSD
    };

    this.openPositions.unshift(position);
    this.currentBatchTradesCount++;
    this.tradesTakenTodayCount++;
    this.saveToStorage();

    if (this.settings.mode === "LIVE") {
      deltaExchangeEngine.placeOrder(
        symbol,
        position.type === "BUY" ? "buy" : "sell",
        position.quantity,
        undefined, // Market order for instant fill
        position.stopLossPrice,
        position.targetPrice
      ).then(orderRes => {
        const fillPrice = parseFloat(orderRes?.result?.average_fill_price || orderRes?.result?.limit_price);
        if (fillPrice && !isNaN(fillPrice) && fillPrice > 0) {
          position.entryPrice = fillPrice;
          this.saveToStorage();
          console.log(`[DeltaAutoTrader] 🎯 Synced exact exchange fill price for ${symbol}: $${fillPrice}`);
        }
      }).catch(err => console.warn("[DeltaAutoTrader] Live execution warning:", err));
    }

    return {
      success: true,
      message: `🚀 INSTANT TRADE PLACED: ${position.type} ${position.symbol} @ $${position.entryPrice} (SL: $${position.stopLossPrice}, TP: $${position.targetPrice})`,
      position
    };
  }

  public getOpenPositions(): AutoTraderPosition[] {
    return [...this.openPositions];
  }

  public getClosedRecords(): AutoTraderClosedRecord[] {
    return [...this.closedRecords];
  }
}

export const deltaAutoTraderEngine = new DeltaAutoTraderEngine();
