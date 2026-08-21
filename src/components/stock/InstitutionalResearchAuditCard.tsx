import React, { useState } from 'react';
import { AITradingBrainResult } from '../../../lib/aiTradingBrainV1';
import { Search, BookOpen, Layers, Award, CheckCircle2, ChevronDown, ChevronUp, Cpu, Scale } from 'lucide-react';

interface InstitutionalResearchAuditCardProps {
  result: AITradingBrainResult;
}

export const InstitutionalResearchAuditCard: React.FC<InstitutionalResearchAuditCardProps> = ({ result }) => {
  const audit = result.researchAuditReport;
  const [showMatrix, setShowMatrix] = useState(false);

  if (!audit) return null;

  return (
    <div className="w-full p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950/20 to-slate-950 border border-teal-500/40 shadow-2xl space-y-4 font-mono">
      {/* Card Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-teal-500/20">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Search className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              Mandatory 4-Tier Institutional Research Protocol
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Pre-Implementation Audit
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              GitHub Repositories + Academic Peer-Reviewed Literature + Production Benchmarks + Quant Techniques Synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            RESEARCH AUDIT VERIFIED
          </span>
        </div>
      </div>

      {/* Grid Section 1: 4 Research Tiers Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {audit.researchTiers.map((tier, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-bold text-teal-300 block text-[11px] border-b border-slate-800 pb-1">{tier.tierName}</span>
            <div className="space-y-1 text-[10px]">
              {tier.keyReferences.slice(0, 3).map((ref, rIdx) => (
                <div key={rIdx} className="text-slate-300 truncate">
                  <strong className="text-purple-300">{ref.sourceName}</strong> ({ref.impactScorePct}% Impact)
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Section 2: Comparative Synthesis Matrix Toggle */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
        <button
          onClick={() => setShowMatrix(!showMatrix)}
          className="w-full flex items-center justify-between text-xs font-bold text-teal-300 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-400" />
            Subsystem Pre-Implementation Synthesis Matrix ({audit.auditedSubsystemsCount} Subsystems Audited)
          </span>
          {showMatrix ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showMatrix && (
          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
            {audit.comparativeSynthesisMatrix.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">{item.subsystemName}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                    item.verdict === "ADOPT" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  }`}>
                    {item.verdict}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-400 font-sans">
                  <div>GitHub: <strong className="text-purple-300 font-mono">{item.githubReference}</strong></div>
                  <div>Paper: <strong className="text-indigo-300 font-mono">{item.academicPaperCitation}</strong></div>
                  <div>Benchmark: <strong className="text-teal-300 font-mono">{item.productionBenchmark}</strong></div>
                  <div>Technique: <strong className="text-emerald-300 font-mono">{item.quantTechniqueUsed}</strong></div>
                </div>
                <p className="text-[10px] text-slate-300 font-mono pt-1 border-t border-slate-800/60">
                  👉 {item.tradeoffAnalysis}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
