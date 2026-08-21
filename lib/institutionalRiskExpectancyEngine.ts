/**
 * Institutional Risk, Expectancy & Portfolio Engine
 * Inspired by Riskfolio-Lib, PyPortfolioOpt, Backtrader, and vectorbt
 * Calculates R-Multiple, Expectancy ($E$), Kelly Criterion Sizing, CVaR 95%, Probability of Ruin, and Net STT/Slippage Adjusted R:R
 */

import { MarketBar } from "./aiTradingBrainV1";

export interface InstitutionalRiskReport {
  grossRiskRewardRatio: number; // e.g. 5.0 (1:5.0)
  netRiskRewardRatio: number; // Adjusted for STT tax, brokerage & slippage
  rMultiple: number; // Realized R-Multiple
  mathematicalExpectancy: number; // Expectancy E per $1 / ₹1 risked
  expectancyVerdict: "HIGH_EDGE" | "MODERATE_EDGE" | "NEUTRAL" | "NEGATIVE_EDGE";
  
  // Kelly Criterion Capital Sizing
  fullKellyPct: number;
  recommendedHalfKellyPct: number;
  recommendedPositionSizeUnits: number;
  recommendedCapitalAllocationAmount: number;

  // Riskfolio-Lib Value at Risk & Tail Loss Metrics
  valueAtRisk95Pct: number; // VaR 95%
  conditionalValueAtRisk95Pct: number; // CVaR 95% (Expected Shortfall)
  probabilityOfRuinPct: number; // Theoretical Ruin Probability

  // Excursion Limits
  maxAdverseExcursionLimit: number; // MAE Limit Price
  maxFavorableExcursionTarget: number; // MFE Target Price

  // Cost Friction Breakdown
  costFrictionPct: number; // STT + Exchange fees + Slippage %
  netRealizedRewardPerTrade: number;
  summaryRiskInsight: string;
}

class InstitutionalRiskExpectancyEngine {
  /**
   * Evaluates Institutional Risk, Expectancy, and Position Sizing
   */
  public evaluateInstitutionalRisk(
    symbol: string,
    currentPrice: number,
    entryPrice: number,
    stopLoss: number,
    targetPrice: number,
    winProbabilityPct: number,
    bars: MarketBar[],
    accountCapital: number = 500000 // Default ₹5,000,000 / $500,000 portfolio
  ): InstitutionalRiskReport {
    const isBullish = targetPrice > entryPrice;

    // 1. Gross Risk & Reward Distance
    const riskDistance = Math.max(0.01, Math.abs(entryPrice - stopLoss));
    const rewardDistance = Math.max(0.01, Math.abs(targetPrice - entryPrice));

    const grossRiskRewardRatio = Number((rewardDistance / riskDistance).toFixed(2));
    const rMultiple = grossRiskRewardRatio;

    // 2. Cost Friction (STT Tax 0.1% + Exchange/SEBI fees 0.03% + Execution Slippage 0.03%)
    const costFrictionPct = symbol.includes("USD") || symbol.includes("BTC") ? 0.0006 : 0.0016; // 0.16% total friction
    const frictionCostAmount = entryPrice * costFrictionPct;

    const netRewardDistance = Math.max(0.0, rewardDistance - frictionCostAmount * 2);
    const netRiskRewardRatio = Number((netRewardDistance / (riskDistance + frictionCostAmount)).toFixed(2));

    // 3. Mathematical Expectancy E = (WinProb * Reward) - (LossProb * Risk)
    const winProb = Math.min(0.95, Math.max(0.05, winProbabilityPct / 100));
    const lossProb = 1 - winProb;

    const expectancyPerUnit = (winProb * grossRiskRewardRatio) - (lossProb * 1.0);
    const mathematicalExpectancy = Number(expectancyPerUnit.toFixed(2));

    let expectancyVerdict: InstitutionalRiskReport["expectancyVerdict"] = "NEUTRAL";
    if (mathematicalExpectancy >= 1.5) expectancyVerdict = "HIGH_EDGE";
    else if (mathematicalExpectancy >= 0.5) expectancyVerdict = "MODERATE_EDGE";
    else if (mathematicalExpectancy < 0) expectancyVerdict = "NEGATIVE_EDGE";

    // 4. PyPortfolioOpt Kelly Criterion Position Sizing: Full Kelly K = W - ((1 - W) / R)
    const fullKelly = winProb - (lossProb / Math.max(0.1, grossRiskRewardRatio));
    const fullKellyPct = Number((Math.max(0, Math.min(0.25, fullKelly)) * 100).toFixed(2)); // Cap full kelly at max 25%
    const recommendedHalfKellyPct = Number((fullKellyPct * 0.5).toFixed(2)); // Half-Kelly for conservative institutional risk

    const recommendedCapitalAllocationAmount = Number(((accountCapital * recommendedHalfKellyPct) / 100).toFixed(2));
    const recommendedPositionSizeUnits = Math.max(1, Math.floor(recommendedCapitalAllocationAmount / currentPrice));

    // 5. Riskfolio-Lib VaR 95% & CVaR 95% Expected Tail Loss Calculation
    const closes = (bars && bars.length > 5) ? bars.map(b => b.close) : [currentPrice];
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    returns.sort((a, b) => a - b); // Ascending order for tail risk percentile

    const idx95 = Math.floor(returns.length * 0.05);
    const var95Pct = returns.length > 5 ? Math.abs(returns[idx95] || -0.02) * 100 : 2.5;
    
    // CVaR is mean of returns below 5th percentile
    const tailReturns = returns.slice(0, Math.max(1, idx95));
    const cvar95Pct = tailReturns.length > 0 ? (Math.abs(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length) * 100) : 3.8;

    const valueAtRisk95Pct = Number(var95Pct.toFixed(2));
    const conditionalValueAtRisk95Pct = Number(Math.max(valueAtRisk95Pct * 1.25, cvar95Pct).toFixed(2));

    // 6. Probability of Ruin P_ruin = ((1 - Edge) / (1 + Edge))^CapitalUnits
    const edge = Math.max(0.01, (winProb * grossRiskRewardRatio) - lossProb);
    const ruinRatio = Math.max(0.1, (1 - edge) / (1 + edge));
    const capitalUnits = 20; // 5% risk per trade = 20 units
    const probRuin = Math.pow(ruinRatio, capitalUnits) * 100;
    const probabilityOfRuinPct = Number((Math.min(99, Math.max(0.01, probRuin))).toFixed(2));

    // 7. MAE / MFE Excursion Bounds
    const maxAdverseExcursionLimit = Number((isBullish ? stopLoss * 0.998 : stopLoss * 1.002).toFixed(2));
    const maxFavorableExcursionTarget = Number((isBullish ? targetPrice * 1.005 : targetPrice * 0.995).toFixed(2));

    const netRealizedRewardPerTrade = Number((netRewardDistance * recommendedPositionSizeUnits).toFixed(2));

    const summaryRiskInsight = `Institutional Risk Report (${symbol}): R:R 1:${grossRiskRewardRatio} (Net STT R:R 1:${netRiskRewardRatio}) | Expectancy E: +${mathematicalExpectancy} R/trade | Half-Kelly Position: ${recommendedHalfKellyPct}% (${recommendedPositionSizeUnits} units) | CVaR 95%: -${conditionalValueAtRisk95Pct}%.`;

    return {
      grossRiskRewardRatio,
      netRiskRewardRatio,
      rMultiple,
      mathematicalExpectancy,
      expectancyVerdict,
      fullKellyPct,
      recommendedHalfKellyPct,
      recommendedPositionSizeUnits,
      recommendedCapitalAllocationAmount,
      valueAtRisk95Pct,
      conditionalValueAtRisk95Pct,
      probabilityOfRuinPct,
      maxAdverseExcursionLimit,
      maxFavorableExcursionTarget,
      costFrictionPct: Number((costFrictionPct * 100).toFixed(2)),
      netRealizedRewardPerTrade,
      summaryRiskInsight
    };
  }
}

export const institutionalRiskExpectancyEngine = new InstitutionalRiskExpectancyEngine();
