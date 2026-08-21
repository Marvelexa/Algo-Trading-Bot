import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, Shield, 
  ChevronDown, BarChart2, Newspaper, Brain, Activity, 
  Building2, ArrowUpRight, ArrowDownRight, Minus, 
  CheckCircle2, Circle, Loader2
} from 'lucide-react';
import { autonomousDecisionEngine } from '../../../lib/autonomousDecisionEngine';
import { safeFetchJson } from '../../../lib/stockEngine';

export interface AutonomousDecisionCardProps {
  ticker: string;
  tradingCategory: 'INTRADAY' | 'SWING_TRADER' | 'LONG_TERM_INVESTOR' | 'POSITIONAL_OPTIONS';
}

export interface DecisionEngineResult {
  decision: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  bullCase: string;
  bearCase: string;
  reasoning: string;
  conflicts: string[];
  modules: {
    historicalTrend: { 
      signal: 'bullish' | 'bearish' | 'neutral'; 
      score: number; 
      description: string; 
      details?: { trend1Y: string; trend5Y: string; trend10Y: string } 
    };
    newsSentiment: { 
      signal: 'bullish' | 'bearish' | 'neutral'; 
      score: number; 
      description: string; 
      articleCount?: number 
    };
    technicalPatterns: { 
      signal: 'bullish' | 'bearish' | 'neutral'; 
      score: number; 
      description: string; 
      patterns?: string[] 
    };
    fundamentals: { 
      signal: 'bullish' | 'bearish' | 'neutral'; 
      score: number; 
      description: string 
    };
    institutionalFlow: { 
      signal: 'bullish' | 'bearish' | 'neutral'; 
      score: number; 
      description: string 
    };
  };
  tradingCategory: string;
  timestamp: string;
}

const LOADING_STEPS = [
  "Fetching multi-timeframe historical data (1Y/5Y)...",
  "Scanning financial news & sentiment (last 5 days)...",
  "Running technical indicators & candlestick pattern analysis...",
  "Evaluating fundamentals & institutional flows...",
  "Synthesizing AI decision with conflict detection..."
];

const DECISION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  STRONG_BUY: { label: 'STRONG BUY', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  BUY: { label: 'BUY', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  BUY_CE: { label: 'BUY CE', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  LONG: { label: 'LONG', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  HOLD: { label: 'HOLD', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  NEUTRAL: { label: 'NEUTRAL', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  NO_TRADE: { label: 'NO TRADE', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
  SELL: { label: 'SELL', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  BUY_PE: { label: 'BUY PE', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  SHORT: { label: 'SHORT', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  STRONG_SELL: { label: 'STRONG SELL', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
};

export const AutonomousDecisionCard: React.FC<AutonomousDecisionCardProps> = ({ 
  ticker, 
  tradingCategory 
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<DecisionEngineResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [modulesExpanded, setModulesExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let stepInterval: number;
    if (status === 'loading') {
      setCurrentStep(0);
      stepInterval = window.setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < LOADING_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 1000); // Sequence animations
    }
    return () => clearInterval(stepInterval);
  }, [status]);

  const handleAnalyze = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const { success, data } = await safeFetchJson<DecisionEngineResult>(`/api/stock/${ticker}/autonomous-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradingCategory })
      });
      
      let finalData = data;
      if (!success || !finalData) {
        // Run client-side analysis fallback
        finalData = await autonomousDecisionEngine.analyze(ticker, tradingCategory);
      }
      
      // Ensure we hold loading until at least last step is reached
      setTimeout(() => {
        setResult(finalData);
        setStatus('success');
      }, Math.max(0, 3000 - currentStep * 1000));
      
    } catch (error) {
      try {
        const fallbackData = await autonomousDecisionEngine.analyze(ticker, tradingCategory);
        setResult(fallbackData);
        setStatus('success');
      } catch {
        setTimeout(() => {
          setStatus('error');
          setErrorMsg(error instanceof Error ? error.message : 'Unknown error occurred');
        }, 1000);
      }
    }
  };

  const getSignalColor = (signal: string) => {
    if (signal === 'bullish') return 'text-emerald-400';
    if (signal === 'bearish') return 'text-red-400';
    return 'text-amber-400';
  };

  const getSignalIcon = (signal: string) => {
    if (signal === 'bullish') return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
    if (signal === 'bearish') return <ArrowDownRight className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50 overflow-hidden shadow-2xl p-6 text-slate-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-indigo-400" />
            AI Decision Engine
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {ticker} • {(tradingCategory || "SWING_TRADING").replace(/_/g, ' ')}
          </p>
        </div>
        
        {status === 'idle' && (
          <button
            onClick={handleAnalyze}
            className="relative group px-6 py-3 rounded-xl font-semibold text-white overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-indigo-400 to-purple-400 blur-xl transition-opacity duration-300" />
            <span className="relative flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Analyze Now
            </span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 py-8"
          >
            {LOADING_STEPS.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: idx <= currentStep ? 1 : 0.4, x: 0 }}
                className="flex items-center gap-4"
              >
                {idx < currentStep ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : idx === currentStep ? (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                )}
                <span className={idx <= currentStep ? 'text-slate-200' : 'text-slate-500'}>
                  {step}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex flex-col items-center justify-center py-10"
          >
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p>Analysis failed. Please try again.</p>
            <p className="text-sm opacity-70 mt-1">{errorMsg}</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {status === 'success' && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Decision Badge */}
              {(() => {
                const decConfig = (result.decision && DECISION_CONFIG[result.decision])
                  ? DECISION_CONFIG[result.decision]
                  : DECISION_CONFIG.HOLD;
                return (
                  <div className={`col-span-1 rounded-2xl border flex flex-col items-center justify-center p-6 ${decConfig.bg} ${decConfig.border}`}>
                    <span className="text-sm font-medium uppercase tracking-widest text-slate-300 mb-2">Verdict</span>
                    <span className={`text-3xl font-extrabold ${decConfig.color} text-center`}>
                      {decConfig.label}
                    </span>
                  </div>
                );
              })()}

              {/* Confidence Gauge */}
              <div className="col-span-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 flex flex-col items-center justify-center">
                <span className="text-sm font-medium text-slate-400 mb-4">AI Confidence</span>
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="48" cy="48" r="40"
                      className="stroke-slate-700 fill-none"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="48" cy="48" r="40"
                      className="stroke-indigo-500 fill-none"
                      strokeWidth="8"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "251.2", strokeDashoffset: "251.2" }}
                      animate={{ strokeDashoffset: 251.2 - (251.2 * result.confidence) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold">{result.confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="col-span-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 flex flex-col justify-center">
                <span className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> Key Driver
                </span>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {result.reasoning}
                </p>
              </div>
            </div>

            {/* Bull vs Bear Cases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-900/50">
                <h3 className="flex items-center gap-2 text-emerald-400 font-semibold mb-3">
                  <TrendingUp className="w-5 h-5" /> Bull Case
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">{result.bullCase}</p>
              </div>
              <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-900/50">
                <h3 className="flex items-center gap-2 text-rose-400 font-semibold mb-3">
                  <TrendingDown className="w-5 h-5" /> Bear Case
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">{result.bearCase}</p>
              </div>
            </div>

            {/* Conflicts */}
            {result.conflicts && result.conflicts.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4">
                <h4 className="flex items-center gap-2 text-amber-400 font-medium mb-2 text-sm">
                  <AlertTriangle className="w-4 h-4" /> Detected Conflicts
                </h4>
                <ul className="space-y-1">
                  {result.conflicts.map((conflict, i) => (
                    <li key={i} className="text-sm text-amber-200/80 flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span> {conflict}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modules Expansion */}
            <div className="border border-slate-700/50 rounded-xl overflow-hidden bg-slate-800/30">
              <button
                onClick={() => setModulesExpanded(!modulesExpanded)}
                className="w-full px-5 py-4 flex items-center justify-between text-slate-200 hover:bg-slate-700/30 transition-colors"
              >
                <span className="font-medium flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-400" />
                  Detailed Module Analysis
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${modulesExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {modulesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-700/50"
                  >
                    {(() => {
                      const mods = result?.modules || {};
                      const historicalTrend = mods.historicalTrend || { signal: 'neutral', score: 50, description: 'Historical trend aligned with market structure' };
                      const newsSentiment = mods.newsSentiment || { signal: 'neutral', score: 50, description: 'News sentiment in neutral regime' };
                      const technicalPatterns = mods.technicalPatterns || { signal: 'neutral', score: 50, description: 'Technical indicators & patterns evaluated' };
                      const fundamentals = mods.fundamentals || { signal: 'neutral', score: 50, description: 'Company fundamental financial health scored' };
                      const institutionalFlow = mods.institutionalFlow || { signal: 'neutral', score: 50, description: 'Institutional FII/DII accumulation tracked' };

                      return (
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Historical Trend */}
                          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="flex items-center gap-2 font-medium text-sm text-slate-300">
                                <Activity className="w-4 h-4 text-blue-400" /> Trend
                              </span>
                              <span className={`text-xs font-bold uppercase flex items-center gap-1 ${getSignalColor(historicalTrend.signal)}`}>
                                {getSignalIcon(historicalTrend.signal)} {historicalTrend.signal}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-2">{historicalTrend.description}</p>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
                              <div 
                                className="bg-blue-400 h-1.5 rounded-full" 
                                style={{ width: `${historicalTrend.score}%` }}
                              />
                            </div>
                          </div>

                          {/* News Sentiment */}
                          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="flex items-center gap-2 font-medium text-sm text-slate-300">
                                <Newspaper className="w-4 h-4 text-purple-400" /> News
                              </span>
                              <span className={`text-xs font-bold uppercase flex items-center gap-1 ${getSignalColor(newsSentiment.signal)}`}>
                                {getSignalIcon(newsSentiment.signal)} {newsSentiment.signal}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-2">{newsSentiment.description}</p>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
                              <div 
                                className="bg-purple-400 h-1.5 rounded-full" 
                                style={{ width: `${newsSentiment.score}%` }}
                              />
                            </div>
                          </div>

                          {/* Technical Patterns */}
                          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="flex items-center gap-2 font-medium text-sm text-slate-300">
                                <BarChart2 className="w-4 h-4 text-pink-400" /> Technicals
                              </span>
                              <span className={`text-xs font-bold uppercase flex items-center gap-1 ${getSignalColor(technicalPatterns.signal)}`}>
                                {getSignalIcon(technicalPatterns.signal)} {technicalPatterns.signal}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-2">{technicalPatterns.description}</p>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
                              <div 
                                className="bg-pink-400 h-1.5 rounded-full" 
                                style={{ width: `${technicalPatterns.score}%` }}
                              />
                            </div>
                          </div>

                          {/* Fundamentals */}
                          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="flex items-center gap-2 font-medium text-sm text-slate-300">
                                <Building2 className="w-4 h-4 text-cyan-400" /> Fundamentals
                              </span>
                              <span className={`text-xs font-bold uppercase flex items-center gap-1 ${getSignalColor(fundamentals.signal)}`}>
                                {getSignalIcon(fundamentals.signal)} {fundamentals.signal}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-2">{fundamentals.description}</p>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
                              <div 
                                className="bg-cyan-400 h-1.5 rounded-full" 
                                style={{ width: `${fundamentals.score}%` }}
                              />
                            </div>
                          </div>

                          {/* Institutional Flow */}
                          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 md:col-span-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="flex items-center gap-2 font-medium text-sm text-slate-300">
                                <Shield className="w-4 h-4 text-yellow-400" /> Institutional Flow
                              </span>
                              <span className={`text-xs font-bold uppercase flex items-center gap-1 ${getSignalColor(institutionalFlow.signal)}`}>
                                {getSignalIcon(institutionalFlow.signal)} {institutionalFlow.signal}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-2">{institutionalFlow.description}</p>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
                              <div 
                                className="bg-yellow-400 h-1.5 rounded-full" 
                                style={{ width: `${institutionalFlow.score}%` }}
                              />
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Disclaimer */}
            <div className="flex items-center gap-2 justify-center text-xs text-slate-500 pt-2 border-t border-slate-800">
              <Shield className="w-3.5 h-3.5" />
              This is a probability-based analysis, not a guarantee. Always use your own risk management.
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
