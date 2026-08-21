import React from 'react';
import { fnOptionsBreakoutEngine, FnOptionSetup } from '../../../lib/fnOptionsBreakoutEngine';
import { paperTradingEngine } from '../../../lib/paperTradingEngine';
import { MarketBar } from '../../../lib/aiTradingBrainV1';
import { 
  Zap, CheckCircle2, XCircle, ShieldCheck, TrendingUp, TrendingDown, 
  Target, Layers, Activity, Play, Lock, ChevronRight 
} from 'lucide-react';

interface FnOptionsBreakoutCardProps {
  symbol: string;
  currentPrice: number;
  bars?: MarketBar[];
  onTradeExecuted?: () => void;
}

export const FnOptionsBreakoutCard: React.FC<FnOptionsBreakoutCardProps> = ({
  symbol,
  currentPrice,
  bars = [],
  onTradeExecuted
}) => {
  const setup: FnOptionSetup = fnOptionsBreakoutEngine.evaluateOptionsBreakout(
    symbol || "NIFTY",
    currentPrice || 25180,
    bars
  );

  const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL") || symbol.endsWith("USD");
  const currSym = isCrypto ? "$" : "₹";
  const isBuyCE = setup.action === "BUY_CE";
  const isBuyPE = setup.action === "BUY_PE";

  const handleExecuteOptionTrade = () => {
    if (setup.action === "NO_TRADE") return;

    const optionSymbol = `${setup.symbol} ${setup.selectedStrike} ${setup.optionType}`;
    const tradeType = setup.optionType === "CE" ? "BUY" : "SELL"; // Paper trading long CE / PE position
    const qty = isCrypto ? 1 : 50; // 1 Lot / Contract

    const res = paperTradingEngine.openPosition(
      optionSymbol,
      `${setup.symbol} ${setup.selectedStrike} ${setup.optionType} Option Breakout`,
      tradeType,
      qty,
      setup.estimatedPremiumEntry,
      setup.initialSLPremium,
      setup.finalTargetPremium,
      isCrypto ? "USD" : "INR"
    );

    if (res.success && onTradeExecuted) {
      onTradeExecuted();
    }
  };

  return (
    <div className="w-full p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1726] to-slate-950 border border-teal-500/40 shadow-2xl space-y-5 font-mono relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-teal-500/20">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Zap className="w-6 h-6 text-teal-400 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                AUTOMATED F&O OPTIONS BREAKOUT TRADER
                <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono font-bold">
                  {isCrypto ? "DELTA EXCHANGE CRYPTO F&O" : "NSE F&O INDIA"}
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              5-Min Support/Resistance Breakout · 5-Stage Screening Pipeline · EMA 9/21 Confirmation · 1:5 RR Ratchet SL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 ${
            isBuyCE ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : isBuyPE ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          }`}>
            <Activity className="w-3.5 h-3.5" />
            {(setup?.action || "NO_TRADE").replace("_", " ")}
          </span>
        </div>
      </div>

      {/* 5-STAGE SCREENING PIPELINE MATRIX */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between font-bold text-xs border-b border-slate-800 pb-2">
          <span className="text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            5-Stage Pre-Trade Screening Pipeline
          </span>
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-bold ${setup.allFiltersPassed ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"}`}>
            {setup.allFiltersPassed ? "5/5 FILTERS PASSED" : "FILTER REJECTED"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
          {setup.filters.map((f, idx) => (
            <div key={idx} className={`p-2.5 rounded-xl border space-y-1 ${f.passed ? "bg-emerald-950/20 border-emerald-500/30" : "bg-rose-950/20 border-rose-500/30"}`}>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-300 truncate">{f.filterName.split(":")[1] || f.filterName}</span>
                {f.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              </div>
              <div className="text-xs font-bold text-white font-mono">{f.metricValue}</div>
              <span className="text-[9px] text-slate-400 block">{f.details}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SETUP CONFIRMATION & STRIKE SELECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        {/* Selected Strike Card */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Selected Strike (ATM / 1-OTM)</span>
          <div className="text-lg font-black text-white flex items-center justify-between">
            <span>{setup.symbol} {setup.selectedStrike} {setup.optionType}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${setup.optionType === "CE" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
              {setup.optionType}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Underlying: {currSym}{setup.underlyingPrice.toLocaleString()} · Estimated Premium: {currSym}{setup.estimatedPremiumEntry}
          </p>
        </div>

        {/* EMA 9/21 Confluence Card */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">5-Min EMA 9 / 21 Trend Confluence</span>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-indigo-300">EMA 9: {currSym}{setup.ema9}</span>
            <span className="text-purple-300">EMA 21: {currSym}{setup.ema21}</span>
          </div>
          <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            {setup.emaTrendAligned ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Trend Aligned ({isBuyCE ? "EMA 9 > EMA 21" : "EMA 9 < EMA 21"})
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                ⚠️ EMA 9/21 Disagrees with Breakout
              </span>
            )}
          </div>
        </div>

        {/* 1:5 Risk-Reward Ratchet Schedule */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Ratchet Trailing SL (1:5 RR Target)</span>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-rose-400 font-bold">Initial SL: {currSym}{setup.initialSLPremium}</span>
            <span className="text-emerald-400 font-bold">5R Target: {currSym}{setup.finalTargetPremium}</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            At +2R Profit → SL locks +1R · At +3R → SL locks +2R · Monotonic Floor
          </span>
        </div>
      </div>

      {/* SINGLE EXECUTION BUTTON */}
      <div className="pt-2">
        <button
          onClick={handleExecuteOptionTrade}
          disabled={setup.action === "NO_TRADE"}
          className={`w-full py-4 px-4 rounded-2xl font-black text-xs md:text-sm shadow-xl transition flex flex-col items-center justify-center gap-1 border ${
            setup.action === "BUY_CE"
              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white border-emerald-400/50 shadow-emerald-950/60 cursor-pointer"
              : setup.action === "BUY_PE"
              ? "bg-gradient-to-r from-rose-600 via-red-600 to-rose-500 hover:from-rose-500 hover:to-red-400 text-white border-rose-400/50 shadow-rose-950/60 cursor-pointer"
              : "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center gap-2 text-sm md:text-base tracking-wide">
            <Zap className="w-5 h-5 fill-current animate-bounce" />
            <span>
              {setup.action === "BUY_CE"
                ? `⚡ AUTO-EXECUTE BUY ${setup.selectedStrike} CE OPTION BREAKOUT NOW`
                : setup.action === "BUY_PE"
                ? `⚡ AUTO-EXECUTE BUY ${setup.selectedStrike} PE OPTION BREAKOUT NOW`
                : `⏸️ NO-TRADE: SCREENING FILTERS OR 5-MIN BREAKOUT PENDING`}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-200 opacity-95">
            {setup.symbol} @ {currSym}{setup.underlyingPrice.toLocaleString()} · Premium Entry: {currSym}{setup.estimatedPremiumEntry} · Initial SL: {currSym}{setup.initialSLPremium} · 5R Target: {currSym}{setup.finalTargetPremium}
          </span>
        </button>
      </div>
    </div>
  );
};
