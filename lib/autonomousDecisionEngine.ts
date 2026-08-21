/**
 * Autonomous Decision Engine
 * 
 * One-click orchestration pipeline that runs ALL analysis modules in parallel,
 * detects conflicting signals, computes a weighted confidence score, and
 * generates a clear BUY / SELL / HOLD decision with transparent reasoning.
 * 
 * Never hardcodes accuracy percentages. Only real, calculated confidence scores.
 */

import { stockResearchEngine, StockRecommendation, OHLCVBar, ModuleSignal } from "./stockEngine.js";
import { candlestickPatternEngine, CandlestickPatternMatch } from "./candlestickPatternEngine.js";
import { indianTechnicalIndicatorsEngine, IndianTechnicalAnalysisReport } from "./indianTechnicalIndicatorsEngine.js";
import { newsScraperEngine, ScrapedNewsItem } from "./newsScraper.js";
import { knowledgeBaseEngine, StrategyRuleResult } from "./knowledgeBase.js";
import { institutionalDataEngine, FIIDIIFlowData, AnalystConsensusData, PromoterAndInsiderData } from "./institutionalDataEngine.js";

// ─── Types ───────────────────────────────────────────────────────

export type TradingCategory = "INTRADAY" | "SWING_TRADER" | "LONG_TERM_INVESTOR" | "POSITIONAL_OPTIONS";
export type DecisionVerdict = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
export type SignalDirection = "bullish" | "bearish" | "neutral";

export interface ModuleResult {
  signal: SignalDirection;
  score: number;       // 0-100 (50 = neutral, 0 = max bearish, 100 = max bullish)
  description: string;
  details?: Record<string, any>;
}

export interface DecisionEngineResult {
  decision: DecisionVerdict;
  confidence: number;        // 0-100
  bullCase: string;
  bearCase: string;
  reasoning: string;
  conflicts: string[];
  modules: {
    historicalTrend: ModuleResult;
    newsSentiment: ModuleResult;
    technicalPatterns: ModuleResult;
    fundamentals: ModuleResult;
    institutionalFlow: ModuleResult;
  };
  tradingCategory: TradingCategory;
  timestamp: string;
  executionTimeMs: number;
}

// ─── Category-Specific Module Weights ────────────────────────────

const CATEGORY_WEIGHTS: Record<TradingCategory, Record<string, number>> = {
  INTRADAY: {
    technicalPatterns: 0.45,
    historicalTrend: 0.10,
    newsSentiment: 0.20,
    fundamentals: 0.05,
    institutionalFlow: 0.20
  },
  SWING_TRADER: {
    technicalPatterns: 0.25,
    historicalTrend: 0.20,
    newsSentiment: 0.20,
    fundamentals: 0.15,
    institutionalFlow: 0.20
  },
  LONG_TERM_INVESTOR: {
    technicalPatterns: 0.10,
    historicalTrend: 0.20,
    newsSentiment: 0.10,
    fundamentals: 0.40,
    institutionalFlow: 0.20
  },
  POSITIONAL_OPTIONS: {
    technicalPatterns: 0.35,
    historicalTrend: 0.15,
    newsSentiment: 0.20,
    fundamentals: 0.10,
    institutionalFlow: 0.20
  }
};

// ─── Engine Class ────────────────────────────────────────────────

class AutonomousDecisionEngine {

  /**
   * Main entry point — runs the full analysis pipeline and returns a decision.
   */
  public async analyze(
    ticker: string,
    tradingCategory: TradingCategory = "SWING_TRADER"
  ): Promise<DecisionEngineResult> {
    const startTime = Date.now();
    console.log(`[DecisionEngine] 🚀 Starting autonomous analysis for ${ticker} (${tradingCategory})`);

    // Step 0: Resolve symbol and fetch base data
    const resolvedSymbol = stockResearchEngine.resolveSymbol(ticker);
    const yahooSymbol = stockResearchEngine.getYahooSymbol(ticker);
    const companyName = ticker.replace(".NS", "").replace(".BO", "").replace("^", "");

    // Step 1-4: Run all modules in parallel
    const [
      historicalResult,
      newsResult,
      technicalResult,
      fundamentalResult,
      institutionalResult
    ] = await Promise.allSettled([
      this.runHistoricalTrendModule(yahooSymbol, ticker),
      this.runNewsSentimentModule(companyName, ticker),
      this.runTechnicalPatternsModule(yahooSymbol, ticker, tradingCategory),
      this.runFundamentalsModule(ticker),
      this.runInstitutionalFlowModule(ticker)
    ]);

    // Extract results (with fallback for failed modules)
    const modules = {
      historicalTrend: this.extractResult(historicalResult, "Historical Trend"),
      newsSentiment: this.extractResult(newsResult, "News Sentiment"),
      technicalPatterns: this.extractResult(technicalResult, "Technical Patterns"),
      fundamentals: this.extractResult(fundamentalResult, "Fundamentals"),
      institutionalFlow: this.extractResult(institutionalResult, "Institutional Flow")
    };

    console.log(`[DecisionEngine] 📊 Module scores:`, Object.entries(modules).map(([k, v]) => `${k}=${v.score} (${v.signal})`).join(", "));

    // Step 5: Orchestration — Conflict detection, weighted scoring, decision
    const weights = CATEGORY_WEIGHTS[tradingCategory];
    const conflicts = this.detectConflicts(modules);
    const weightedScore = this.computeWeightedScore(modules, weights);
    let confidence = this.computeConfidence(modules, conflicts, weightedScore);
    const decision = this.scoreToDecision(weightedScore, confidence, conflicts);

    // If decision is HOLD due to conflicts, cap confidence at 50
    if (decision === "HOLD" && conflicts.length >= 2) {
      confidence = Math.min(confidence, 50);
    }

    // Generate bull/bear cases and reasoning
    const { bullCase, bearCase, reasoning } = this.generateNarratives(modules, decision, confidence, conflicts, ticker, tradingCategory);

    const result: DecisionEngineResult = {
      decision,
      confidence: Math.round(confidence),
      bullCase,
      bearCase,
      reasoning,
      conflicts,
      modules,
      tradingCategory,
      timestamp: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime
    };

    console.log(`[DecisionEngine] ✅ Analysis complete: ${decision} (${confidence}%) in ${result.executionTimeMs}ms`);
    return result;
  }

  // ─── Module Runners ──────────────────────────────────────────

  /**
   * Step 1: Multi-Timeframe Historical Trend Analysis
   */
  private async runHistoricalTrendModule(yahooSymbol: string, ticker: string): Promise<ModuleResult> {
    try {
      // Fetch 1Y of daily OHLCV data
      const historyResult = await stockResearchEngine.fetchRealOHLCV(ticker, 365);
      const bars = historyResult.bars;
      const currentPrice = historyResult.currentPrice || bars[bars.length - 1]?.close || 0;

      if (bars.length < 20) {
        return { signal: "neutral", score: 50, description: "Insufficient historical data for trend analysis." };
      }

      // Calculate EMA-based trend for different lookback periods
      const trend1Y = this.computeTrend(bars, Math.min(bars.length, 200), currentPrice);
      const trend6M = this.computeTrend(bars, Math.min(bars.length, 120), currentPrice);
      const trend3M = this.computeTrend(bars, Math.min(bars.length, 60), currentPrice);

      // Combined trend score
      const trendScore = (trend1Y.score * 0.5) + (trend6M.score * 0.3) + (trend3M.score * 0.2);

      const signal: SignalDirection = trendScore > 60 ? "bullish" : trendScore < 40 ? "bearish" : "neutral";

      return {
        signal,
        score: Math.round(trendScore),
        description: `1Y: ${trend1Y.direction} | 6M: ${trend6M.direction} | 3M: ${trend3M.direction}. Price ${currentPrice > trend1Y.ema ? "above" : "below"} 200-day EMA.`,
        details: {
          trend1Y: trend1Y.direction,
          trend6M: trend6M.direction,
          trend3M: trend3M.direction,
          priceVsEma200: currentPrice > trend1Y.ema ? "above" : "below",
          currentPrice,
          ema200: Math.round(trend1Y.ema * 100) / 100
        }
      };
    } catch (error: any) {
      console.warn(`[DecisionEngine] Historical trend module error: ${error.message}`);
      return { signal: "neutral", score: 50, description: `Historical data unavailable: ${error.message}` };
    }
  }

  /**
   * Step 2: News Sentiment Analysis
   */
  private async runNewsSentimentModule(companyName: string, ticker: string): Promise<ModuleResult> {
    try {
      const articles = await newsScraperEngine.fetchLast5DaysNews(companyName, ticker);

      if (!articles || articles.length === 0) {
        return {
          signal: "neutral",
          score: 50,
          description: "No notable news in the last 5 days. Market sentiment is neutral by default.",
          details: { articleCount: 0 }
        };
      }

      // Weight sentiments by source credibility
      let weightedBullish = 0;
      let weightedBearish = 0;
      let totalWeight = 0;

      articles.forEach(article => {
        const w = article.credibilityWeight || 0.5;
        totalWeight += w;
        if (article.sentiment === "bullish") weightedBullish += w;
        if (article.sentiment === "bearish") weightedBearish += w;
      });

      const bullishPct = totalWeight > 0 ? (weightedBullish / totalWeight) * 100 : 50;
      const bearishPct = totalWeight > 0 ? (weightedBearish / totalWeight) * 100 : 50;

      // Score: 0 (max bearish) to 100 (max bullish), 50 = neutral
      const sentimentScore = 50 + ((bullishPct - bearishPct) / 2);
      const clampedScore = Math.max(0, Math.min(100, sentimentScore));

      const signal: SignalDirection = clampedScore > 60 ? "bullish" : clampedScore < 40 ? "bearish" : "neutral";
      const topHeadlines = articles.slice(0, 3).map(a => a.title).join(" | ");

      return {
        signal,
        score: Math.round(clampedScore),
        description: `${articles.length} articles analyzed. ${Math.round(bullishPct)}% bullish, ${Math.round(bearishPct)}% bearish sentiment. Top: ${topHeadlines.slice(0, 150)}...`,
        details: { articleCount: articles.length, bullishPct: Math.round(bullishPct), bearishPct: Math.round(bearishPct) }
      };
    } catch (error: any) {
      console.warn(`[DecisionEngine] News sentiment module error: ${error.message}`);
      return { signal: "neutral", score: 50, description: `News fetch failed: ${error.message}` };
    }
  }

  /**
   * Step 3: Technical Indicators & Candlestick Pattern Analysis
   */
  private async runTechnicalPatternsModule(yahooSymbol: string, ticker: string, category: TradingCategory): Promise<ModuleResult> {
    try {
      const historyResult = await stockResearchEngine.fetchRealOHLCV(ticker, 90);
      const bars = historyResult.bars;
      const currentPrice = historyResult.currentPrice || bars[bars.length - 1]?.close || 0;

      if (bars.length < 20) {
        return { signal: "neutral", score: 50, description: "Insufficient data for technical analysis." };
      }

      // Run technical indicators
      const techReport = indianTechnicalIndicatorsEngine.generateFullReport(bars, currentPrice, category === "POSITIONAL_OPTIONS" ? "SWING_TRADER" : category);

      // Run candlestick pattern detection
      const patterns = candlestickPatternEngine.detectAllPatterns(bars, currentPrice);
      const topPattern = patterns.length > 0 ? patterns[0] : null;

      // Technical score from engine's own confidence
      let techScore = techReport.confidenceScore || 50;

      // Adjust based on overall signal
      if (techReport.overallTechnicalSignal?.toLowerCase().includes("bullish")) {
        techScore = Math.max(techScore, 60);
      } else if (techReport.overallTechnicalSignal?.toLowerCase().includes("bearish")) {
        techScore = Math.min(techScore, 40);
      }

      // RSI-based adjustments
      const rsi = techReport.rsiDivergence?.rsiValue || 50;
      if (rsi > 70) techScore = Math.min(techScore, 35); // Overbought
      if (rsi < 30) techScore = Math.max(techScore, 65); // Oversold

      // Pattern boost
      if (topPattern) {
        if (topPattern.patternType.includes("BULLISH")) techScore += 5;
        if (topPattern.patternType.includes("BEARISH")) techScore -= 5;
      }

      techScore = Math.max(0, Math.min(100, techScore));
      const signal: SignalDirection = techScore > 60 ? "bullish" : techScore < 40 ? "bearish" : "neutral";

      const patternNames = patterns.slice(0, 3).map(p => p.patternName);
      const insights = techReport.keyInsights?.slice(0, 3) || [];

      return {
        signal,
        score: Math.round(techScore),
        description: `RSI: ${rsi.toFixed(1)} | ${techReport.overallTechnicalSignal || "Mixed"} | Supertrend: ${techReport.supertrend?.direction || "N/A"} | ${topPattern ? `Pattern: ${topPattern.patternName}` : "No strong patterns detected"}`,
        details: {
          rsi,
          supertrend: techReport.supertrend?.direction,
          vwapBias: techReport.vwap?.bias,
          overallSignal: techReport.overallTechnicalSignal,
          patterns: patternNames,
          insights
        }
      };
    } catch (error: any) {
      console.warn(`[DecisionEngine] Technical module error: ${error.message}`);
      return { signal: "neutral", score: 50, description: `Technical analysis failed: ${error.message}` };
    }
  }

  /**
   * Step 4a: Fundamental Snapshot
   */
  private async runFundamentalsModule(ticker: string): Promise<ModuleResult> {
    try {
      const cleanTicker = ticker.replace(".NS", "").replace(".BO", "").replace("^", "");

      // Fetch real fundamentals
      const fundamentals = await stockResearchEngine.fetchRealFundamentals(ticker);

      // Run knowledge base rules
      const historyResult = await stockResearchEngine.fetchRealOHLCV(ticker, 90);
      const bars = historyResult.bars;
      const currentPrice = historyResult.currentPrice || bars[bars.length - 1]?.close || 0;

      const techReport = indianTechnicalIndicatorsEngine.generateFullReport(bars, currentPrice);

      const ruleResults = knowledgeBaseEngine.evaluateRules({
        ticker: cleanTicker,
        currentPrice,
        peRatio: fundamentals.peRatio,
        debtToEquity: fundamentals.debtToEquity,
        yoyRevenueGrowthPct: fundamentals.yoyRevenueGrowthPct,
        netMarginPct: fundamentals.netMarginPct,
        rsi: techReport.rsiDivergence?.rsiValue || 50,
        ema20: techReport.ema20 || currentPrice,
        ema50: techReport.ema50 || currentPrice,
        supportLevel: currentPrice * 0.95,
        resistanceLevel: currentPrice * 1.05
      });

      // Score: how many strategy rules pass
      const totalRules = ruleResults.length || 1;
      const passedRules = ruleResults.filter(r => r.passed).length;
      const passRate = (passedRules / totalRules) * 100;

      // Normalize to 0-100 scale
      let fundamentalScore = passRate;

      // P/E sanity
      if (fundamentals.peRatio > 0 && fundamentals.peRatio < 15) fundamentalScore += 10;
      if (fundamentals.peRatio > 50) fundamentalScore -= 10;

      // Debt sanity
      if (fundamentals.debtToEquity < 0.5) fundamentalScore += 5;
      if (fundamentals.debtToEquity > 2) fundamentalScore -= 10;

      fundamentalScore = Math.max(0, Math.min(100, fundamentalScore));
      const signal: SignalDirection = fundamentalScore > 60 ? "bullish" : fundamentalScore < 40 ? "bearish" : "neutral";

      const passedNames = ruleResults.filter(r => r.passed).map(r => r.ruleName);

      return {
        signal,
        score: Math.round(fundamentalScore),
        description: `P/E: ${fundamentals.peRatio.toFixed(1)} | D/E: ${fundamentals.debtToEquity.toFixed(2)} | Revenue Growth: ${fundamentals.yoyRevenueGrowthPct.toFixed(1)}% | ${passedRules}/${totalRules} strategy rules passed (${passedNames.join(", ") || "none"})`,
        details: {
          peRatio: fundamentals.peRatio,
          debtToEquity: fundamentals.debtToEquity,
          revenueGrowth: fundamentals.yoyRevenueGrowthPct,
          netMargin: fundamentals.netMarginPct,
          rulesPassed: passedNames,
          totalRules
        }
      };
    } catch (error: any) {
      console.warn(`[DecisionEngine] Fundamentals module error: ${error.message}`);
      return { signal: "neutral", score: 50, description: `Fundamental data unavailable: ${error.message}` };
    }
  }

  /**
   * Step 4b: Institutional Flow Analysis
   */
  private async runInstitutionalFlowModule(ticker: string): Promise<ModuleResult> {
    try {
      const cleanTicker = ticker.replace(".NS", "").replace(".BO", "").replace("^", "");

      const fiiDii = institutionalDataEngine.fetchFIIDIIFlow();
      const promoter = institutionalDataEngine.fetchPromoterAndInsider(cleanTicker);
      const consensus = institutionalDataEngine.fetchAnalystConsensus(cleanTicker, 0, "INR");

      let instScore = 50; // Neutral baseline

      // FII/DII flow impact
      if (fiiDii.institutionalStance === "STRONG BUYING") instScore += 20;
      else if (fiiDii.institutionalStance === "MODERATE ACCUMULATION") instScore += 10;
      else if (fiiDii.institutionalStance === "NET SELLING") instScore -= 15;

      // Promoter red flags
      if (promoter.redFlagDetected) instScore -= 15;
      if (promoter.pledgedSharesPct > 20) instScore -= 10;
      if (promoter.promoterHoldingChangeQoQPct > 1) instScore += 5;
      if (promoter.promoterHoldingChangeQoQPct < -2) instScore -= 10;

      // Analyst consensus
      if (consensus.consensusRating === "STRONG BUY") instScore += 15;
      else if (consensus.consensusRating === "BUY") instScore += 10;
      else if (consensus.consensusRating === "UNDERPERFORM") instScore -= 15;

      instScore = Math.max(0, Math.min(100, instScore));
      const signal: SignalDirection = instScore > 60 ? "bullish" : instScore < 40 ? "bearish" : "neutral";

      return {
        signal,
        score: Math.round(instScore),
        description: `FII/DII: ${fiiDii.institutionalStance} (FII: ₹${fiiDii.fiiNetBuySellCr}Cr, DII: ₹${fiiDii.diiNetBuySellCr}Cr) | Promoter: ${promoter.promoterHoldingPct}% (${promoter.promoterHoldingChangeQoQPct > 0 ? "+" : ""}${promoter.promoterHoldingChangeQoQPct}% QoQ) | Analyst: ${consensus.consensusRating} (Target: ₹${consensus.avgTargetPrice})`,
        details: {
          fiiNetBuySell: fiiDii.fiiNetBuySellCr,
          diiNetBuySell: fiiDii.diiNetBuySellCr,
          institutionalStance: fiiDii.institutionalStance,
          promoterHolding: promoter.promoterHoldingPct,
          pledgedShares: promoter.pledgedSharesPct,
          redFlag: promoter.redFlagDetected,
          consensusRating: consensus.consensusRating,
          targetPrice: consensus.avgTargetPrice,
          upsidePct: consensus.upsidePctToTarget
        }
      };
    } catch (error: any) {
      console.warn(`[DecisionEngine] Institutional module error: ${error.message}`);
      return { signal: "neutral", score: 50, description: `Institutional data unavailable: ${error.message}` };
    }
  }

  // ─── Orchestration Helpers ───────────────────────────────────

  private extractResult(settled: PromiseSettledResult<ModuleResult>, moduleName: string): ModuleResult {
    if (settled.status === "fulfilled") return settled.value;
    console.warn(`[DecisionEngine] ${moduleName} module rejected: ${settled.reason}`);
    return { signal: "neutral", score: 50, description: `${moduleName} module failed to execute.` };
  }

  private computeTrend(bars: OHLCVBar[], lookback: number, currentPrice: number): { score: number; direction: string; ema: number } {
    const subset = bars.slice(-lookback);
    if (subset.length < 5) return { score: 50, direction: "Insufficient Data", ema: currentPrice };

    // Simple EMA approximation
    const k = 2 / (subset.length + 1);
    let ema = subset[0].close;
    for (let i = 1; i < subset.length; i++) {
      ema = subset[i].close * k + ema * (1 - k);
    }

    // Price position relative to EMA
    const diff = ((currentPrice - ema) / ema) * 100;

    // Price momentum: compare first vs last quarter
    const q1Avg = subset.slice(0, Math.floor(subset.length / 4)).reduce((s, b) => s + b.close, 0) / Math.floor(subset.length / 4);
    const q4Avg = subset.slice(-Math.floor(subset.length / 4)).reduce((s, b) => s + b.close, 0) / Math.floor(subset.length / 4);
    const momentum = ((q4Avg - q1Avg) / q1Avg) * 100;

    let score = 50 + (diff * 2) + (momentum * 0.5);
    score = Math.max(0, Math.min(100, score));

    const direction = score > 65 ? "Strong Uptrend" : score > 55 ? "Mild Uptrend" : score < 35 ? "Strong Downtrend" : score < 45 ? "Mild Downtrend" : "Sideways";

    return { score, direction, ema };
  }

  private detectConflicts(modules: Record<string, ModuleResult>): string[] {
    const conflicts: string[] = [];
    const entries = Object.entries(modules);

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [nameA, modA] = entries[i];
        const [nameB, modB] = entries[j];

        // Conflict if one is strongly bullish and other is strongly bearish (>40 point difference)
        const scoreDiff = Math.abs(modA.score - modB.score);
        if (scoreDiff > 40 && modA.signal !== modB.signal && modA.signal !== "neutral" && modB.signal !== "neutral") {
          const labelA = this.formatModuleName(nameA);
          const labelB = this.formatModuleName(nameB);
          conflicts.push(`${labelA} is ${modA.signal} (${modA.score}) but ${labelB} is ${modB.signal} (${modB.score}) — ${scoreDiff}pt divergence`);
        }
      }
    }

    return conflicts;
  }

  private formatModuleName(key: string): string {
    const names: Record<string, string> = {
      historicalTrend: "Historical Trend",
      newsSentiment: "News Sentiment",
      technicalPatterns: "Technical Analysis",
      fundamentals: "Fundamentals",
      institutionalFlow: "Institutional Flow"
    };
    return names[key] || key;
  }

  private computeWeightedScore(modules: Record<string, ModuleResult>, weights: Record<string, number>): number {
    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(modules).forEach(([key, mod]) => {
      const weight = weights[key] || 0.2;
      totalScore += mod.score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalScore / totalWeight : 50;
  }

  private computeConfidence(modules: Record<string, ModuleResult>, conflicts: string[], weightedScore: number): number {
    // Agreement-based confidence: how much modules agree
    const scores = Object.values(modules).map(m => m.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Base confidence from distance from neutral (50)
    let confidence = Math.abs(weightedScore - 50) * 2; // 0-100

    // Penalize for high variance (disagreement)
    confidence -= stdDev * 0.5;

    // Penalize for explicit conflicts
    confidence -= conflicts.length * 10;

    // Bonus for strong agreement
    const allSameDirection = new Set(Object.values(modules).map(m => m.signal)).size === 1;
    if (allSameDirection && Object.values(modules)[0].signal !== "neutral") {
      confidence += 15;
    }

    return Math.max(5, Math.min(95, confidence));
  }

  private scoreToDecision(weightedScore: number, confidence: number, conflicts: string[]): DecisionVerdict {
    // If too many conflicts or low confidence, default to HOLD
    if (conflicts.length >= 3 || confidence < 25) return "HOLD";

    if (weightedScore >= 75 && confidence >= 60) return "STRONG_BUY";
    if (weightedScore >= 60) return "BUY";
    if (weightedScore <= 25 && confidence >= 60) return "STRONG_SELL";
    if (weightedScore <= 40) return "SELL";
    return "HOLD";
  }

  private generateNarratives(
    modules: Record<string, ModuleResult>,
    decision: DecisionVerdict,
    confidence: number,
    conflicts: string[],
    ticker: string,
    category: TradingCategory
  ): { bullCase: string; bearCase: string; reasoning: string } {
    const bullSignals = Object.entries(modules)
      .filter(([, m]) => m.signal === "bullish")
      .map(([k, m]) => `${this.formatModuleName(k)}: ${m.description}`);

    const bearSignals = Object.entries(modules)
      .filter(([, m]) => m.signal === "bearish")
      .map(([k, m]) => `${this.formatModuleName(k)}: ${m.description}`);

    const neutralSignals = Object.entries(modules)
      .filter(([, m]) => m.signal === "neutral")
      .map(([k, m]) => `${this.formatModuleName(k)}: ${m.description}`);

    const bullCase = bullSignals.length > 0
      ? `Bullish factors for ${ticker}: ${bullSignals.join(". ")}`
      : `No strong bullish signals detected for ${ticker} at this time.`;

    const bearCase = bearSignals.length > 0
      ? `Risk factors for ${ticker}: ${bearSignals.join(". ")}`
      : `No significant bearish risks identified for ${ticker} currently.`;

    let reasoning = `Analysis for ${ticker} (${category}): `;
    reasoning += `${Object.values(modules).filter(m => m.signal === "bullish").length} bullish, `;
    reasoning += `${Object.values(modules).filter(m => m.signal === "bearish").length} bearish, `;
    reasoning += `${Object.values(modules).filter(m => m.signal === "neutral").length} neutral signals. `;

    if (conflicts.length > 0) {
      reasoning += `⚠️ ${conflicts.length} signal conflict(s) detected: ${conflicts.join("; ")}. `;
    }

    reasoning += `Weighted score: ${Math.round(this.computeWeightedScore(modules, CATEGORY_WEIGHTS[category]))} → ${decision} with ${confidence}% confidence. `;

    if (decision === "HOLD" && conflicts.length > 0) {
      reasoning += "Recommendation is HOLD because conflicting signals make a directional call unreliable. Wait for clearer setup.";
    }

    return { bullCase, bearCase, reasoning };
  }
}

export const autonomousDecisionEngine = new AutonomousDecisionEngine();
