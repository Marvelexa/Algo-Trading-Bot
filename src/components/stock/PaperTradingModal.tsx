import React, { useState, useEffect } from "react";
import { PaperAccountSummary, PaperPosition, PaperTradeRecord, paperTradingEngine } from "../../../lib/paperTradingEngine";
import { brokerTickEngine } from "../../../lib/brokerTickEngine";
import { Wallet, TrendingUp, TrendingDown, RefreshCw, X, CheckCircle, AlertTriangle, Play, ShieldAlert, Award, ShieldCheck, Activity } from "lucide-react";

interface PaperTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPositionClosed?: () => void;
  ticker?: string;
  companyName?: string;
  currentPrice?: number;
  suggestedAction?: string;
  stopLoss?: number;
  target1?: number;
}

export const PaperTradingModal: React.FC<PaperTradingModalProps> = ({ 
  isOpen, 
  onClose, 
  onPositionClosed,
  ticker = "BTCUSD",
  companyName = "Bitcoin Perpetual Delta 24/7",
  currentPrice,
  suggestedAction = "BUY",
  stopLoss,
  target1
}) => {
  const [activeTab, setActiveTab] = useState<"POSITIONS" | "JOURNAL" | "RESET">("POSITIONS");
  const [summary, setSummary] = useState<PaperAccountSummary | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [journal, setJournal] = useState<PaperTradeRecord[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [customCapitalInput, setCustomCapitalInput] = useState<number>(50000);

  const refreshData = () => {
    try {
      setSummary(paperTradingEngine.getAccountSummary());
      setPositions(paperTradingEngine.getOpenPositions());
      setJournal(paperTradingEngine.getClosedTrades());
    } catch (err) {
      console.warn("[PaperTradingModal] Refresh error:", err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshData();

    const onTick = (tick: any) => {
      if (tick?.symbol && tick?.price && tick.price > 0) {
        paperTradingEngine.updateLivePrice(tick.symbol, tick.price);
        refreshData();
      }
    };

    brokerTickEngine.on("tick", onTick);
    const timer = setInterval(refreshData, 1000);
    return () => {
      brokerTickEngine.off("tick", onTick);
      clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const safeSummary: PaperAccountSummary = summary || {
    initialCapital: 1000000,
    cashBalance: 1000000,
    portfolioValue: 1000000,
    totalRealizedPnL: 0,
    totalUnrealizedPnL: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRatePct: 0,
    autoRiskGuardianActive: true
  };

  const handleQuickTrade = (type: "BUY" | "SELL") => {
    const sym = ticker || "BTCUSD";
    const isCrypto = sym.includes("BTC") || sym.includes("ETH") || sym.includes("SOL") || sym.includes("XRP") || sym.includes("DOGE") || sym.includes("BNB") || sym.includes("ADA") || sym.includes("AVAX") || sym.includes("DOT") || sym.includes("LINK") || sym.endsWith("USD");
    const isINR = sym.endsWith("INR") || sym.includes("INR") || sym.endsWith(".NS") || sym.endsWith(".BO");
    const currency = isINR ? "INR" : (isCrypto ? "USD" : "INR");
    const qty = currency === "USD" ? (sym.includes("BTC") ? 0.5 : 5) : 10;
    const liveEnginePrice = paperTradingEngine.getLivePrice(sym) || brokerTickEngine.getLivePrice(sym);
    const price = currentPrice && currentPrice > 0 ? currentPrice : (liveEnginePrice && liveEnginePrice > 0 ? liveEnginePrice : (currency === "USD" ? 74900 : 1310));
    const slBuffer = currency === "USD" ? 0.018 : 0.015;
    const tpBuffer = currency === "USD" ? 0.045 : 0.038;
    const sl = stopLoss && Math.abs(price - stopLoss) / price >= 0.01 ? stopLoss : (type === "BUY" ? price * (1 - slBuffer) : price * (1 + slBuffer));
    const tp = target1 && Math.abs(target1 - price) / price >= 0.02 ? target1 : (type === "BUY" ? price * (1 + tpBuffer) : price * (1 - tpBuffer));

    const res = paperTradingEngine.openPosition(
      sym,
      companyName || sym,
      type,
      qty,
      price,
      sl,
      tp,
      currency
    );

    if (res.success) {
      setNotification(`✅ ${res.message}`);
    } else {
      setNotification(`⚠️ ${res.message}`);
    }
    refreshData();
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSquareOff = (positionId: string, currentPrice: number, ticker: string) => {
    // Optimistic UI Removal: Instant visual feedback
    setPositions(prev => prev.filter(p => p.id !== positionId));

    const res = paperTradingEngine.closePosition(positionId, currentPrice || 1000, "MANUAL_SQUARE_OFF");
    if (res.success) {
      setNotification(res.message);
      refreshData();
      if (onPositionClosed) onPositionClosed();
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleToggleRiskGuardian = () => {
    const nextState = paperTradingEngine.toggleRiskGuardian();
    refreshData();
    setNotification(nextState ? "🛡️ AI Auto-Risk Guardian ENABLED: Auto Stop-Loss & Take-Profit active!" : "⚠️ AI Risk Guardian DISABLED: Positions will not auto-cut on SL.");
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCloseAllLosingPositions = () => {
    let count = 0;
    positions.forEach(pos => {
      if ((pos.unrealizedPnL || 0) < 0) {
        paperTradingEngine.closePosition(pos.id, pos.currentPrice || pos.entryPrice, "EMERGENCY_AI_LOSS_CUT");
        count++;
      }
    });
    refreshData();
    setNotification(`⚡ Emergency Risk Cut: Closed ${count} losing positions to protect capital!`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleResetAccount = () => {
    if (typeof window !== "undefined" && !window.confirm("⚠️ Are you sure you want to reset your Paper Account balance? This will clear your active positions and trade history.")) {
      return;
    }
    paperTradingEngine.resetAccount(customCapitalInput || 50000);
    refreshData();
    setNotification(`Successfully reset Paper Account virtual capital to ₹${(customCapitalInput || 50000).toLocaleString()} INR!`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 md:p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Paper Trading Terminal <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">INDIAN RUPEE (₹) SIMULATOR</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Test trading strategies with zero risk using virtual capital & real-time exchange ticks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-emerald-500/20 text-emerald-300 px-6 py-3 border-b border-emerald-500/30 text-xs font-mono flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> {notification}
            </span>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Account Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-5 bg-slate-950/50 border-b border-slate-800/80 text-xs font-mono">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Available Cash (₹):</span>
            <span className="font-black text-white text-sm md:text-base">₹{(safeSummary.cashBalance || 0).toLocaleString()}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Portfolio Value (₹):</span>
            <span className="font-black text-indigo-300 text-sm md:text-base">₹{(safeSummary.portfolioValue || 0).toLocaleString()}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Realized P&L (₹):</span>
            <span className={`font-black text-sm md:text-base flex items-center gap-1 ${(safeSummary.totalRealizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(safeSummary.totalRealizedPnL || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              ₹{(safeSummary.totalRealizedPnL || 0) >= 0 ? "+" : ""}{(safeSummary.totalRealizedPnL || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Unrealized P&L (₹):</span>
            <span className={`font-black text-sm md:text-base ${(safeSummary.totalUnrealizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{(safeSummary.totalUnrealizedPnL || 0) >= 0 ? "+" : ""}{(safeSummary.totalUnrealizedPnL || 0).toLocaleString()}
            </span>
          </div>

          <div className="col-span-2 md:col-span-1 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Win Rate & Trades:</span>
              <span className="font-black text-amber-300 text-sm md:text-base">{safeSummary.winRatePct || 0}% ({safeSummary.winningTrades || 0}W / {safeSummary.losingTrades || 0}L)</span>
            </div>
            <Award className="w-6 h-6 text-amber-400 opacity-80" />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-900 text-xs font-mono">
          <button
            onClick={() => setActiveTab("POSITIONS")}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition flex items-center gap-2 border-t border-x ${
              activeTab === "POSITIONS"
                ? "bg-slate-950 text-emerald-400 border-slate-800"
                : "text-slate-400 hover:text-slate-200 border-transparent"
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Active Open Positions ({positions.length})
          </button>

          <button
            onClick={() => setActiveTab("JOURNAL")}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition flex items-center gap-2 border-t border-x ${
              activeTab === "JOURNAL"
                ? "bg-slate-950 text-indigo-400 border-slate-800"
                : "text-slate-400 hover:text-slate-200 border-transparent"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Closed Trades Journal ({journal.length})
          </button>

          <button
            onClick={() => setActiveTab("RESET")}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition flex items-center gap-2 border-t border-x ml-auto ${
              activeTab === "RESET"
                ? "bg-slate-950 text-amber-400 border-slate-800"
                : "text-slate-400 hover:text-slate-200 border-transparent"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Account Settings & Reset
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950">
          
          {/* TAB 1: ACTIVE OPEN POSITIONS */}
          {activeTab === "POSITIONS" && (
            <div>

              {/* AI AUTO-RISK GUARDIAN CONTROL BAR */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-100 flex items-center gap-2">
                      AI Auto-Risk Guardian: <strong className={safeSummary.autoRiskGuardianActive ? "text-emerald-400" : "text-amber-400"}>{safeSummary.autoRiskGuardianActive ? "🟢 ACTIVE & MONITORING" : "⚠️ PAUSED"}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans block">
                      Automatically cuts losing positions on SL breach and auto-locks profits at Target Price.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleRiskGuardian}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition ${
                      safeSummary.autoRiskGuardianActive
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    {safeSummary.autoRiskGuardianActive ? "🛡️ Auto-Risk ON" : "⚪ Auto-Risk OFF"}
                  </button>

                  {positions.some(p => (p.unrealizedPnL || 0) < 0) && (
                    <button
                      onClick={handleCloseAllLosingPositions}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] font-bold transition shadow-md"
                    >
                      ⚡ Auto-Cut All Losses Now
                    </button>
                  )}
                </div>
              </div>

              {/* AUTOMATED TERMINAL PORTFOLIO STATUS BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/40 text-xs font-mono shadow-xl">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                  </span>
                  <div>
                    <span className="font-bold text-white flex items-center gap-2">
                      Live Terminal Portfolio: <strong className="text-indigo-300">{ticker || "BTCUSD"}</strong>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        100% Autonomous Mode
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans block">
                      Live Market LTP: <strong className="text-emerald-400 font-mono">{
                        (() => {
                          const isINR = (ticker?.endsWith("INR") || ticker?.includes("INR") || ticker?.endsWith(".NS") || ticker?.endsWith(".BO"));
                          const curr = isINR ? "₹" : "$";
                          const liveP = (currentPrice && currentPrice > 0) ? currentPrice : (brokerTickEngine.getLivePrice(ticker || "BTCUSD") || (isINR ? 1310 : 74900));
                          return `${curr} ${liveP.toLocaleString()}`;
                        })()
                      }</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Hands-Free Rule-Based Execution Active
                  </span>
                </div>
              </div>

              {positions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl font-mono text-slate-400 text-xs">
                  <p className="mb-2 text-sm text-slate-300 font-bold">No Active Open Positions</p>
                  <p className="text-slate-400">The Automated AI Trading Brain continuously monitors 15m/1h/4h timeframes and automatically logs positions here upon valid signal alignment.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                        <th className="py-3 px-4">Ticker / Stock</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">⏱️ AI Target Hold Duration</th>
                        <th className="py-3 px-4">Qty</th>
                        <th className="py-3 px-4">Entry</th>
                        <th className="py-3 px-4">Live Price</th>
                        <th className="py-3 px-4">Live P&L</th>
                        <th className="py-3 px-4">SL / TP Levels</th>
                        <th className="py-3 px-4 text-right">Risk Guardian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {positions.map((pos) => {
                        const isUSD = pos.currency === "USD";
                        const currSym = isUSD ? "$" : "₹";
                        const USD_TO_INR = 86.5;
                        const pnlINR = isUSD ? (pos.unrealizedPnL || 0) * USD_TO_INR : (pos.unrealizedPnL || 0);

                        return (
                          <tr key={pos.id} className="hover:bg-slate-900/60 transition">
                            <td className="py-3.5 px-4 font-bold text-white">
                              {pos.ticker || "STOCK"}
                              <span className="block text-[10px] text-slate-400 font-sans font-normal">{pos.companyName || pos.ticker || "Company"}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                pos.type === "BUY" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}>
                                {pos.type || "BUY"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1.5 w-max">
                                ⏱️ {pos.recommendedHoldDuration || (isUSD ? "2 - 4 Hours (Intraday Crypto)" : "1 - 2 Hours (Intraday Stock)")}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-200">{pos.quantity || 1}</td>
                            <td className="py-3.5 px-4 text-slate-200">{currSym}{(pos.entryPrice || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-100">{currSym}{(pos.currentPrice || pos.entryPrice || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-4">
                              <span className={`font-bold ${(pos.unrealizedPnL || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {currSym}{(pos.unrealizedPnL || 0) >= 0 ? "+" : ""}{(pos.unrealizedPnL || 0).toLocaleString()} ({(pos.unrealizedPnLPct || 0) >= 0 ? "+" : ""}{pos.unrealizedPnLPct || 0}%)
                              </span>
                              {isUSD && (
                                <span className="block text-[10px] text-indigo-300 font-sans">
                                  (₹{pnlINR >= 0 ? "+" : ""}{pnlINR.toLocaleString(undefined, {maximumFractionDigits: 2})} INR)
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-[10px] text-slate-400">
                              <div>
                                SL / Floor: <span className="text-rose-400 font-bold">{currSym}{pos.stopLossPrice || pos.trailingStopLoss || 0}</span>
                                {pos.milestonesAchieved && pos.milestonesAchieved >= 1 ? (
                                  <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                    🔒 Stage {pos.milestonesAchieved}: +{currSym}{pos.lockedProfit} Locked
                                  </span>
                                ) : (
                                  <span className="ml-1 text-[9px] text-slate-500">(Initial SL — 5x Unlocks Floor)</span>
                                )}
                              </div>
                              <div>Next Target: <span className="text-emerald-400 font-bold">{currSym}{pos.targetPrice || pos.finalTarget || 0}</span></div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                Auto Exit Engine
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CLOSED TRADES JOURNAL */}
          {activeTab === "JOURNAL" && (
            <div>
              {journal.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl font-mono text-slate-400 text-xs">
                  No closed trades recorded yet. Square off an open position to populate your audit journal!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                        <th className="py-3 px-4">Date / Time</th>
                        <th className="py-3 px-4">Ticker</th>
                        <th className="py-3 px-4">Qty</th>
                        <th className="py-3 px-4">Entry vs Exit (₹)</th>
                        <th className="py-3 px-4">Realized P&L (₹)</th>
                        <th className="py-3 px-4">Outcome</th>
                        <th className="py-3 px-4">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {journal.map((trd) => {
                        const isCrypto = trd.currency === "USD" || (trd.ticker && (trd.ticker.includes("BTC") || trd.ticker.includes("ETH") || trd.ticker.includes("SOL") || trd.ticker.includes("XRP") || trd.ticker.includes("DOGE") || trd.ticker.includes("BNB") || trd.ticker.includes("ADA") || trd.ticker.includes("AVAX") || trd.ticker.includes("DOT") || trd.ticker.includes("LINK") || trd.ticker.endsWith("USD")));
                        const currSym = isCrypto ? "$" : "₹";
                        const USD_TO_INR = 86.5;
                        const pnlINR = isCrypto ? (trd.realizedPnL || 0) * USD_TO_INR : (trd.realizedPnL || 0);

                        return (
                          <tr key={trd.id} className="hover:bg-slate-900/60 transition">
                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">{trd.exitTimestamp || "N/A"}</td>
                            <td className="py-3.5 px-4 font-bold text-white flex flex-col gap-1">
                              <span className="flex items-center gap-1.5">
                                {trd.ticker || "STOCK"}
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                                  trd.type === "BUY" 
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                }`}>
                                  {trd.type === "BUY" ? "🟢 BUY (LONG)" : "🔴 SELL (SHORT)"}
                                </span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-200">{trd.quantity || 1}</td>
                            <td className="py-3.5 px-4 text-slate-200">
                              {currSym}{(trd.entryPrice || 0).toLocaleString()} ➔ {currSym}{(trd.exitPrice || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`font-bold ${(trd.realizedPnL || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {currSym}{(trd.realizedPnL || 0) >= 0 ? "+" : ""}{(trd.realizedPnL || 0).toLocaleString()} ({trd.realizedPnLPct || 0}%)
                              </span>
                              {isCrypto && (
                                <span className="block text-[10px] text-indigo-300 font-sans">
                                  (₹{pnlINR >= 0 ? "+" : ""}{pnlINR.toLocaleString(undefined, {maximumFractionDigits: 2})} INR)
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                trd.outcome === "WIN" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}>
                                {trd.outcome || "WIN"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 text-[10px]">{trd.exitReason || "SQUARED_OFF"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACCOUNT RESET & SETTINGS */}
          {activeTab === "RESET" && (
            <div className="max-w-xl mx-auto p-6 bg-slate-900 rounded-2xl border border-slate-800 text-xs font-mono">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Virtual Capital Account Reset
              </h3>
              <p className="text-slate-400 mb-4 leading-relaxed">
                Resetting your paper trading account will wipe all active positions and trade journal history, restoring your cash balance to your desired starting capital.
              </p>

              <div className="mb-4 space-y-3">
                <label className="block text-slate-300 font-bold">New Starting Virtual Capital (₹ INR):</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "₹50,000 (Default)", val: 50000 },
                    { label: "₹1,00,000", val: 100000 },
                    { label: "₹2,00,000", val: 200000 },
                    { label: "₹5,00,000", val: 500000 },
                    { label: "₹10,00,000", val: 1000000 }
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => setCustomCapitalInput(item.val)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                        customCapitalInput === item.val
                          ? "bg-amber-500/20 text-amber-300 border-amber-500"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={customCapitalInput}
                  onChange={(e) => setCustomCapitalInput(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono"
                  placeholder="Enter custom capital in Rupees"
                />
              </div>

              <button
                onClick={handleResetAccount}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition shadow-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reset Paper Account Balance to ₹{(customCapitalInput || 1000000).toLocaleString()}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
