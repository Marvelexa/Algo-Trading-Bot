import React from "react";
import { ExecutionQualityReport } from '../../../lib/executionQualityEngine';
import { MarketBar, AITradingBrainResult } from '../../../lib/aiTradingBrainV1';

interface ExecutionQualityDashboardCardProps {
  result: AITradingBrainResult;
}

export const ExecutionQualityDashboardCard: React.FC<ExecutionQualityDashboardCardProps> = ({ result }) => {
  if (!result) return null;

  const dataQuality = result.dataQualityReport;
  const execQuality = result.executionQualityReport;
  const sectorRotation = result.sectorRotationReport;
  const crossAsset = result.crossAssetCorrelationReport;

  return (
    <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-4 font-mono text-xs text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-indigo-300 font-bold flex items-center gap-1.5">
            ⚡ Production Quantitative Dashboard (V5 Infrastructure)
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          Data Feed Health: {dataQuality?.healthScore || 100}/100
        </span>
      </div>

      {/* Row 1: Execution Microstructure Quality Metrics */}
      {execQuality && (
        <div className="space-y-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Execution Quality & Microstructure Metrics:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Realized Slippage</span>
              <strong className="text-emerald-400 text-sm">{execQuality.slippagePct}%</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Order Latency</span>
              <strong className="text-indigo-300 text-sm">{execQuality.orderLatencyMs} ms</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Order Fill Rate</span>
              <strong className="text-emerald-400 text-sm">{execQuality.fillRatePct}%</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Market Impact Cost</span>
              <strong className="text-amber-300 text-sm">{execQuality.marketImpactCostPct}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* Row 2: Sector Rotation & Capital Flow Phase */}
      {sectorRotation && (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span>Sector Rotation: <strong className="text-purple-300">{sectorRotation.currentSectorPhase.sectorName}</strong></span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              sectorRotation.currentSectorPhase.phase === "LEADING" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-indigo-500/20 text-indigo-300"
            }`}>
              Phase: {sectorRotation.currentSectorPhase.phase}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Relative Strength Index: <strong className="text-white">{sectorRotation.currentSectorPhase.relativeStrengthIndex}</strong></span>
            <span>Capital Flow Score: <strong className="text-emerald-400">{sectorRotation.currentSectorPhase.capitalFlowScore}/100</strong></span>
          </div>
        </div>
      )}

      {/* Row 3: 30-Day Pearson Cross-Asset Correlation Matrix */}
      {crossAsset && (
        <div className="space-y-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">30-Day Pearson Cross-Asset Correlation Matrix:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{crossAsset.benchmarkCorrelation.assetName}</span>
              <strong className="text-emerald-400">{crossAsset.benchmarkCorrelation.pearsonCorrelation}</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{crossAsset.vixCorrelation.assetName}</span>
              <strong className="text-rose-400">{crossAsset.vixCorrelation.pearsonCorrelation}</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{crossAsset.usdInrCorrelation.assetName}</span>
              <strong className="text-amber-300">{crossAsset.usdInrCorrelation.pearsonCorrelation}</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{crossAsset.crudeOilCorrelation.assetName}</span>
              <strong className="text-slate-300">{crossAsset.crudeOilCorrelation.pearsonCorrelation}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
