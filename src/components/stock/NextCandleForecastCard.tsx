import React from 'react';
import { AITradingBrainResult } from '../../../lib/aiTradingBrainV1';
import { TrendingUp, TrendingDown, Layers, Activity, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';

interface NextCandleForecastCardProps {
  result: AITradingBrainResult;
}

export const NextCandleForecastCard: React.FC<NextCandleForecastCardProps> = ({ result }) => {
  const next = result.nextCandleReport;

  if (!next) return null;

  const isGreen = next.predictedCandleColor === "GREEN_BULLISH";
  const isRed = next.predictedCandleColor === "RED_BEARISH";

  return (
    <div className="w-full p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-950 border border-teal-500/40 shadow-2xl space-y-4 font-mono">
      {/* Card Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-teal-500/20">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Compass className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              NeuralForecast Next-Candle & Sequence Path Engine
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                PatchTST & ABIDES OFI
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              1-Bar High/Low Range Prediction + ABIDES Order Flow Imbalance (OFI) + 5-Bar Path Projection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
            isGreen ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : isRed ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          }`}>
            {isGreen ? <ArrowUpRight className="w-4 h-4" /> : isRed ? <ArrowDownRight className="w-4 h-4" /> : null}
            {(next?.predictedCandleColor || "NEUTRAL").replace("_", " ")} ({next?.bullishCandleProbabilityPct || 50}% Green Prob)
          </span>
        </div>
      </div>

      {/* Grid Section 1: Next Candle Range Bounds */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">🎯 Predicted Next Close:</span>
          <span className="font-bold text-teal-300 text-sm block">{next.predictedNextClose}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">1-Bar Forecast</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">📈 Expected High Bound:</span>
          <span className="font-bold text-emerald-400 text-sm block">{next.predictedNextHigh}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Upper Range Cap</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">📉 Expected Low Bound:</span>
          <span className="font-bold text-rose-400 text-sm block">{next.predictedNextLow}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Lower Support Floor</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">⚡ ABIDES Order Flow Imbalance:</span>
          <span className="font-bold text-purple-300 text-sm block">{next.orderFlowImbalance}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">OFI Score: {next.ofiScore}</span>
        </div>
      </div>

      {/* Section 2: 5-Bar Sequence Path Projection (PatchTST) */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-bold text-teal-300">
          <span>📊 PatchTST / N-BEATS 5-Bar Multi-Horizon Path Projection</span>
          <span className="text-[10px] text-slate-400 font-mono">Cycle Phase: {next.cyclePhase}</span>
        </div>

        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {next.fiveBarPathProjection.map((bar, idx) => (
            <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block font-bold">Bar +{bar.barOffset}</span>
              <strong className="text-teal-300 block text-xs">{bar.projectedClose}</strong>
              <span className="text-[9px] text-slate-500 block">{bar.lowerConfidenceBand} - {bar.upperConfidenceBand}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Summary Forecast Insight */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2 font-mono">
        <Activity className="w-4 h-4 text-teal-400 shrink-0" />
        <span>{next.summaryForecastInsight}</span>
      </div>
    </div>
  );
};
