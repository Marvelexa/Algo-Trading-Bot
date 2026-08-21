import React from 'react';
import { AITradingBrainResult } from '../../../lib/aiTradingBrainV1';
import { Coins, Flame, ArrowUpRight, ArrowDownRight, Layers, Activity, ShieldAlert, Sparkles } from 'lucide-react';

interface CryptoInstitutionalCardProps {
  result: AITradingBrainResult;
}

export const CryptoInstitutionalCard: React.FC<CryptoInstitutionalCardProps> = ({ result }) => {
  const crypto = result.cryptoSignalReport;

  if (!crypto || !crypto.isCryptoAsset) return null;

  return (
    <div className="w-full p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-950 border border-amber-500/40 shadow-2xl space-y-4 font-mono">
      {/* Card Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Coins className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              Crypto Microstructure & On-Chain Engine
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Freqtrade / Hummingbot / cryptofeed Stack
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              8h Funding Rate + Liquidation Heatmap + L/S Ratio + Whale Reserves + Fear & Greed Index
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            Fear & Greed: {crypto.fearAndGreedScore}/100 ({crypto.fearAndGreedSentiment})
          </span>
        </div>
      </div>

      {/* Grid Section 1: Funding Rate, L/S Ratio, Liquidation & Basis Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">⚡ Perpetual Funding Rate (8h):</span>
          <span className="font-bold text-emerald-400 text-sm block">+{crypto.fundingRate8hPct}%</span>
          <span className="text-[10px] text-amber-300 block mt-0.5">{(crypto.fundingRateBias || "NEUTRAL").replace("_", " ")}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">📊 Long / Short Accounts Ratio:</span>
          <span className="font-bold text-purple-300 text-sm block">{crypto.longShortRatio} L/S</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{crypto.traderSentimentBias}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">🔥 Liquidation Cascade Risk:</span>
          <span className="font-bold text-rose-400 text-sm block">{(crypto.liquidationCascadeRisk || "LOW").replace("_", " ")}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Short Liq: {crypto.nearestShortLiquidationPrice}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">🏦 Exchange Reserves Flow:</span>
          <span className="font-bold text-teal-300 text-sm block">{(crypto.reserveFlowStatus || "BALANCED").replace("_", " ")}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Net Flow: ${crypto.netExchangeFlow24hUSD.toLocaleString()}</span>
        </div>
      </div>

      {/* Section 2: Whale Tracker & Cross-Exchange Arbitrage */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Activity className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{crypto.summaryCryptoInsight}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] shrink-0 font-mono text-slate-400">
          <span>Whale Alert: <strong className="text-emerald-400">{crypto.whaleSentiment}</strong></span>
          <span>Basis Spread: <strong className="text-purple-300">+{crypto.basisPremiumPct}%</strong></span>
        </div>
      </div>
    </div>
  );
};
