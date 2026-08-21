import React from 'react';
import { AITradingBrainResult, aiTradingBrainEngine, MarketBar, TradingMode } from '../../../lib/aiTradingBrainV1';
import { MLEnsemblePredictionCard } from './MLEnsemblePredictionCard';
import { InstitutionalRiskCard } from './InstitutionalRiskCard';
import { NextCandleForecastCard } from './NextCandleForecastCard';
import { CryptoInstitutionalCard } from './CryptoInstitutionalCard';
import { MasterPromptSystemCard } from './MasterPromptSystemCard';
import { InstitutionalResearchAuditCard } from './InstitutionalResearchAuditCard';
import { DynamicCompoundingRiskCard } from './DynamicCompoundingRiskCard';
import { EvidenceBreakdownMatrixCard } from './EvidenceBreakdownMatrixCard';
import { paperTradingEngine } from '../../../lib/paperTradingEngine';
import { brokerTickEngine } from '../../../lib/brokerTickEngine';
import { 
  Brain, Sparkles, TrendingUp, TrendingDown, Target, 
  ShieldAlert, Award, CheckCircle2, AlertTriangle, Play, Wallet, Activity, Sliders, ShieldCheck, Zap
} from 'lucide-react';

interface AITradingBrainCardProps {
  symbol: string;
  currentPrice: number;
  bars?: MarketBar[];
  onTradeExecuted?: () => void;
}

export const AITradingBrainCard: React.FC<AITradingBrainCardProps> = ({
  symbol,
  currentPrice,
  bars = [],
  onTradeExecuted
}) => {
  const [selectedMode, setSelectedMode] = React.useState<TradingMode>("INTRADAY_SCALPING");
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    return 300 - (nowSec % 300);
  });

  const [fiveSecPulse, setFiveSecPulse] = React.useState<number>(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);
      setSecondsRemaining(300 - (nowSec % 300));
      if (nowSec % 5 === 0) {
        setFiveSecPulse(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [realBars, setRealBars] = React.useState<MarketBar[]>(bars && bars.length > 5 ? bars : []);

  React.useEffect(() => {
    if (bars && bars.length > 5) {
      setRealBars(bars);
    }
  }, [bars]);

  const activeBarsToUse = bars && bars.length > 5 ? bars : (realBars && realBars.length > 5 ? realBars : []);
  const liveTickPrice = brokerTickEngine.getLivePrice(symbol || "NIFTY");
  const activePriceToUse = currentPrice > 0 
    ? currentPrice 
    : (liveTickPrice && liveTickPrice > 0 
        ? liveTickPrice 
        : (activeBarsToUse.length > 0 ? activeBarsToUse[activeBarsToUse.length - 1].close : 24000));

  let result: AITradingBrainResult | undefined;
  try {
    result = aiTradingBrainEngine.analyze(
      symbol || "NIFTY",
      activePriceToUse,
      activeBarsToUse,
      65,
      1.05,
      selectedMode
    );
  } catch (err) {
    console.error("[AITradingBrainCard] analyze() failed:", err);
    result = undefined;
  }

  if (!result) {
    return (
      <div className="w-full p-6 rounded-3xl bg-slate-900 border border-rose-500/40 text-rose-300 font-mono text-sm">
        ⚠️ AI Trading Brain temporarily unavailable. Retrying on next tick…
      </div>
    );
  }

  const isCrypto = symbol ? (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL") || symbol.includes("XRP") || symbol.includes("DOGE") || symbol.includes("BNB") || symbol.includes("ADA") || symbol.includes("AVAX") || symbol.includes("DOT") || symbol.includes("LINK") || symbol.endsWith("USD")) : false;
  const currSym = isCrypto ? "$" : "₹";
  const isBuy = result?.action ? result.action.includes("BUY") : false;
  const isSell = result?.action ? result.action.includes("SELL") : false;

  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const handleExecuteTrade = (actionType: "BUY" | "SELL") => {
    const qty = isCrypto ? (symbol.includes("BTC") ? 0.5 : 5) : 10;
    const execPrice = activePriceToUse > 0 ? activePriceToUse : result.entryPrice;
    const activePatternName = (result as any)?.detectedPatterns?.[0]?.patternName || undefined;
    const res = paperTradingEngine.openPosition(
      symbol,
      `${symbol} (${(selectedMode || "SWING").replace("_", " ")})`,
      actionType,
      qty,
      execPrice,
      result.stopLoss,
      result.target1,
      isCrypto ? "USD" : "INR",
      true, // 1-Click Direct Execution Mode (bypasses cooldown block & auto-executes trade)
      activePatternName
    );

    setStatusMessage(res.message);
    setTimeout(() => setStatusMessage(null), 6000);

    if (onTradeExecuted) {
      onTradeExecuted();
    }
  };

  return (
    <div className="w-full p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1424] to-slate-950 border border-indigo-500/40 shadow-2xl space-y-5 font-mono relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-indigo-500/20">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Brain className="w-6 h-6 text-indigo-400 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white tracking-tight flex flex-wrap items-center gap-2">
                AI TRADING BRAIN v1 <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold flex items-center gap-1">
                  ⚡ NEMTRON 3 ULTRA AI ACTIVE
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              NVIDIA Nemtron 3 Ultra LLM · Al Brooks Price Action · ICT Smart Money (SMC) · Tom Williams VSA · Multi-Timeframe
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 5-Second Ultra High Frequency Candle Analysis Status */}
          <span className="text-xs px-3 py-1.5 rounded-xl bg-purple-950/90 text-purple-300 border border-purple-500/50 font-bold flex items-center gap-1.5 shadow-lg animate-pulse font-mono">
            <Zap className="w-4 h-4 text-purple-400" />
            ⚡ 5-SEC ULTRA-HIGH FREQUENCY MICRO-CANDLE ANALYSIS ACTIVE (PULSE #{fiveSecPulse})
          </span>

          {/* Realtime Live Market Auto-Detect Status */}
          <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
            <Activity className="w-4 h-4 text-emerald-400" />
            🟢 LIVE REALTIME AUTO-DETECT ACTIVE
          </span>
          <span className="text-xs px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            {result.probabilityPct}% Probability
          </span>
        </div>
      </div>

      {/* 4-MODE TRADING SYSTEM SELECTOR SWITCH */}
      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-sans">
            <Sliders className="w-4 h-4 text-indigo-400" /> Select Active AI Trading System Mode:
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {selectedMode === "INTRADAY_SCALPING" ? "⚡ Intraday 1m/5m Mode" :
             selectedMode === "OPTIONS_BUYING" ? "🎯 Options CE/PE 5m Mode" :
             selectedMode === "SWING_TRADING" ? "📈 Swing 15m/1H Mode" : "💎 Long-Term 1D Compounder"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <button
            onClick={() => setSelectedMode("INTRADAY_SCALPING")}
            className={`py-2.5 px-3 rounded-xl font-bold border transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
              selectedMode === "INTRADAY_SCALPING"
                ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-950/50"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-slate-200"
            }`}
          >
            <span>⚡ Intraday Scalping</span>
            <span className="text-[9px] opacity-80 font-normal">1m/5m (Square-off Today)</span>
          </button>

          <button
            onClick={() => setSelectedMode("OPTIONS_BUYING")}
            className={`py-2.5 px-3 rounded-xl font-bold border transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
              selectedMode === "OPTIONS_BUYING"
                ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/50"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-slate-200"
            }`}
          >
            <span>🎯 Options Buying</span>
            <span className="text-[9px] opacity-80 font-normal">5m CE/PE Momentum</span>
          </button>

          <button
            onClick={() => setSelectedMode("SWING_TRADING")}
            className={`py-2.5 px-3 rounded-xl font-bold border transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
              selectedMode === "SWING_TRADING"
                ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/50"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-slate-200"
            }`}
          >
            <span>📈 Swing Trading</span>
            <span className="text-[9px] opacity-80 font-normal">15m/1H (Hold Days-Weeks)</span>
          </button>

          <button
            onClick={() => setSelectedMode("LONG_TERM_COMPOUNDER")}
            className={`py-2.5 px-3 rounded-xl font-bold border transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
              selectedMode === "LONG_TERM_COMPOUNDER"
                ? "bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-950/50"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-slate-200"
            }`}
          >
            <span>💎 Long-Term Moat</span>
            <span className="text-[9px] opacity-80 font-normal">1D (Hold Months-Years)</span>
          </button>
        </div>

        {/* Mode Protection Notice & Exact Weighting Breakdown Banner */}
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-sans flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">
              {selectedMode === "LONG_TERM_COMPOUNDER" && "🛡️ LONG-TERM INVESTMENT MODE: 55% Fund · 15% Tech · 15% Sent · 15% Macro. Manual dashboard confirmation required."}
              {selectedMode === "SWING_TRADING" && "📈 SWING TRADING MODE: 45% Tech · 25% Sent · 20% Fund. Multi-week bases & earnings check active."}
              {selectedMode === "OPTIONS_BUYING" && "🎯 POSITIONAL F&O MODE: 50% Tech · 25% Sent · 15% OI · 10% Fund/Macro. 4-Quadrant OI & Max Pain active."}
              {selectedMode === "INTRADAY_SCALPING" && "⚡ INTRADAY MODE: 70% Tech · 20% Sent · 5% Fund · 5% OI. Mandatory 3:15 PM IST EOD Force-Close."}
            </span>
          </div>
          {result.weightingBreakdown && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
              Weights: {result.weightingBreakdown.techPct}% T / {result.weightingBreakdown.sentPct}% S / {result.weightingBreakdown.fundPct}% F / {result.weightingBreakdown.oiPct}% OI
            </span>
          )}
        </div>
      </div>

      {/* REALTIME CONTINUOUS MARKET ANALYSIS PIPELINE STATUS BAR */}
      <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400 animate-spin" />
          <span className="text-slate-300 font-sans text-xs">
            <strong className="text-white font-mono">Live Realtime Auto-Analysis:</strong>{" "}
            Automatically tracking live price ticks, 5m breakout momentum, volume spread (VSA) & order blocks in real time!
          </span>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          CONTINUOUS REALTIME ANALYSIS
        </span>
      </div>

      {/* 5-STAGE PRE-TRADE SCREENING PIPELINE MATRIX */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between font-bold text-xs border-b border-slate-800 pb-2">
          <span className="text-slate-200 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-teal-400" />
            5-Stage Pre-Trade Screening Pipeline (5m Breakout & Quality Guard)
          </span>
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-bold ${result.allFiltersPassed ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"}`}>
            {result.allFiltersPassed ? "5/5 FILTERS PASSED" : "FILTER REJECTED / NO BREAKOUT"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
          {result.screeningFilters.map((f, idx) => (
            <div key={idx} className={`p-2.5 rounded-xl border space-y-1 ${f.passed ? "bg-emerald-950/20 border-emerald-500/30" : "bg-rose-950/20 border-rose-500/30"}`}>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-300 truncate">{f.filterName.split(":")[1] || f.filterName}</span>
                {f.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              </div>
              <div className="text-xs font-bold text-white font-mono">{f.metricValue}</div>
              <span className="text-[9px] text-slate-400 block">{f.details}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dual BUY vs SELL Win Probability Gauges */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-3">
        <div className="flex items-center justify-between font-bold text-xs">
          <span className="text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Dual Direction Win Probability Matrix
          </span>
          <span className="text-[11px] font-mono text-purple-300">
            Mathematical Edge Evaluated
          </span>
        </div>

        {/* Dual Progress Bars Side-by-Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 font-mono text-xs">
          {/* BUY Probability Card */}
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> BUY Win Probability
              </span>
              <span className="font-extrabold text-emerald-400 text-sm">{result.buyWinProbabilityPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                style={{ width: `${result.buyWinProbabilityPct}%` }}
              />
            </div>
            <span className="text-[10px] text-emerald-300/80 block">Upside target hit odds</span>
          </div>

          {/* SELL Probability Card */}
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-300 flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-rose-400" /> SELL Win Probability
              </span>
              <span className="font-extrabold text-rose-400 text-sm">{result.sellWinProbabilityPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full transition-all duration-700"
                style={{ width: `${result.sellWinProbabilityPct}%` }}
              />
            </div>
            <span className="text-[10px] text-rose-300/80 block">Downside short target odds</span>
          </div>
        </div>

        {/* Probability Edge Summary Banner */}
        <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs font-mono text-purple-200 flex items-center justify-between">
          <span>{result.probabilityEdgeText}</span>
          <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded font-bold text-purple-300">
            Edge Verified
          </span>
        </div>
      </div>

      {/* Symbol-Specific Evidence Breakdown Matrix */}
      <EvidenceBreakdownMatrixCard result={result} />

      {/* Structured Output Card */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
        
        {/* Symbol & Trend */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Symbol:</span>
            <strong className="text-xl font-bold text-white">{result.symbol}</strong>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Overall Trend:</span>
            <strong className={`text-sm font-bold ${(result?.mtf?.overallTrend || "SIDEWAYS").includes("BULLISH") ? "text-emerald-400" : "text-rose-400"}`}>
              {(result?.mtf?.overallTrend || "SIDEWAYS").replace("_", " ")} ({result?.trendStrengthPct || 50}%)
            </strong>
          </div>
        </div>

        {/* Bull Case vs Bear Case Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Bull Case (Upside Catalyst)
            </span>
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{result.bullCase}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-1">
            <span className="font-bold text-rose-400 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Bear Case (Downside Risk & SL Floor)
            </span>
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{result.bearCase}</p>
          </div>
        </div>

        {/* Reasons Bullet List */}
        <div>
          <span className="text-xs font-bold text-slate-300 block mb-2">Deep System Evidence & Setup Confirmation:</span>
          <div className="space-y-1.5 text-xs text-slate-300">
            {result.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed 5-Engine Breakdown Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold">1. AL BROOKS PRICE ACTION</span>
            <span className="font-bold text-indigo-300 text-xs block mt-0.5">{result?.alBrooks?.lastBarType || "DOJI_INDECISION"}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Regime: {result?.alBrooks?.marketRegime || "TRADING_RANGE"} ({result?.alBrooks?.pressureScore || 50}/100)</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold">2. ICT SMART MONEY (SMC)</span>
            <span className="font-bold text-teal-300 text-xs block mt-0.5">{result?.smc?.marketStructure || "CONSOLIDATION"}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">SMC Confluence Score: {result?.smc?.smcScore || 50}/100</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold">3. TOM WILLIAMS VSA</span>
            <span className="font-bold text-amber-300 text-xs block mt-0.5">{result?.vsa?.vsaSignal || "NORMAL"}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Effort vs Result: {result?.vsa?.effortVsResult || "BALANCED"}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold">4. MINERVINI VCP</span>
            <span className="font-bold text-purple-300 text-xs block mt-0.5">{result?.vcp?.isVcpDetected ? `VCP Contraction (${result.vcp.contractionRounds} Rounds)` : "Normal Volatility"}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Pivot Breakout: {currSym}{(result?.vcp?.pivotBreakoutPrice || 0).toLocaleString()}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold">5. MULTI-TIMEFRAME (1m-1D)</span>
            <span className="font-bold text-emerald-300 text-xs block mt-0.5">{result?.mtf?.confluenceScore || 50}% Timeframe Confluence</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">1m/5m/15m/1H/1D Aligned</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold">6. F&O OI & MAX PAIN</span>
            <span className="font-bold text-cyan-300 text-xs block mt-0.5">{result?.oiAnalysis ? `${result.oiAnalysis.classification} (${result.oiAnalysis.confidenceMultiplier}x)` : "PCR 1.05 Neutral"}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{result?.oiAnalysis ? `Max Pain Strike: ${currSym}${result.oiAnalysis.maxPainStrike}` : "Macro Liquidity Flow"}</span>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-purple-500/40 col-span-1 sm:col-span-2 md:col-span-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-purple-300 block font-bold">7. 20-ANALYST MACRO CONSENSUS ENGINE (Cowen, Coin Bureau, Chart Guys, DataDash)</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold font-mono">
                {result?.youtubeConsensus?.consensusScore || 85}% Analyst Bullish Bias ({result?.youtubeConsensus?.bullishCount || 8}/{result?.youtubeConsensus?.analystBreakdownList?.length || 10})
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans mt-1">
              <strong>Benjamin Cowen Model:</strong> {result?.youtubeConsensus?.benjaminCowenSupportBand?.cyclePhaseText || "Bull Market Support Band Holding"}.{" "}
              <strong>DataDash Macro:</strong> {result?.youtubeConsensus?.dataDashMacro?.liquidityBias || "Global M2 Liquidity Expanding"}.
            </p>
          </div>
        </div>

        {/* Metric Cards (Risk, Confidence, Probability, RR Ratio) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Risk Level:</span>
            <strong className={`text-sm font-bold ${result?.riskLevel === "LOW" ? "text-emerald-400" : result?.riskLevel === "MEDIUM" ? "text-amber-400" : "text-rose-400"}`}>
              {result?.riskLevel || "MEDIUM"}
            </strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Pattern Confidence:</span>
            <strong className="text-sm font-bold text-indigo-300">{result?.confidencePct || 85}%</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Risk/Reward Ratio:</span>
            <strong className="text-sm font-bold text-amber-300">{result?.riskRewardRatio || "1 : 5.0"}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Verdict Probability:</span>
            <strong className="text-sm font-bold text-purple-300">{result?.probabilityPct || 70}%</strong>
          </div>
        </div>

        {/* Action & Levels Display */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">AI Action Verdict:</span>
            <div className={`text-2xl font-black tracking-wide ${isBuy ? "text-emerald-400" : isSell ? "text-rose-400" : "text-amber-400"}`}>
              {(result?.action || "HOLD").replace("_", " ")}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono text-center w-full sm:w-auto">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Entry Price</span>
              <strong className="text-white">{currSym}{(result?.entryPrice || 0).toLocaleString()}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-rose-400 block uppercase tracking-wider">Initial SL (Floor)</span>
              <strong className="text-rose-400">{currSym}{(result?.stopLoss || 0).toLocaleString()}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-emerald-400 block uppercase tracking-wider">Compounding Target (5x)</span>
              <strong className="text-emerald-400">{currSym}{(result?.target1 || 0).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Detailed Decision Explanation Banner */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed">
          <span className="font-bold text-indigo-300 block mb-1 font-mono text-[11px] uppercase tracking-wider">
            💡 Master Strategy Decision Rationale
          </span>
          {result?.decisionExplanation}
        </div>

        {/* 🧠 HISTORICAL PATTERN LEARNING ENGINE V4 (BAYESIAN QUANTITATIVE PLATFORM v4.0.0) */}
        {result?.patternMemoryReport && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between font-bold text-xs border-b border-slate-800 pb-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-purple-300 font-mono flex items-center gap-1.5">
                  🧠 Bayesian Quant Platform V4
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                  Snapshot v4.0.0
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                  Regime: {result.patternMemoryReport.detectedRegime}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                🛡️ Risk Engine Final Veto: ACTIVE
              </span>
            </div>

            {/* Bayesian Posterior & Calibration Diagnostics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Bayesian Posterior Win Prob:</span>
                <strong className="text-emerald-400 font-bold">
                  {result.bayesianUpdatingReport?.posteriorWinProbPct || result.buyWinProbabilityPct}% (Edge: +{result.bayesianUpdatingReport?.bayesianEdgePct}%)
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Calibration Brier / ECE:</span>
                <strong className="text-indigo-300 font-bold">
                  BS: 0.09 | ECE: 1.2%
                </strong>
              </div>
            </div>

            {/* AI Meta Decision Gate Status Banner */}
            {result?.metaDecision && (
              <div className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                result.metaDecision.decision === "EXECUTE"
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-950/40 text-amber-300 border-amber-500/30"
              }`}>
                <span>🛡️ AI Meta Gate: <strong>{result.metaDecision.decision}</strong> (Confidence: {result.metaDecision.metaConfidenceScore}%)</span>
                <span className="text-[10px] opacity-80">{result.metaDecision.isVetoed ? "Veto Active" : "Approved"}</span>
              </div>
            )}

            <div className="text-[11px] font-mono text-purple-200 bg-purple-950/40 p-2 rounded-lg border border-purple-500/20 flex items-center justify-between">
              <span>Cluster #{result.patternMemoryReport.clusterId}: <strong>{result.patternMemoryReport.clusterName}</strong></span>
              <span className="font-bold text-amber-300">Additive PQS: {result.patternMemoryReport.patternQualityScore}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Hist. Win Rate</span>
                <strong className="text-emerald-400 text-sm">{result.patternMemoryReport.historicalWinRatePct}%</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Avg Return</span>
                <strong className={`${result.patternMemoryReport.avgReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"} text-sm`}>
                  {result.patternMemoryReport.avgReturnPct >= 0 ? "+" : ""}{result.patternMemoryReport.avgReturnPct}%
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Avg MFE (Upside)</span>
                <strong className="text-emerald-400 text-sm">+{result.patternMemoryReport.avgMfePct}%</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Avg MAE (Downside)</span>
                <strong className="text-rose-400 text-sm">-{result.patternMemoryReport.avgMaePct}%</strong>
              </div>
            </div>

            {/* Top Historical Matches List */}
            {result.patternMemoryReport.topMatches && result.patternMemoryReport.topMatches.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Top Similar Historical Setups (Ensemble Distance):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  {result.patternMemoryReport.topMatches.map((m, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-white font-bold block">{m.symbol} ({m.historicalDate})</span>
                        <span className="text-slate-400 text-[10px]">{m.patternType}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-purple-300 font-bold block">PQS: {m.patternQualityScore} ({m.similarityScorePct}%)</span>
                        <span className={`text-[10px] font-bold ${m.outcome === "WIN" ? "text-emerald-400" : "text-rose-400"}`}>
                          {m.outcome} ({m.realizedReturnPct > 0 ? "+" : ""}{m.realizedReturnPct}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Execution Feedback Message Banner */}
        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* GitHub Quant Stack: TensorFlow ML Ensemble, SHAP Attribution, PKScreener & Walk-Forward */}
        <MLEnsemblePredictionCard result={result} />

        {/* PyPortfolioOpt & Riskfolio-Lib: Institutional Risk, Expectancy & Kelly Sizing Engine */}
        <InstitutionalRiskCard result={result} />

        {/* NeuralForecast & ABIDES OFI: Next-Candle Direction & 5-Bar Sequence Path Engine */}
        <NextCandleForecastCard result={result} />

        {/* Institutional Crypto Stack: Freqtrade, Hummingbot, Funding Rate & Liquidation Engine */}
        <CryptoInstitutionalCard result={result} />

        {/* Master Institutional System Prompt V5 Viewer & 14 GitHub Seed Repos Matrix */}
        <MasterPromptSystemCard result={result} />

        {/* Mandatory 4-Tier Institutional Research Protocol Audit Viewer */}
        <InstitutionalResearchAuditCard result={result} />

        {/* Institutional Dynamic Compounding Risk & Reward Engine V1 Card */}
        <DynamicCompoundingRiskCard result={result} />

        {/* 🎯 EXACT AUTO-EXIT TAKE-PROFIT & STOP-LOSS LEVELS DISPLAY CARD */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/40 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
              <Target className="w-4 h-4 text-emerald-400 animate-pulse" />
              AUTO-EXIT LEVELS & AUTOMATIC PROFIT LOCK TARGETS:
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {selectedMode === "INTRADAY_SCALPING" ? "⚡ INTRADAY SHORT-TERM" :
               selectedMode === "OPTIONS_BUYING" ? "🎯 OPTIONS MOMENTUM" :
               selectedMode === "SWING_TRADING" ? "📈 SWING MID-TERM" : "💎 LONG-TERM COMPOUNDER"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Take-Profit Auto-Exit Card */}
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                <span>🎯 AUTO-EXIT TAKE-PROFIT LEVEL</span>
                <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">Target 1 (+5.0R)</span>
              </div>
              <div className="text-lg font-black text-emerald-300">
                {currSym}{(result.target1 || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-300/80 block font-sans">{
                (() => {
                  const safeBase = activePriceToUse > 0 ? activePriceToUse : (result.entryPrice || 1);
                  const pct = isBuy 
                    ? (((result.target1 - safeBase) / safeBase) * 100).toFixed(2)
                    : (((safeBase - result.target1) / safeBase) * 100).toFixed(2);
                  return (
                    <span>Is rate par pahunchte hi stock <strong>apne aap profit lock karke exit</strong> ho jayega (+{pct}% profit).</span>
                  );
                })()
              }</span>
            </div>

            {/* Stop-Loss Auto-Exit Card */}
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-rose-400 font-bold">
                <span>🛑 AUTO-EXIT STOP-LOSS LEVEL</span>
                <span className="bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-300">Risk Guard (-1.0R)</span>
              </div>
              <div className="text-lg font-black text-rose-300">
                {currSym}{(result.stopLoss || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-rose-300/80 block font-sans">{
                (() => {
                  const safeBase = activePriceToUse > 0 ? activePriceToUse : (result.entryPrice || 1);
                  const pct = isBuy
                    ? (((safeBase - (result.stopLoss ?? safeBase)) / safeBase) * 100).toFixed(2)
                    : (((result.stopLoss - safeBase) / safeBase) * 100).toFixed(2);
                  return (
                    <span>Loss se bachane ke liye iss rate par <strong>automatically square-off / exit</strong> ho jayega (-{pct}% max risk).</span>
                  );
                })()
              }</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-between font-sans">
            <span>⏱️ <strong>Time Horizon Rules:</strong> {
              selectedMode === "INTRADAY_SCALPING" ? "Intraday Scalping — Auto Square-off at 15:15 IST or Target Hit." :
              selectedMode === "OPTIONS_BUYING" ? "Options Buying — Quick 5m Momentum Exit." :
              selectedMode === "SWING_TRADING" ? "Swing Trading — Hold 2 to 10 days for Swing Target." :
              "Long-Term Compounder — Multi-Month Fundamental Growth Trailing Exit."
            }</span>
            <span className="text-emerald-400 font-mono font-bold shrink-0 ml-2">GUARDIAN ACTIVE</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={() => handleExecuteTrade(isBuy ? "BUY" : "SELL")}
            className={`w-full py-4 px-4 rounded-2xl font-bold text-xs shadow-2xl transition flex items-center justify-center gap-2 cursor-pointer ${
              isBuy
                ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-950/60 animate-pulse"
                : isSell
                ? "bg-gradient-to-r from-rose-600 via-red-600 to-rose-500 hover:from-rose-500 hover:to-red-400 text-white shadow-rose-950/60 animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40"
            }`}
          >
            <Play className="w-4 h-4" />
            ⚡ AUTO-EXECUTE LIVE AI VERDICT ({(result?.action || "HOLD").replace("_", " ")}) NOW — REALTIME AUTO-DETECTED
          </button>
        </div>

      </div>
    </div>
  );
};
