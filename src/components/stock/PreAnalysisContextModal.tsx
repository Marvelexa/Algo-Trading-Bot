import React, { useState } from "react";
import {
  ShieldAlert,
  Target,
  Calculator,
  BrainCircuit,
  X,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Sliders,
  DollarSign,
  TrendingUp,
  Clock,
  BookOpen
} from "lucide-react";
import {
  personalProfileEngine,
  PersonalProfile,
  PreAnalysisContext
} from "../../../lib/personalProfileEngine";

interface PreAnalysisContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  onApplyContext: (context: PreAnalysisContext, profile: PersonalProfile) => void;
}

export const PreAnalysisContextModal: React.FC<PreAnalysisContextModalProps> = ({
  isOpen,
  onClose,
  ticker,
  onApplyContext
}) => {
  const [activeTab, setActiveTab] = useState<"context" | "profile">("context");

  // Local state for Context
  const [context, setContext] = useState<PreAnalysisContext>(personalProfileEngine.getCurrentContext());

  // Local state for Profile
  const [profile, setProfile] = useState<PersonalProfile>(personalProfileEngine.getProfile());

  if (!isOpen) return null;

  const handleSave = () => {
    personalProfileEngine.updateContext(context);
    personalProfileEngine.updateProfile(profile);
    onApplyContext(context, profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BrainCircuit className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                Pre-Analysis Context & Personal Discipline Setup
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {ticker}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tailor analysis to your exact trade purpose, capital allocation, and personal risk discipline rules
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveTab("context")}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-t-xl transition border-t border-x ${
              activeTab === "context"
                ? "bg-slate-900 text-indigo-300 border-indigo-500/40 border-b-transparent"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            1. Stock-Specific Trade Context
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-t-xl transition border-t border-x ${
              activeTab === "profile"
                ? "bg-slate-900 text-purple-300 border-purple-500/40 border-b-transparent"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            2. Personal Risk Discipline Rules
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {activeTab === "context" ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Answering these 5 quick context questions prevents generic recommendations and tailors entry/exit timing for <strong>{ticker}</strong>.
                </span>
              </div>

              {/* Purpose / Style */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  1. What is your purpose for this analysis?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setContext({ ...context, purpose: "TRADE" })}
                    className={`p-2.5 rounded-xl border text-left font-mono font-semibold transition ${
                      context.purpose === "TRADE"
                        ? "bg-indigo-600/20 text-indigo-300 border-indigo-500"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    📈 Trade (Technical & Momentum)
                  </button>
                  <button
                    type="button"
                    onClick={() => setContext({ ...context, purpose: "INVESTMENT" })}
                    className={`p-2.5 rounded-xl border text-left font-mono font-semibold transition ${
                      context.purpose === "INVESTMENT"
                        ? "bg-emerald-600/20 text-emerald-300 border-emerald-500"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    🏢 Long-Term Investment (Fundamental Moat)
                  </button>
                </div>
              </div>

              {/* Time Horizon */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  2. Planned Time Horizon for Holding
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {[
                    { label: "Intraday (Same Day)", value: "INTRADAY" },
                    { label: "Swing (Days to Weeks)", value: "DAYS_WEEKS" },
                    { label: "Long-Term (Months / Years)", value: "MONTHS_YEARS" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setContext({ ...context, timeHorizon: item.value as any })}
                      className={`p-2 rounded-xl border text-center transition ${
                        context.timeHorizon === item.value
                          ? "bg-indigo-600/20 text-indigo-300 border-indigo-500 font-bold"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capital Allocation & Desired Profit Target in Rupees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    3. Your Trade Budget (₹ INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={context.allocatedCapital}
                      onChange={(e) => setContext({ ...context, allocatedCapital: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">Total capital available for this trade</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    4. Your Desired Profit Target (₹ INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={context.desiredProfitTargetRupees}
                      onChange={(e) => {
                        const rupees = Number(e.target.value);
                        const pct = context.allocatedCapital > 0 ? Number(((rupees / context.allocatedCapital) * 100).toFixed(1)) : 10.0;
                        setContext({ ...context, desiredProfitTargetRupees: rupees, desiredProfitTargetPct: pct });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-indigo-400 font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-[10px] text-indigo-400 block mt-1">Target profit: ~{context.desiredProfitTargetPct || 10}% return</span>
                </div>
              </div>

              {/* Interest Reason */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  4. Why did this stock catch your interest today?
                </label>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  {[
                    { label: "📊 Technical Breakout / Pattern", value: "TECHNICAL_SETUP" },
                    { label: "🛡️ Strong Business / Moat", value: "FUNDAMENTAL_MOAT" },
                    { label: "📰 Recent News / Earnings Surge", value: "NEWS_HYPE" },
                    { label: "🗣️ Tip / Social Media Hype", value: "COMMUNITY_TIP" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setContext({ ...context, interestReason: item.value as any })}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        context.interestReason === item.value
                          ? "bg-purple-600/20 text-purple-300 border-purple-500 font-bold"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Existing Exposure */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="block font-bold text-slate-200">Already holding position in {ticker}?</span>
                  <span className="text-[11px] text-slate-400">Enables averaging / exit timing logic</span>
                </div>
                <button
                  type="button"
                  onClick={() => setContext({ ...context, existingExposure: !context.existingExposure })}
                  className={`px-3 py-1 rounded-lg font-mono font-bold transition ${
                    context.existingExposure
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {context.existingExposure ? "YES (Holding)" : "NO (Fresh)"}
                </button>
              </div>
            </div>
          ) : (
            /* Profile & Rules Tab */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  Hard discipline rules protect your capital from emotional revenge trading and overexposure.
                </span>
              </div>

              {/* Trading Style */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  1. Your Personal Trading Personality / Style
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {[
                    { label: "Intraday Scalper", value: "INTRADAY" },
                    { label: "Swing Trader", value: "SWING_TRADER" },
                    { label: "Long-Term Investor", value: "LONG_TERM_INVESTOR" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setProfile({ ...profile, tradingStyle: item.value as any })}
                      className={`p-2 rounded-xl border text-center transition ${
                        profile.tradingStyle === item.value
                          ? "bg-purple-600/20 text-purple-300 border-purple-500 font-bold"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Max Risk Per Trade (%):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={profile.maxRiskPerTradePct}
                    onChange={(e) => setProfile({ ...profile, maxRiskPerTradePct: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-rose-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Cap risk to 2% max recommended</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Daily Max Loss Limit (₹):
                  </label>
                  <input
                    type="number"
                    value={profile.dailyMaxLossLimitRupees}
                    onChange={(e) => setProfile({ ...profile, dailyMaxLossLimitRupees: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-rose-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Revenge trading circuit breaker</span>
                </div>
              </div>

              {/* Market Discipline Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-semibold text-slate-300">
                    Avoid first 15 mins of market open (9:15 - 9:30 AM)?
                  </span>
                  <input
                    type="checkbox"
                    checked={profile.avoidFirst15MinOpen}
                    onChange={(e) => setProfile({ ...profile, avoidFirst15MinOpen: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-semibold text-slate-300">
                    Flag "No-Trade Zone" when core modules diverge?
                  </span>
                  <input
                    type="checkbox"
                    checked={profile.avoidMajorNewsEvents}
                    onChange={(e) => setProfile({ ...profile, avoidMajorNewsEvents: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-mono text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-mono font-bold text-xs shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Apply Personal Context to {ticker}
          </button>
        </div>
      </div>
    </div>
  );
};
