import React from 'react';
import { AITradingBrainResult } from '../../../lib/aiTradingBrainV1';
import { Cpu, CpuIcon, Layers, Sparkles, TrendingUp, TrendingDown, CheckCircle2, ShieldCheck, Gauge, Calculator } from 'lucide-react';

interface MLEnsemblePredictionCardProps {
  result: AITradingBrainResult;
}

export const MLEnsemblePredictionCard: React.FC<MLEnsemblePredictionCardProps> = ({ result }) => {
  const ml = result.mlEnsembleResult;
  const shap = result.shapReport;
  const pk = result.pkScreenerResult;
  const wf = result.walkForwardResult;

  if (!ml || !shap || !pk || !wf) return null;

  const isBuy = ml.mlDirectionalAction.includes("BUY");
  const isSell = ml.mlDirectionalAction.includes("SELL");

  return (
    <div className="w-full p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border border-purple-500/40 shadow-2xl space-y-4 font-mono">
      {/* Card Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Cpu className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              TensorFlow ML Ensemble & SHAP Explainable AI Engine
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                GitHub Quant Stack
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              XGBoost Trees + LSTM Sequence Velocity + GRU Volatility Filter + SHAP Feature Attribution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
            isBuy ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : isSell ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          }`}>
            {ml.mlDirectionalAction} ({ml.mlBuyProbabilityPct}% ML BUY Prob)
          </span>
        </div>
      </div>

      {/* Grid Section 1: ML Model Sub-Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">🌲 XGBoost Decision Trees:</span>
          <span className="font-bold text-emerald-400 text-base">{ml.xgboostScore}%</span>
          <span className="text-[10px] text-slate-500 block mt-1">Feature importance weighting</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">🧠 LSTM Sequence Velocity:</span>
          <span className="font-bold text-purple-300 text-base">{ml.lstmSequenceScore}%</span>
          <span className="text-[10px] text-slate-500 block mt-1">10-Bar return momentum</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">⚡ GRU Volatility Gate:</span>
          <span className="font-bold text-indigo-400 text-base">{ml.gruVolatilityGateScore}%</span>
          <span className="text-[10px] text-slate-500 block mt-1">Noise floor filter</span>
        </div>
      </div>

      {/* Section 2: SHAP Shapley Feature Attribution Breakdown */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            SHAP Explainable AI Feature Attribution (Shapley Value Impacts)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Baseline: 50.0% ➔ Target: {shap.predictedValuePct}%
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {shap.attributions.map((item, idx) => {
            const isPos = item.shapleyValue >= 0;
            return (
              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isPos ? "bg-emerald-400" : "bg-rose-400"}`} />
                  <span className="font-semibold text-slate-200">{item.featureName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-[10px]">{item.explanation}</span>
                  <span className={`font-mono font-bold text-xs ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                    {isPos ? "+" : ""}{item.shapleyValue}% ({item.contributionPct}% Impact)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: PKScreener Indian Market Scan & Freqtrade Walk-Forward */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* PKScreener */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              🇮🇳 PKScreener Pattern Scanner
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              {pk.patternLabel} ({pk.passedFiltersCount}/4)
            </span>
          </div>
          <p className="text-[11px] text-slate-300">{pk.screeningAlertMessage}</p>
        </div>

        {/* Freqtrade Walk-Forward Optimizer */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              🔄 Freqtrade / vectorbt Walk-Forward
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              Sharpe: {wf.sharpeRatio} | Sortino: {wf.sortinoRatio}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
            <div><span className="text-slate-400 block">Out-of-Sample Trades</span><strong className="text-slate-200">{wf.totalOutofSampleTrades}</strong></div>
            <div><span className="text-slate-400 block">Max Drawdown</span><strong className="text-rose-400">-{wf.maxDrawdownPct}%</strong></div>
            <div><span className="text-slate-400 block">WFE Efficiency</span><strong className="text-emerald-300">{wf.walkForwardEfficiencyPct}%</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
