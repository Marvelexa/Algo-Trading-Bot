import React, { useState } from 'react';
import { AITradingBrainResult } from '../../../lib/aiTradingBrainV1';
import { ShieldCheck, Award, Terminal, CheckCircle2, AlertTriangle, Layers, GitBranch, Cpu, ChevronDown, ChevronUp, FileCode } from 'lucide-react';

interface MasterPromptSystemCardProps {
  result: AITradingBrainResult;
}

export const MasterPromptSystemCard: React.FC<MasterPromptSystemCardProps> = ({ result }) => {
  const prompt = result.masterPromptReport;
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showReposModal, setShowReposModal] = useState(false);

  if (!prompt) return null;

  const isNoTrade = prompt.tradeVerdict === "NO_TRADE_HOLD";

  return (
    <div className="w-full p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-950 border border-purple-500/40 shadow-2xl space-y-4 font-mono">
      {/* Card Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Terminal className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              Institutional AI Market Prediction System – Master Prompt V5
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                14 GitHub Seed Repos
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              12-Factor Institutional Gate (&lt;75% = NO_TRADE) + Platt-Calibrated 1-10 Bar Probability Density
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPromptModal(!showPromptModal)}
            className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 flex items-center gap-1 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" />
            {showPromptModal ? "Hide System Prompt" : "View Master System Prompt"}
          </button>
        </div>
      </div>

      {/* Trigger Warning if <75% Gate is active */}
      {isNoTrade && (
        <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/40 text-xs font-mono text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{prompt.noTradeReason || "Institutional Confidence Gate Active (<75% threshold)"}</span>
        </div>
      )}

      {/* Grid Section 1: 12-Factor Institutional Confidence Checklist */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-bold text-purple-300">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            12-Factor Institutional Confidence Checklist (Gate Threshold: 75%)
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
            prompt.overallInstitutionalConfidencePct >= 75 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
          }`}>
            Overall Confidence: {prompt.overallInstitutionalConfidencePct}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {prompt.confidenceChecklist.map((item, idx) => (
            <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.passed ? "bg-emerald-400" : "bg-slate-600"}`} />
                <span className="truncate text-[11px] text-slate-300 font-sans">{item.factorName}</span>
              </div>
              <span className={`text-[10px] font-bold shrink-0 ${item.passed ? "text-emerald-400" : "text-slate-500"}`}>
                +{item.scoreContribution}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: 14 GitHub Seed Repositories Evaluation Matrix Toggle */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
        <button
          onClick={() => setShowReposModal(!showReposModal)}
          className="w-full flex items-center justify-between text-xs font-bold text-indigo-300 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            Evaluated 14 Seed Open-Source Repositories (cryptofeed, Freqtrade, PyPortfolioOpt, Riskfolio, SHAP, etc.)
          </span>
          {showReposModal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showReposModal && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
            {prompt.evaluatedGitHubRepositories.map((repo, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{repo.name} ({repo.stars})</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    repo.verdict === "ADOPT" ? "bg-emerald-500/20 text-emerald-300" : "bg-purple-500/20 text-purple-300"
                  }`}>
                    {repo.verdict}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans">{repo.purpose}</p>
                <span className="text-[9px] text-indigo-400 block font-mono">Module: {repo.systemIntegrationPoint}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Master Prompt Modal View */}
      {showPromptModal && (
        <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/50 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-purple-300">Master System Prompt V5 Definition</span>
            <span className="text-[10px] text-slate-500">Live Active System Instructions</span>
          </div>
          <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto p-2 bg-slate-900 rounded-lg">
            {prompt.masterSystemPromptText}
          </pre>
        </div>
      )}
    </div>
  );
};
