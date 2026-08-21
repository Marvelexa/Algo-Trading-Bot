import React from 'react';
import { AITradingBrainResult } from '../../../lib/aiTradingBrainV1';
import { ShieldCheck, Percent, Calculator, Scale, AlertTriangle, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface InstitutionalRiskCardProps {
  result: AITradingBrainResult;
}

export const InstitutionalRiskCard: React.FC<InstitutionalRiskCardProps> = ({ result }) => {
  const risk = result.institutionalRiskReport;

  if (!risk) return null;

  const isEdgeHigh = risk.expectancyVerdict === "HIGH_EDGE";
  const isEdgeMod = risk.expectancyVerdict === "MODERATE_EDGE";

  return (
    <div className="w-full p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border border-emerald-500/40 shadow-2xl space-y-4 font-mono">
      {/* Card Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Scale className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              Institutional Trade Quality & Expectancy Engine
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PyPortfolioOpt & Riskfolio-Lib
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Mathematical Expectancy (E) + Kelly Criterion Capital Sizing + Riskfolio CVaR 95% + Net Tax R:R
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
            isEdgeHigh ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : isEdgeMod ? "bg-teal-500/20 text-teal-300 border-teal-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          }`}>
            {(risk?.expectancyVerdict || "POSITIVE").replace("_", " ")} (+{risk?.mathematicalExpectancy || 0} R Edge)
          </span>
        </div>
      </div>

      {/* Grid Section 1: R-Multiple, Expectancy & Kelly Sizing */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">⚖️ Gross vs Net Tax R:R:</span>
          <span className="font-bold text-emerald-400 text-sm block">1 : {risk.grossRiskRewardRatio} (Gross)</span>
          <span className="text-[10px] text-teal-300 block mt-0.5">1 : {risk.netRiskRewardRatio} (Net STT)</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">📐 Mathematical Expectancy (E):</span>
          <span className="font-bold text-purple-300 text-sm block">+{risk.mathematicalExpectancy} R / Trade</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Positive Edge per ₹1 Risk</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">🎯 PyPortfolioOpt Half-Kelly Size:</span>
          <span className="font-bold text-indigo-400 text-sm block">{risk.recommendedHalfKellyPct}% Capital</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{risk.recommendedPositionSizeUnits} Units Recommended</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">🛡️ Riskfolio-Lib Tail Risk (CVaR):</span>
          <span className="font-bold text-rose-400 text-sm block">-{risk.conditionalValueAtRisk95Pct}% CVaR 95%</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">VaR 95%: -{risk.valueAtRisk95Pct}%</span>
        </div>
      </div>

      {/* Section 2: Excursion Bounds & Friction Impact */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{risk.summaryRiskInsight}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] shrink-0 font-mono text-slate-400">
          <span>Cost Friction: <strong className="text-amber-300">{risk.costFrictionPct}%</strong></span>
          <span>Ruin Prob: <strong className="text-emerald-400">{risk.probabilityOfRuinPct}%</strong></span>
        </div>
      </div>
    </div>
  );
};
