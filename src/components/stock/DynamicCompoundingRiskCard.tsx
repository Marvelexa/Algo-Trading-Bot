import React, { useState } from 'react';
import { AITradingBrainResult } from '../../../lib/aiTradingBrainV1';
import { TrendingUp, ShieldCheck, Lock, Award, Target, ArrowUpRight, Zap, AlertTriangle, Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface DynamicCompoundingRiskCardProps {
  result: AITradingBrainResult;
}

export const DynamicCompoundingRiskCard: React.FC<DynamicCompoundingRiskCardProps> = ({ result }) => {
  const dc = result.dynamicCompoundingReport;
  const [showFactors, setShowFactors] = useState(false);

  if (!dc) return null;

  const isLocked = Boolean(dc?.isCompoundingActive);
  const isCrypto = result?.symbol ? (result.symbol.includes("BTC") || result.symbol.includes("ETH") || result.symbol.includes("SOL") || result.symbol.includes("XRP") || result.symbol.includes("DOGE") || result.symbol.includes("BNB") || result.symbol.includes("ADA") || result.symbol.includes("AVAX") || result.symbol.includes("DOT") || result.symbol.includes("LINK") || result.symbol.endsWith("USD")) : false;
  const currSym = isCrypto ? "$" : "₹";

  return (
    <div className="w-full p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-955/20 to-slate-950 border border-emerald-500/40 shadow-2xl space-y-4 font-mono">
      {/* Card Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Zap className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              Institutional Dynamic Compounding Risk & Reward Engine V1
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Initial Target: 5R
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              No Fixed TP • Trailing Model: {dc.selectedTrailingMethod} • Compounding Threshold: &ge; 1.2R
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            isLocked ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
          }`}>
            <Lock className="w-3.5 h-3.5" />
            {(dc?.aiDecisionLevel || "STANDARD").replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-400 text-[10px] block">Entry / Direction</span>
          <span className="font-bold text-slate-100">{currSym}{dc.entryPrice} ({dc.direction})</span>
          <span className="text-[10px] text-slate-500 block">Initial Risk: {currSym}{dc.originalRiskAmount} (1R)</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-400 text-[10px] block">Protected Stop Loss</span>
          <span className={`font-bold ${isLocked ? "text-emerald-400" : "text-amber-400"}`}>
            {currSym}{dc.currentProtectedStopLoss}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {isLocked ? `Risk Free (Locked)` : `Protected Risk: ${currSym}${dc.currentProtectedRiskAmount}`}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-400 text-[10px] block">Locked Realized Profit</span>
          <span className="font-bold text-emerald-400">+{currSym}{dc.lockedProfitAmount} (+{dc.unrealizedProfitR}R)</span>
          <span className="text-[10px] text-emerald-500 block">
            {isLocked ? `Locked & Guaranteed` : `Compounding @ 1.2R`}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-400 text-[10px] block">Dynamic Effective R:R</span>
          <span className="font-bold text-purple-300">{dc.effectiveRiskReward}</span>
          <span className="text-[10px] text-slate-500 block">Initial Setup: {dc.initialRiskReward}</span>
        </div>
      </div>

      {/* Progress & Explanation Banner */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-sans">
          <span className="text-slate-300 font-mono text-[11px]">{dc.statisticalExplanation}</span>
          <span className="text-[10px] font-mono text-purple-400 shrink-0">
            Exit Probability: {dc.exitProbabilityPct}%
          </span>
        </div>

        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 ${isLocked ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-purple-500 to-indigo-500"}`}
            style={{ width: `${Math.min(100, Math.max(15, (dc.unrealizedProfitR / 5.0) * 100))}%` }}
          />
        </div>
      </div>

      {/* Toggle Exit Factors */}
      {dc.exitFactorsAgreed.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <button
            onClick={() => setShowFactors(!showFactors)}
            className="w-full flex items-center justify-between text-xs font-bold text-amber-300 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Multi-Factor Exit Warnings ({dc.exitFactorsAgreed.length} Exit Factors Active)
            </span>
            {showFactors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFactors && (
            <div className="space-y-1 pt-2 border-t border-slate-800 text-xs">
              {dc.exitFactorsAgreed.map((factor, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-300 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
