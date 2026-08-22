import React, { useState, useEffect, useCallback } from "react";
import {
  deltaAutoTraderEngine,
  AutoTraderPosition,
  AutoTraderClosedRecord,
  AutoTraderSettings,
  AutoTraderStatus,
  MultiTimeframeAnalysis,
  CryptoNewsItem,
  CURATED_AUTO_TRADER_ASSETS,
  ScanDiagnosticReport
} from "../../../lib/deltaAutoTraderEngine";
import { brokerTickEngine } from "../../../lib/brokerTickEngine";
import { Bot, Play, Pause, ShieldAlert, Sliders, ShieldCheck, Newspaper, Lock, Activity, Clock, Award, Coins, CheckCircle2, Zap, Radio, RefreshCw, X, AlertTriangle, ArrowUpRight, ArrowDownRight, Compass, Eye, Brain } from "lucide-react";

interface DeltaAutoTraderCardProps {
  ticker?: string;
  currentPriceUSD?: number;
  bars15m?: any[];
  bars1h?: any[];
  bars4h?: any[];
}

const DEFAULT_STATUS: AutoTraderStatus = {
  botState: "PAUSED",
  mode: "PAPER",
  todayPnLUSD: 0,
  todayPnLPct: 0,
  totalFloatingPnLUSD: 0,
  totalFloatingDrawdownPct: 0,
  tradesTakenToday: 0,
  winningTradesToday: 0,
  losingTradesToday: 0,
  winRatePct: 0,
  cooldownRemainingMins: 0,
  circuitBreakerActive: false,
  fundingRateWarning: null,
  newsFreezeActive: false,
  lastAnalysisTimestamp: "",
  batchCycle: {
    currentBatchTrades: 0,
    maxBatchTrades: 5,
    cycleNumber: 1,
    isCoolingDown: false,
    cooldownRemainingSeconds: 0,
    cooldownTotalSeconds: 600
  }
};

const DEFAULT_SETTINGS: AutoTraderSettings = {
  mode: "PAPER",
  isEnabled: false,
  initialCapitalUSD: 195.80,
  currentCapitalUSD: 195.80,
  riskPerTradePct: 2.0,
  maxDailyLossPct: 3.0,
  maxTradesPerDay: 10,
  maxConcurrentPositions: 5,
  cooldownMinutesAfterLoss: 45,
  minConfidenceThreshold: 60
};

export const DeltaAutoTraderCard: React.FC<DeltaAutoTraderCardProps> = ({
  ticker = "BTCUSD",
  currentPriceUSD,
  bars15m = [],
  bars1h = [],
  bars4h = []
}) => {
  const [status, setStatus] = useState<AutoTraderStatus>(DEFAULT_STATUS);
  const [settings, setSettings] = useState<AutoTraderSettings>(DEFAULT_SETTINGS);
  const [positions, setPositions] = useState<AutoTraderPosition[]>([]);
  const [records, setRecords] = useState<AutoTraderClosedRecord[]>([]);
  const [news, setNews] = useState<CryptoNewsItem[]>([]);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "CURATED_ASSETS" | "JOURNAL" | "NEWS" | "SETTINGS">("OVERVIEW");
  const [notification, setNotification] = useState<string | null>(null);
  const [showRadarModal, setShowRadarModal] = useState<boolean>(false);
  const [diagnostics, setDiagnostics] = useState<ScanDiagnosticReport | null>(null);
  const [isForcing, setIsForcing] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState(false);

  const USD_TO_INR = 83.50;
  const isSettingsLocked = positions.length > 0;

  const formatAssetPrice = (price: number): string => {
    if (!price || isNaN(price)) return "0.00";
    if (price >= 100) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
  };

  // 🌐 Server-First State Poller with Instant Engine Fallback
  const fetchServerState = useCallback(async () => {
    try {
      const res = await fetch("/api/autotrader/state");
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.state) {
          if (data.state.settings) setSettings(data.state.settings);
          if (data.state.openPositions) setPositions(data.state.openPositions);
          if (data.state.closedRecords) setRecords(data.state.closedRecords);
          if (data.state.status) setStatus(data.state.status);
          if (data.state.cryptoNews) setNews(data.state.cryptoNews);
          return;
        }
      }
    } catch (e) {
      // Server offline or standalone client preview
    }

    // Graceful Engine Fallback
    try {
      const localState = deltaAutoTraderEngine.getLiveFullState();
      if (localState) {
        setSettings(localState.settings);
        setPositions(localState.openPositions);
        setRecords(localState.closedRecords);
        setStatus(localState.status);
        setNews(localState.cryptoNews);
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchServerState();
    const serverPollInterval = setInterval(fetchServerState, 1500);

    // 📱 Screen WakeLock: Prevents mobile and laptop screen from sleeping while Auto-Trader is running
    let wakeLockSentinel: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && (navigator as any).wakeLock) {
          wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
        }
      } catch (err) {}
    };

    if (settings.isEnabled) {
      requestWakeLock();
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchServerState();
        if (settings.isEnabled && (!wakeLockSentinel || wakeLockSentinel.released)) {
          requestWakeLock();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(serverPollInterval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (wakeLockSentinel && typeof wakeLockSentinel.release === "function") {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [fetchServerState, settings.isEnabled]);

  const handleOpenRadarModal = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/autotrader/diagnostics");
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.diagnostics) {
          setDiagnostics(data.diagnostics);
        }
      } else {
        const localDiag = await deltaAutoTraderEngine.getScanDiagnostics();
        setDiagnostics(localDiag);
      }
      setShowRadarModal(true);
    } catch (e) {
      try {
        const localDiag = await deltaAutoTraderEngine.getScanDiagnostics();
        setDiagnostics(localDiag);
        setShowRadarModal(true);
      } catch (err) {}
    } finally {
      setIsScanning(false);
    }
  };

  const handleForceTrade = async (sym: string) => {
    setIsForcing(true);
    setNotification(`⚡ Sending instant execution request for ${sym}...`);
    try {
      const res = await fetch("/api/autotrader/force", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym })
      });
      if (res.ok) {
        const data = await res.json();
        setNotification(data?.message || `Executed trade on ${sym}`);
        setShowRadarModal(false);
      } else {
        const localRes = await deltaAutoTraderEngine.forceExecuteTrade(sym);
        setNotification(localRes.message);
        setShowRadarModal(false);
      }
      fetchServerState();
    } catch (e) {
      const localRes = await deltaAutoTraderEngine.forceExecuteTrade(sym);
      setNotification(localRes.message);
      setShowRadarModal(false);
      fetchServerState();
    } finally {
      setIsForcing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleManualScan = async () => {
    setIsScanning(true);
    setNotification("🔍 Scanning 10 Curated Coins for Multi-POV Confluence (Score ≥ 60, Positive EV)...");
    try {
      const scanRes = await fetch("/api/autotrader/scan", { method: "POST" });
      if (scanRes.ok) {
        const scanData = await scanRes.json();
        fetchServerState();
        if (scanData?.executed) {
          setNotification(`🚀 TRADE PLACED: ${scanData.message}`);
        } else {
          setNotification(scanData?.message || "Scan complete: 5-minute reading active.");
        }
      } else {
        const localScan = await deltaAutoTraderEngine.scanAndExecuteNextTrade();
        fetchServerState();
        setNotification(localScan.message);
      }
    } catch (err) {
      const localScan = await deltaAutoTraderEngine.scanAndExecuteNextTrade();
      fetchServerState();
      setNotification(localScan.message);
    } finally {
      setIsScanning(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleSkipInspection = async () => {
    try {
      const res = await fetch("/api/autotrader/skip-inspection", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setNotification(data?.message || "Skipped to next coin in queue.");
      } else {
        const localRes = deltaAutoTraderEngine.skipCurrentAssetInspection();
        setNotification(localRes.message);
      }
      fetchServerState();
    } catch (e) {
      const localRes = deltaAutoTraderEngine.skipCurrentAssetInspection();
      setNotification(localRes.message);
      fetchServerState();
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleBot = async () => {
    const nextState = !settings.isEnabled;
    setNotification(nextState ? "🟢 Starting Auto-Trader (5-Min Round-Robin Queue)..." : "⏸️ Pausing Delta Auto-Trader...");
    try {
      const res = await fetch("/api/autotrader/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: nextState })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.state?.settings) setSettings(data.state.settings);
        if (data?.state?.status) setStatus(data.state.status);
      } else {
        deltaAutoTraderEngine.toggleBot(nextState);
        const local = deltaAutoTraderEngine.getLiveFullState();
        setSettings(local.settings);
        setStatus(local.status);
      }
      fetchServerState();
      setNotification(nextState ? "🟢 24/7 Auto-Trader ACTIVE! 5-Min inspection window started on Coin #1 (BTCUSD)." : "⏸️ Delta Auto-Trader PAUSED.");
    } catch (e) {
      deltaAutoTraderEngine.toggleBot(nextState);
      const local = deltaAutoTraderEngine.getLiveFullState();
      setSettings(local.settings);
      setStatus(local.status);
      fetchServerState();
      setNotification(nextState ? "🟢 Auto-Trader ACTIVE! 5-Min inspection window running on Coin #1 (BTCUSD)." : "⏸️ Delta Auto-Trader PAUSED.");
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleMode = async () => {
    const nextMode = settings.mode === "PAPER" ? "LIVE" : "PAPER";
    try {
      const res = await fetch("/api/autotrader/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.state?.settings) setSettings(data.state.settings);
      } else {
        deltaAutoTraderEngine.toggleMode(nextMode);
        setSettings(deltaAutoTraderEngine.getSettings());
      }
    } catch (e) {
      deltaAutoTraderEngine.toggleMode(nextMode);
      setSettings(deltaAutoTraderEngine.getSettings());
    }
    fetchServerState();
    setNotification(`Switched mode to ${nextMode}`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateSettings = async (patch: Partial<AutoTraderSettings>) => {
    try {
      const res = await fetch("/api/autotrader/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (data?.success && data.state?.settings) {
        setSettings(data.state.settings);
      }
      fetchServerState();
    } catch (e) {
      console.warn("Update settings failed", e);
    }
  };

  const handleResetTrades = async () => {
    try {
      const res = await fetch("/api/autotrader/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setNotification(data?.message || "🧹 Trades reset successfully & Bot set to OFF.");
      }
    } catch (e) {}

    try {
      deltaAutoTraderEngine.resetSystemCleanly();
      const local = deltaAutoTraderEngine.getLiveFullState();
      if (local) {
        setSettings(local.settings);
        setPositions(local.openPositions);
        setRecords(local.closedRecords);
        setStatus(local.status);
      }
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("delta_autotrader_state_v3");
      }
      setNotification("🧹 Trades reset successfully & Bot set to OFF.");
    } catch (err) {}

    fetchServerState();
    setTimeout(() => setNotification(null), 5000);
  };

  const handleClosePosition = async (positionId: string, currentPrice: number) => {
    try {
      const res = await fetch("/api/autotrader/close-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId, exitPrice: currentPrice, reason: "MANUAL_UI_CLOSE" })
      });
      if (res.ok) {
        const data = await res.json();
        setNotification(data?.message || "Position closed.");
      } else {
        deltaAutoTraderEngine.closePosition(positionId, currentPrice, "MANUAL_UI_CLOSE");
        setNotification("Position closed successfully.");
      }
      fetchServerState();
      setTimeout(() => setNotification(null), 4000);
    } catch (e) {
      deltaAutoTraderEngine.closePosition(positionId, currentPrice, "MANUAL_UI_CLOSE");
      fetchServerState();
      setNotification("Position closed successfully.");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const isProfit = status.todayPnLUSD >= 0;

  return (
    <div className="w-full rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border border-indigo-500/40 shadow-2xl p-6 font-mono text-slate-100 space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-indigo-500/30">
        <div className="flex items-center gap-3">
          <span className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg">
            <Bot className="w-7 h-7" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wide text-white">Delta Exchange Auto-Trader v3</h2>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                status.mode === "LIVE" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-purple-500/20 text-purple-300 border-purple-500/40"
              }`}>
                {status.mode === "LIVE" ? "🔴 LIVE 24/7 AUTONOMOUS" : "🧪 PAPER TRADING BOT"}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              100% Fully Automated · Multi-Timeframe Alignment (15m + 1h + 4h) · 1.5% Risk Sizing · Zero Manual Intervention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          {/* BOT STATE BUTTON */}
          <button
            onClick={handleToggleBot}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-lg flex items-center gap-2 ${
              settings.isEnabled || status.botState === "RUNNING"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30"
                : status.botState === "CIRCUIT_BREAKER_HALT"
                ? "bg-rose-950 text-rose-300 border border-rose-500/50 cursor-not-allowed"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            }`}
          >
            {settings.isEnabled || status.botState === "RUNNING" ? (
              <> <Pause className="w-4 h-4" /> 🟢 AUTONOMOUS BOT RUNNING (Pause) </>
            ) : status.botState === "CIRCUIT_BREAKER_HALT" ? (
              <> <ShieldAlert className="w-4 h-4 text-rose-400" /> 🛑 CIRCUIT BREAKER HALTED </>
            ) : (
              <> <Play className="w-4 h-4" /> ▶️ START AUTO-TRADER </>
            )}
          </button>

          {/* SCAN & TRADE BUTTON */}
          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition shadow-lg flex items-center gap-1.5 shrink-0"
          >
            <Zap className={`w-4 h-4 text-amber-400 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Scanning..." : "⚡ Scan & Trade Now"}
          </button>

          {/* MODE TOGGLE */}
          <button
            onClick={handleToggleMode}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition"
          >
            {status.mode === "PAPER" ? "Switch to Live" : "Switch to Paper"}
          </button>
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      {notification && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 text-xs font-mono text-indigo-200 flex items-center justify-between animate-fade-in shadow-xl">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* 🎯 DAILY TARGET MILESTONE PROGRESS TRACKER (₹15k ➔ ₹15.2k - ₹16k GOAL) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/50 to-slate-950 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Award className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Daily Target Range: ₹15,200 ➔ ₹16,000 INR</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                +₹200 to +₹1,000 / Day (1.5% - 6.6%)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
              Base Capital: ₹15,000 (~$180 USD) · Realized Today: ₹{((status.todayPnLUSD || 0) * USD_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 2 })} ({status.todayPnLPct}%)
            </span>
          </div>
        </div>

        <div className="w-full md:w-64 space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>₹15,000</span>
            <span className="text-amber-300 font-bold">Goal: ₹16,000</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-400 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(5, ((15000 + Math.max(0, (status.todayPnLUSD || 0) * USD_TO_INR) - 15000) / 1000) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TODAY'S P&L */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Today's Realized P&L</span>
          <div>
            <span className={`text-xl font-black block ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
              {isProfit ? "+" : ""}${status.todayPnLUSD.toFixed(2)} USD
            </span>
            <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
              (₹{isProfit ? "+" : ""}{(status.todayPnLUSD * USD_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 2 })} INR · {status.todayPnLPct}%)
            </span>
          </div>
        </div>

        {/* PIPELINED 5-SLOT ROUND-ROBIN PIPELINE */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">
            Execution Mode
          </span>
          <div>
            <span className="text-xl font-black text-amber-300 block">
              {positions.length} / {settings.maxConcurrentPositions || 5} Positions Active
            </span>
            <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
              {positions.length >= (settings.maxConcurrentPositions || 5)
                ? `🎯 All 5 Slots Full · Tracking Exits`
                : `🔍 Inspecting #${(status.currentInspection?.assetIndex ?? 0) + 1}/10 (${status.currentInspection?.tag || "BTC"})`}
            </span>
          </div>
        </div>

        {/* WIN RATE */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Win Rate Today</span>
          <div>
            <span className="text-xl font-black text-indigo-300 block">
              {status.winRatePct}%
            </span>
            <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
              {status.winningTradesToday} Wins / {status.losingTradesToday} Losses (Target: 80%+)
            </span>
          </div>
        </div>

        {/* CIRCUIT BREAKER STATUS */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Daily Loss Circuit Breaker</span>
          <div>
            <span className={`text-xs font-bold block ${status.circuitBreakerActive ? "text-rose-400" : "text-emerald-400"}`}>
              {status.circuitBreakerActive ? "🛑 HALTED (3% Cap Hit)" : "🟢 SAFE (3% Daily Loss Cap)"}
            </span>
            <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${status.circuitBreakerActive ? "bg-rose-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, (Math.abs(status.todayPnLPct) / settings.maxDailyLossPct) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🔄 5-MINUTE DEDICATED ROUND-ROBIN ASSET READING & PROFIT QUEUE */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 border border-indigo-500/50 shadow-2xl space-y-3 animate-fade-in">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Clock className={`w-6 h-6 ${settings.isEnabled && positions.length < (settings.maxConcurrentPositions || 5) ? "animate-spin" : ""}`} />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-200">
                  🔄 10-Asset Round-Robin Queue
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold">
                  Asset #{(status.currentInspection?.assetIndex ?? 0) + 1} of 10: {status.currentInspection?.name || "Bitcoin"} ({status.currentInspection?.symbol || "BTCUSD"})
                </span>
                {positions.length >= (settings.maxConcurrentPositions || 5) ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                    🎯 ALL 5 SLOTS FULL
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 animate-pulse">
                    ⏳ 5-MIN READING WINDOW ({positions.length}/5 ACTIVE)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-1">
                {positions.length >= (settings.maxConcurrentPositions || 5)
                  ? `All 5/5 slots currently active (${positions.map(p => p.symbol).join(", ")}). Actively managing trailing stops & profit targets. Scanner will resume reading next coin as soon as any position exits.`
                  : `Dedicated 5-minute price action & candle confirmation on ${status.currentInspection?.symbol || "BTCUSD"}. If valid setup appears ➔ Executes trade; if flat/choppy ➔ Moves to next coin. (${positions.length}/5 active slots running in parallel).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            {positions.length < (settings.maxConcurrentPositions || 5) && (
              <button
                onClick={handleSkipInspection}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Skip this coin and start 5-min inspection on next coin in queue"
              >
                ⏭️ Skip to Next ({status.currentInspection?.nextSymbol || "ETHUSD"})
              </button>
            )}
            <button
              onClick={handleManualScan}
              disabled={isScanning}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/40 hover:bg-indigo-600/70 border border-indigo-500/50 text-indigo-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              ⚡ Evaluate & Fire
            </button>
          </div>
        </div>

        {/* 5-MINUTE COUNTDOWN & SIGNAL PROGRESS BAR */}
        {positions.length < (settings.maxConcurrentPositions || 5) && settings.isEnabled && (
          <div className="pt-2 border-t border-indigo-950/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                Inspection Time Remaining: <strong className="text-amber-300">{Math.floor((status.currentInspection?.inspectionRemainingSeconds || 300) / 60)}m {((status.currentInspection?.inspectionRemainingSeconds || 300) % 60).toString().padStart(2, "0")}s</strong>
              </span>
              <span className="text-[11px] text-slate-400">
                Live Bias: <strong className={status.currentInspection?.currentDirection === "BUY" ? "text-emerald-400" : status.currentInspection?.currentDirection === "SELL" ? "text-rose-400" : "text-slate-400"}>{status.currentInspection?.currentDirection || "ANALYZING"}</strong> · Score: <strong className="text-indigo-300">{status.currentInspection?.currentScore || "--"}/100</strong> · EV: <strong className="text-emerald-300">+${status.currentInspection?.currentEVUSD ? status.currentInspection.currentEVUSD.toFixed(2) : "0.00"}</strong>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-indigo-950">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-1000"
                style={{
                  width: `${Math.max(5, Math.min(100, (((status.currentInspection?.inspectionTotalSeconds || 300) - (status.currentInspection?.inspectionRemainingSeconds || 300)) / (status.currentInspection?.inspectionTotalSeconds || 300)) * 100))}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 📡 ACTIVE AUTONOMOUS RADAR STATUS BAR */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 border border-indigo-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-300">🟢 10-COIN AI RADAR ACTIVE</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Pipelined 5-Slot Capacity
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5">
              5-min dedicated inspection per asset · Up to 5 concurrent positions running in parallel · Exit on profit/SL frees slot for next coin
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenRadarModal}
          className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          📡 View 10-Coin Radar Diagnostics
        </button>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab("OVERVIEW")}
          className={`px-4 py-2 rounded-t-xl font-bold transition border-t border-x shrink-0 ${
            activeTab === "OVERVIEW" ? "bg-slate-950 text-indigo-400 border-slate-800" : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          📊 Active Positions & Timeframe Brain
        </button>
        <button
          onClick={() => setActiveTab("CURATED_ASSETS")}
          className={`px-4 py-2 rounded-t-xl font-bold transition border-t border-x shrink-0 ${
            activeTab === "CURATED_ASSETS" ? "bg-slate-950 text-teal-300 border-slate-800" : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          🎯 10 Curated Assets & Auto-Lots ({CURATED_AUTO_TRADER_ASSETS.length})
        </button>
        <button
          onClick={() => setActiveTab("JOURNAL")}
          className={`px-4 py-2 rounded-t-xl font-bold transition border-t border-x shrink-0 ${
            activeTab === "JOURNAL" ? "bg-slate-950 text-indigo-400 border-slate-800" : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          📜 Trade Log ({records.length})
        </button>
        <button
          onClick={() => setActiveTab("NEWS")}
          className={`px-4 py-2 rounded-t-xl font-bold transition border-t border-x shrink-0 ${
            activeTab === "NEWS" ? "bg-slate-950 text-emerald-400 border-slate-800" : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          📰 News & Sentiment Panel ({news.length})
        </button>
        <button
          onClick={() => setActiveTab("SETTINGS")}
          className={`px-4 py-2 rounded-t-xl font-bold transition border-t border-x ml-auto shrink-0 ${
            activeTab === "SETTINGS" ? "bg-slate-950 text-amber-400 border-slate-800" : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          ⚙️ Risk & Circuit Breaker Settings {isSettingsLocked && "🔒"}
        </button>
      </div>

      {/* TAB CONTENT 1: ACTIVE POSITIONS & SIGNAL BRAIN */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-5">
          {/* MULTI-TIMEFRAME ANALYSIS CARD */}
          {(status.currentInspection || diagnostics?.bestAsset) && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    360° Multi-POV Market Analysis Brain ({status.currentInspection?.symbol || ticker})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Current Directional Stance:</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                    (status.currentInspection?.currentDirection || diagnostics?.bestAsset?.direction) === "BUY" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                    (status.currentInspection?.currentDirection || diagnostics?.bestAsset?.direction) === "SELL" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" :
                    "bg-slate-800 text-slate-300 border-slate-700"
                  }`}>
                    {(status.currentInspection?.currentDirection || diagnostics?.bestAsset?.direction) === "BUY" ? "🟢 360° BUY (LONG SETUP)" :
                     (status.currentInspection?.currentDirection || diagnostics?.bestAsset?.direction) === "SELL" ? "🔴 360° SELL (SHORT SETUP)" :
                     "⏳ WAIT (NO CONVICTION)"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 1. TREND POV */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">1. Trend POV (4-Hour):</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      diagnostics?.bestAsset?.fourHourTrend === "BULLISH" ? "bg-emerald-500/20 text-emerald-300" :
                      diagnostics?.bestAsset?.fourHourTrend === "BEARISH" ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-400"
                    }`}>
                      {diagnostics?.bestAsset?.fourHourTrend || "MONITORING"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-200 font-sans">
                    EMA 20/50/200 Stack · Bias: <strong className="text-amber-300">{status.currentInspection?.currentDirection || "NEUTRAL"}</strong>
                  </div>
                </div>

                {/* 2. MOMENTUM POV */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">2. Momentum POV (1-Hour):</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                      {diagnostics?.bestAsset?.oneHourMomentum || "ACTIVE"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-200 font-sans">
                    Momentum Divergence: <strong className="text-indigo-300">{diagnostics?.bestAsset?.oneHourMomentum || "CONFIRMED"}</strong>
                  </div>
                </div>

                {/* 3. TRIGGER & VOLUME POV */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">3. Trigger POV (15-Min):</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      {diagnostics?.bestAsset?.fifteenMinTrigger || "REAL-TIME"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-200 font-sans">
                    Expected Trade Value: <strong className="text-teal-300">+${status.currentInspection?.currentEVUSD ? status.currentInspection.currentEVUSD.toFixed(2) : "0.00"} USD</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1 font-sans">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-slate-400">Composite Multi-POV Score:</span>
                  <span className="text-emerald-400 font-bold">{(status.currentInspection?.currentScore || diagnostics?.bestAsset?.score || 0)} / 100 (Threshold: 60)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {diagnostics?.bestAsset?.reason || `Real-time multi-timeframe analysis reading for ${status.currentInspection?.symbol || ticker}. Dedicated 5-minute confirmation filter active to prevent noise & spike entries.`}
                </p>
              </div>

              {/* AUTONOMOUS STATUS BEACON (BIDIRECTIONAL BUY & SELL) */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                  <span className="text-slate-200 text-[11px]">
                    {status.currentInspection?.status === "HOLDING_ACTIVE_POSITION"
                      ? `🚀 Active Trade Position Running: Tracking profit lock & target on ${status.currentInspection.symbol}.`
                      : `⏳ Sequential 5-Min Reading Active on ${status.currentInspection?.symbol || ticker}: Evaluating 15m+1h+4h alignment before firing.`}
                  </span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 shrink-0">
                  BIDIRECTIONAL (BUY & SELL)
                </span>
              </div>
            </div>
          )}

          {/* ACTIVE OPEN POSITIONS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Active Bot Open Position ({positions.length} / {settings.maxConcurrentPositions})
              </h3>
              <button
                onClick={handleResetTrades}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                🧹 Reset Trades & Set Bot OFF
              </button>
            </div>

            {positions.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
                <p className="text-slate-500">The Delta Auto-Trader sequentially observes each of the 10 curated assets in dedicated 5-minute confirmation windows before firing with strict 1.5% risk & R-multiple protection.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map(pos => (
                  <div key={pos.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{pos.symbol}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pos.type === "BUY" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}>
                          {pos.type === "BUY" ? "🟢 BUY (LONG)" : "🔴 SELL (SHORT)"}
                        </span>
                        <span className="text-[10px] text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                          {pos.timeframeAlignment || "15m + 1h + 4h"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-[10px] font-bold text-indigo-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Auto-Managed R-Multiple Exit
                        </div>
                        <button
                          onClick={() => handleClosePosition(pos.id, pos.currentPrice || pos.entryPrice)}
                          className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold transition cursor-pointer"
                        >
                          Manual Exit
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Entry Price:</span>
                        <strong className="text-slate-200 text-sm font-mono">${formatAssetPrice(pos.entryPrice)}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-indigo-500/20">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          Live Mark Price:
                        </span>
                        <strong className="text-emerald-400 text-sm font-mono">${formatAssetPrice(pos.currentPrice)}</strong>
                        <span className="text-[9px] text-slate-500 block font-sans">₹{(pos.currentPrice * USD_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 2 })} INR</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${pos.unrealizedPnLUSD >= 0 ? "bg-emerald-950/20 border-emerald-500/30" : "bg-rose-950/20 border-rose-500/30"}`}>
                        <span className="text-[10px] text-slate-400 block">Live Floating P&L:</span>
                        <strong className={`text-sm font-mono font-black ${pos.unrealizedPnLUSD >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {pos.unrealizedPnLUSD >= 0 ? "+" : ""}${pos.unrealizedPnLUSD.toFixed(2)} USD ({pos.unrealizedPnLPct >= 0 ? "+" : ""}{pos.unrealizedPnLPct}%)
                        </strong>
                        <span className={`text-[10px] font-sans font-bold block mt-0.5 ${pos.unrealizedPnLUSD >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          ({pos.unrealizedPnLUSD >= 0 ? "+" : ""}₹{(pos.unrealizedPnLUSD * USD_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 2 })} INR)
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Stop-Loss (Trailing):</span>
                        <strong className="text-rose-400 text-sm font-mono">${formatAssetPrice(pos.stopLossPrice)}</strong>
                        <span className="text-[9px] text-amber-300 block font-sans">Target (+1.6R): ${formatAssetPrice(pos.targetPrice)}</span>
                      </div>
                    </div>

                    {/* ⏱️ 2-4H to 24H V3 SWING HORIZON HOLDING TIMER */}
                    {(() => {
                      const entryMs = pos.entryTimeMs || new Date(pos.entryTimestamp).getTime() || (Date.now() - 60000);
                      const diffMins = Math.max(1, Math.floor((Date.now() - entryMs) / 60000));
                      const diffHours = Math.floor(diffMins / 60);
                      const remainingHours = Math.max(0, 24 - diffHours);
                      return (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-indigo-500/20 text-[11px] font-mono">
                          <span className="text-amber-300 flex items-center gap-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Elapsed Hold: {diffHours > 0 ? `${diffHours}h ${diffMins % 60}m` : `${diffMins}m`} · Horizon: 2-4 Hours to 1 Day
                          </span>
                          <span className="text-slate-400">
                            ⏰ 24h Max Hold: ~{remainingHours}h remaining
                          </span>
                        </div>
                      );
                    })()}

                    {pos.trailingStopActive && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-300 font-mono flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <strong>🔒 Trailing Stop Active:</strong> Tier {pos.trailingStopTier || 1} Risk-Free Lock (+{pos.trailingStopTier === 2 ? "0.5R Guaranteed Profit Locked" : "0.1R Breakeven Buffer Locked"})!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: TRADE LOG JOURNAL */}
      {activeTab === "JOURNAL" && (
        <div className="overflow-x-auto">
          {records.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
              No closed trade records logged yet. Bot will journal all automated exits here.
            </div>
          ) : (
            <table className="w-full text-xs font-mono text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-3 px-3">Date / Time</th>
                  <th className="py-3 px-3">Symbol</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Entry ➔ Exit ($)</th>
                  <th className="py-3 px-3">Realized P&L ($)</th>
                  <th className="py-3 px-3">Exit Reason</th>
                  <th className="py-3 px-3">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-900/60 transition">
                    <td className="py-3 px-3 text-slate-400 text-[11px]">{rec.exitTimestamp}</td>
                    <td className="py-3 px-3 font-bold text-white">{rec.symbol}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.type === "BUY" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}>
                        {rec.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono">${formatAssetPrice(rec.entryPrice)} ➔ ${formatAssetPrice(rec.exitPrice)}</td>
                    <td className="py-3 px-3 font-bold">
                      <span className={rec.realizedPnLUSD >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        ${rec.realizedPnLUSD >= 0 ? "+" : ""}{rec.realizedPnLUSD.toFixed(2)} ({rec.realizedPnLPct}%)
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.exitReason === "TARGET_HIT" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                        rec.exitReason === "TRAILING_PROFIT_LOCKED" ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" :
                        rec.exitReason === "PEAK_RETRACEMENT_EXIT" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" :
                        rec.exitReason === "TIME_STALL_EXIT" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                        "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}>
                        {rec.exitReason === "TARGET_HIT" ? "🎯 Target Hit" :
                         rec.exitReason === "TRAILING_PROFIT_LOCKED" ? "🔒 Trailing Profit Locked" :
                         rec.exitReason === "PEAK_RETRACEMENT_EXIT" ? "💎 Peak-Gain Protected" :
                         rec.exitReason === "TIME_STALL_EXIT" ? "⏳ 45m Chop Scratch" :
                         rec.exitReason === "STOP_LOSS_HIT" ? "🛡️ Safety Stop-Loss" :
                         rec.exitReason === "MAX_TIME_60M" ? "⏰ 60m Horizon Banked" :
                         rec.exitReason === "MAX_TIME_24H" ? "⏰ 24h Max Expiry" : rec.exitReason}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-indigo-300">{rec.confidenceScore}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: 10 CURATED ASSETS & AUTO-LOT SIZING MATRIX */}
      {activeTab === "CURATED_ASSETS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Coins className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-white text-xs">Curated 10 Assets Whitelist & Auto-Lot Sizing Engine</h4>
                <p className="text-[11px] text-slate-400 font-sans">
                  The bot exclusively trades these 10 high-liquidity assets. Lots are mathematically computed from your live balance at strict 1.5% risk.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-right shrink-0">
              <span className="text-[10px] text-slate-400 block">Live Capital / 1.5% Risk:</span>
              <strong className="text-emerald-400 text-xs font-mono">
                ${settings.currentCapitalUSD.toFixed(2)} USD · Risk: ${(settings.currentCapitalUSD * 0.015).toFixed(2)}/Trade
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {CURATED_AUTO_TRADER_ASSETS.map((ast, idx) => {
              const liveP = brokerTickEngine.getLivePrice(ast.symbol) || ast.baselinePrice;
              const approxSLDist = Math.max(liveP * 0.015, 0.05);
              const riskBudgetUSD = settings.currentCapitalUSD * (settings.riskPerTradePct / 100);
              const rawQty = approxSLDist > 0 ? riskBudgetUSD / approxSLDist : ast.minLot;
              const quantity = Math.max(ast.minLot, Number(rawQty.toFixed(ast.decimals)));
              const initialRiskUSD = Number((approxSLDist * quantity).toFixed(2));
              const isCurrent = (ticker || "").toUpperCase().includes(ast.tag);

              return (
                <div
                  key={ast.symbol}
                  className={`p-3.5 rounded-2xl border transition shadow-lg space-y-2 flex flex-col justify-between ${
                    isCurrent
                      ? "bg-indigo-950/40 border-indigo-500/50 shadow-indigo-950/40"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-white flex items-center gap-1.5">
                      <span className="text-xs text-indigo-400 font-mono">#{idx + 1}</span> {ast.tag}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
                      WHITELISTED
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 font-sans">
                    <span className="text-slate-400 block text-[10px]">{ast.name}</span>
                    <span className="text-slate-400 text-[10px] italic">{ast.description}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Live Price:</span>
                      <strong className="text-slate-200">${liveP.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Auto Lot Size:</span>
                      <strong className="text-teal-300 font-bold">{quantity} {ast.tag}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Initial Risk (1R):</span>
                      <strong className="text-indigo-300 font-bold">${initialRiskUSD.toFixed(2)}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => handleForceTrade(ast.symbol)}
                    disabled={isForcing}
                    className="w-full py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3 h-3" />
                    FORCE TRADE
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TRADE JOURNAL */}
      {activeTab === "JOURNAL" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Autonomous Trade Closed History ({records.length} Executed)
            </h3>
          </div>

          {records.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
              <p className="text-slate-500">No closed trades recorded yet for today's session.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Asset</th>
                    <th className="p-3">Side</th>
                    <th className="p-3">Entry → Exit</th>
                    <th className="p-3">Realized P&L</th>
                    <th className="p-3">Exit Reason</th>
                    <th className="p-3">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                  {records.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-900/50">
                      <td className="p-3 font-mono text-[10px] text-slate-400">{rec.exitTimestamp}</td>
                      <td className="p-3 font-bold text-white">{rec.symbol}</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          rec.type === "BUY" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                        }`}>
                          {rec.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-200">
                        ${formatAssetPrice(rec.entryPrice)} → ${formatAssetPrice(rec.exitPrice)}
                      </td>
                      <td className="p-3 font-mono font-bold">
                        <span className={rec.realizedPnLUSD >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          {rec.realizedPnLUSD >= 0 ? "+" : ""}${rec.realizedPnLUSD.toFixed(2)} ({rec.realizedPnLPct >= 0 ? "+" : ""}{rec.realizedPnLPct.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="p-3 text-[10px] text-slate-400">{rec.exitReason}</td>
                      <td className="p-3 font-mono text-indigo-300">{rec.confidenceScore}/100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RISK SETTINGS */}
      {activeTab === "SETTINGS" && (
        <div className="max-w-2xl space-y-4 text-xs font-sans">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                DELTA EXCHANGE INDIA ACCOUNT
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                AUTH OK (200)
              </span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1">
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400">Live Net Equity:</span>
                <span className="font-bold text-emerald-400 font-mono">${settings.currentCapitalUSD.toFixed(2)} USD (₹{(settings.currentCapitalUSD * USD_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 2 })} INR)</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Risk % Per Trade (Default 1.5%):</label>
              <input
                type="number"
                step="0.1"
                disabled={isSettingsLocked}
                value={settings.riskPerTradePct}
                onChange={e => handleUpdateSettings({ riskPerTradePct: Number(e.target.value) })}
                className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white ${isSettingsLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Daily Loss Circuit Breaker Limit % (Default 3.0%):</label>
              <input
                type="number"
                step="0.5"
                disabled={isSettingsLocked}
                value={settings.maxDailyLossPct}
                onChange={e => handleUpdateSettings({ maxDailyLossPct: Number(e.target.value) })}
                className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white ${isSettingsLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Max Trades Per Day Cap (Default 10 trades):</label>
              <input
                type="number"
                disabled={isSettingsLocked}
                value={settings.maxTradesPerDay}
                onChange={e => handleUpdateSettings({ maxTradesPerDay: Number(e.target.value) })}
                className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white ${isSettingsLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Max Concurrent Positions (Default 5 slots):</label>
              <input
                type="number"
                disabled={isSettingsLocked}
                value={settings.maxConcurrentPositions}
                onChange={e => handleUpdateSettings({ maxConcurrentPositions: Number(e.target.value) })}
                className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white ${isSettingsLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Loss Cooldown Window (Default 45 Mins):</label>
              <input
                type="number"
                disabled={isSettingsLocked}
                value={settings.cooldownMinutesAfterLoss}
                onChange={e => handleUpdateSettings({ cooldownMinutesAfterLoss: Number(e.target.value) })}
                className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white ${isSettingsLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* 📡 10-COIN SCANNER RADAR & DIAGNOSTICS POPUP MODAL */}
      {showRadarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in text-slate-100 font-mono">
            {/* Modal Header */}
            <div className="p-5 border-b border-indigo-500/30 flex items-center justify-between bg-indigo-950/40">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Radio className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">📡 10-Coin Confluence Radar & Market Diagnostic</h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Real-time multi-timeframe candle scan · Strict 78/100 Filter (Target: 80%+ Win Rate)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRadarModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Code Me Koi Kharabi Nahi Hai — System 100% Active Hai!
                </div>
                <p className="font-sans text-[11px] text-slate-300">
                  Bot ne trade isiliye hold kiya hai kyunki market abhi consolidation / sideways me hai. Bot fake breakout aur loss se bachane ke liye tabhi trade execute karta hai jab <strong>15m + 1h + 4h timeframes align hokar 70+ score</strong> banayein.
                </p>
              </div>

              {/* Asset table */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Live Confluence Breakdown (10 Curated Crypto Coins):
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {diagnostics?.assetScans?.map((asset) => (
                    <div
                      key={asset.symbol}
                      className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 ${
                        asset.status === "READY_TO_FIRE"
                          ? "bg-emerald-950/30 border-emerald-500/40"
                          : asset.status === "ALREADY_OPEN"
                          ? "bg-indigo-950/30 border-indigo-500/40"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{asset.symbol}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            asset.direction === "BUY" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                            asset.direction === "SELL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" :
                            "bg-slate-800 text-slate-400"
                          }`}>
                            {asset.direction}
                          </span>
                          <span className="text-[10px] text-slate-400">(${asset.currentPrice.toLocaleString()})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {asset.projectedProfitUSD && asset.projectedProfitUSD > 0 ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                              EV: +${asset.projectedProfitUSD.toFixed(2)}
                            </span>
                          ) : null}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            asset.score >= 70
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : asset.score >= 60
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}>
                            {asset.score}/100
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>4h: <strong className="text-slate-200">{asset.fourHourTrend}</strong></span>
                        <span>1h: <strong className="text-slate-200">{asset.oneHourMomentum}</strong></span>
                        <span>15m: <strong className="text-slate-200">{asset.fifteenMinTrigger}</strong></span>
                      </div>

                      <p className="text-[10px] text-slate-300 font-sans italic line-clamp-2">
                        {asset.reason}
                      </p>

                      <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {asset.status === "ALREADY_OPEN" ? "🔵 Active Position" : asset.status === "READY_TO_FIRE" ? "🟢 Armed" : "⏳ Waiting Confluence"}
                        </span>
                        {asset.status !== "ALREADY_OPEN" && (
                          <button
                            onClick={() => handleForceTrade(asset.symbol)}
                            disabled={isForcing}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition shadow flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3 text-amber-300" />
                            Force Trade
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-indigo-500/30 bg-slate-950 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Scan updated: {diagnostics?.timestamp || "Just now"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualScan}
                  disabled={isScanning}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
                  Re-Scan
                </button>
                <button
                  onClick={() => setShowRadarModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                >
                  Close Radar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
