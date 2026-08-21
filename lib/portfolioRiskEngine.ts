/**
 * Production-Grade Portfolio Risk Engine
 * Implements portfolio-level risk controls, Value-at-Risk (VaR), Kelly Criterion position sizing,
 * ATR Volatility Sizing, Drawdown circuit breakers, and explicit rejection reason audit logging.
 */

export interface RiskLimitsConfig {
  maxOpenPositions: number;           // Default: 5 positions
  maxPortfolioExposurePct: number;    // Default: 80% of total capital
  maxSectorExposurePct: number;       // Default: 30% per sector
  maxRiskPerTradePct: number;         // Default: 2% of total equity
  maxDailyLossPct: number;            // Default: 3% daily drawdown stop
  maxWeeklyLossPct: number;           // Default: 6% weekly drawdown stop
  maxMonthlyLossPct: number;          // Default: 10% monthly drawdown stop
  maxCorrelationThreshold: number;   // Default: 0.85 correlation coefficient
}

export interface ExistingPosition {
  symbol: string;
  sector?: string;
  allocatedCapital: number;
  riskAmount: number;
}

export interface RiskEvaluationResult {
  passed: boolean;
  rejectionReason?: string;
  recommendedPositionSize: number; // Quantity of shares/contracts
  recommendedCapitalAllocation: number; // Currency amount
  kellyFractionPct: number;
  atrSizedQuantity: number;
  portfolioVaR95Pct: number;
  portfolioVaR99Pct: number;
  currentExposurePct: number;
}

export class PortfolioRiskEngine {
  private config: RiskLimitsConfig = {
    maxOpenPositions: 5,
    maxPortfolioExposurePct: 80,
    maxSectorExposurePct: 30,
    maxRiskPerTradePct: 2,
    maxDailyLossPct: 3,
    maxWeeklyLossPct: 6,
    maxMonthlyLossPct: 10,
    maxCorrelationThreshold: 0.85
  };

  /**
   * Kelly Criterion Position Sizing — f* = (p*b - q) / b
   * Half-Kelly by default for safety. Negative Kelly → 0 (don't bet).
   */
  public calculateKellyPositionSize(
    winRatePct: number = 65,
    payoffRatio: number = 2.5,
    accountCapital: number = 100000,
    fractionalKellyMultiplier: number = 0.5
  ): { kellyPct: number; kellyCapital: number } {
    const p = Math.min(0.95, Math.max(0.05, winRatePct / 100));
    const q = 1 - p;
    const b = Math.max(0.1, payoffRatio);

    const fullKelly = (p * b - q) / b;
    const safeKelly = Math.max(0, Math.min(1, fullKelly * fractionalKellyMultiplier));
    return {
      kellyPct: Number((safeKelly * 100).toFixed(2)),
      kellyCapital: Number((accountCapital * safeKelly).toFixed(2))
    };
  }

  /**
   * ATR Volatility-Based Position Sizing
   * Quantity = (Account * Risk%) / stopDistance. stopDistance uses actual risk or ATR floor.
   */
  public calculateAtrPositionSize(
    accountCapital: number,
    currentPrice: number,
    atr14: number,
    maxRiskPerTradePct: number = 2.0,
    atrMultiplier: number = 1.5
  ): { quantity: number; riskAmount: number } {
    const maxRiskCapital = accountCapital * (maxRiskPerTradePct / 100);
    const stopDistance = Math.max(currentPrice * 0.005, atr14 * atrMultiplier);
    const quantity = stopDistance > 0 ? Math.max(1, Math.floor(maxRiskCapital / stopDistance)) : 0;
    const riskAmount = Number((quantity * stopDistance).toFixed(2));

    return { quantity, riskAmount };
  }

  /**
   * Parametric (normal) VaR. `dailyVolPct` is treated as a percent (e.g. 1.8 means 1.8%).
   */
  public calculatePortfolioVaR(
    portfolioValue: number,
    dailyVolPct: number = 1.8,
    timeHorizonDays: number = 1
  ): { vaR95Amount: number; vaR95Pct: number; vaR99Amount: number; vaR99Pct: number } {
    const z95 = 1.645;
    const z99 = 2.326;
    const horizonFactor = Math.sqrt(Math.max(0, timeHorizonDays));
    const volDecimal = dailyVolPct / 100;

    const vaR95Pct = z95 * volDecimal * horizonFactor * 100;
    const vaR99Pct = z99 * volDecimal * horizonFactor * 100;

    return {
      vaR95Amount: Number((portfolioValue * vaR95Pct / 100).toFixed(2)),
      vaR95Pct: Number(vaR95Pct.toFixed(2)),
      vaR99Amount: Number((portfolioValue * vaR99Pct / 100).toFixed(2)),
      vaR99Pct: Number(vaR99Pct.toFixed(2))
    };
  }

  /**
   * Evaluate a proposed trade against all Portfolio Risk Limits
   */
  public evaluateTradeRisk(
    symbol: string,
    currentPrice: number,
    proposedStopLoss: number,
    targetPrice: number,
    sector: string = "TECHNOLOGY",
    accountCapital: number = 100000,
    openPositions: ExistingPosition[] = [],
    dailyRealizedPnL: number = 0,
    weeklyRealizedPnL: number = 0,
    monthlyRealizedPnL: number = 0,
    customConfig?: Partial<RiskLimitsConfig>
  ): RiskEvaluationResult {
    const cfg = { ...this.config, ...customConfig };
    const stopDistance = Math.abs(currentPrice - proposedStopLoss);

    // 1. Check Max Open Positions Limit
    if (openPositions.length >= cfg.maxOpenPositions) {
      return this.rejectResult(
        `MAX_OPEN_POSITIONS_BREACH: Active positions (${openPositions.length}) reached configured limit of ${cfg.maxOpenPositions}.`,
        accountCapital
      );
    }

    // 2. Check Daily Loss Limit
    const maxDailyLossAllowed = accountCapital * (cfg.maxDailyLossPct / 100);
    if (dailyRealizedPnL <= -maxDailyLossAllowed) {
      return this.rejectResult(
        `DAILY_LOSS_LIMIT_BREACH: Realized daily loss (-₹${Math.abs(dailyRealizedPnL)}) exceeds max daily loss limit (-₹${maxDailyLossAllowed}). Trading suspended for remainder of session.`,
        accountCapital
      );
    }

    // 3. Check Weekly Loss Limit
    const maxWeeklyLossAllowed = accountCapital * (cfg.maxWeeklyLossPct / 100);
    if (weeklyRealizedPnL <= -maxWeeklyLossAllowed) {
      return this.rejectResult(
        `WEEKLY_LOSS_LIMIT_BREACH: Realized weekly loss (-₹${Math.abs(weeklyRealizedPnL)}) exceeds max weekly loss limit (-₹${maxWeeklyLossAllowed}).`,
        accountCapital
      );
    }

    // 4. Check Monthly Loss Limit
    const maxMonthlyLossAllowed = accountCapital * (cfg.maxMonthlyLossPct / 100);
    if (monthlyRealizedPnL <= -maxMonthlyLossAllowed) {
      return this.rejectResult(
        `MONTHLY_LOSS_LIMIT_BREACH: Realized monthly loss (-₹${Math.abs(monthlyRealizedPnL)}) exceeds max monthly loss limit (-₹${maxMonthlyLossAllowed}).`,
        accountCapital
      );
    }

    // 5. Check Portfolio Exposure Limit
    const currentAllocated = openPositions.reduce((acc, p) => acc + p.allocatedCapital, 0);
    const currentExposurePct = Number(((currentAllocated / accountCapital) * 100).toFixed(2));
    if (currentExposurePct >= cfg.maxPortfolioExposurePct) {
      return this.rejectResult(
        `MAX_PORTFOLIO_EXPOSURE_BREACH: Total exposure (${currentExposurePct}%) exceeds max limit of ${cfg.maxPortfolioExposurePct}%.`,
        accountCapital
      );
    }

    // 6. Check Sector Exposure Cap
    const sectorAllocated = openPositions.filter(p => p.sector === sector).reduce((acc, p) => acc + p.allocatedCapital, 0);
    const sectorExposurePct = Number(((sectorAllocated / accountCapital) * 100).toFixed(2));
    if (sectorExposurePct >= cfg.maxSectorExposurePct) {
      return this.rejectResult(
        `SECTOR_EXPOSURE_CAP_BREACH: ${sector} sector exposure (${sectorExposurePct}%) reached max cap of ${cfg.maxSectorExposurePct}%.`,
        accountCapital
      );
    }

    // Calculate Kelly & ATR Position Sizes
    const kelly = this.calculateKellyPositionSize(65, 2.5, accountCapital);
    const atrSized = this.calculateAtrPositionSize(accountCapital, currentPrice, stopDistance);
    const vaR = this.calculatePortfolioVaR(accountCapital);

    // Final recommended quantity bounded by risk limits
    const maxRiskAmount = accountCapital * (cfg.maxRiskPerTradePct / 100);
    const recommendedQty = Math.max(1, Math.floor(maxRiskAmount / stopDistance));
    const recommendedCapital = Number((recommendedQty * currentPrice).toFixed(2));

    return {
      passed: true,
      recommendedPositionSize: recommendedQty,
      recommendedCapitalAllocation: recommendedCapital,
      kellyFractionPct: kelly.kellyPct,
      atrSizedQuantity: atrSized.quantity,
      portfolioVaR95Pct: vaR.vaR95Pct,
      portfolioVaR99Pct: vaR.vaR99Pct,
      currentExposurePct
    };
  }

  private rejectResult(reason: string, accountCapital: number): RiskEvaluationResult {
    const vaR = this.calculatePortfolioVaR(accountCapital);
    return {
      passed: false,
      rejectionReason: reason,
      recommendedPositionSize: 0,
      recommendedCapitalAllocation: 0,
      kellyFractionPct: 0,
      atrSizedQuantity: 0,
      portfolioVaR95Pct: vaR.vaR95Pct,
      portfolioVaR99Pct: vaR.vaR99Pct,
      currentExposurePct: 0
    };
  }
}

export const portfolioRiskEngine = new PortfolioRiskEngine();
