/**
 * Nexvora AI Stock Research Analyst - Personal Trading Discipline & Profile Engine
 * Manages:
 * 1. Personal Trading Profile (Style, Risk Appetite, Preferred Sectors, Discipline Rules)
 * 2. Pre-Analysis Context Questionnaire & Input Template
 * 3. No-Trade Zone Recognition Guardrail (Flagging when best decision is STAY IN CASH)
 * 4. Personal Risk Discipline Hard Limits (Max Capital %, Daily Max Loss ₹, Revenge Trading Protection)
 */

export interface PersonalProfile {
  tradingStyle: "INTRADAY" | "SWING_TRADER" | "LONG_TERM_INVESTOR";
  riskAppetite: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  preferredSectors: string[];
  maxRiskPerTradePct: number; // e.g. 2.0%
  dailyMaxLossLimitRupees: number; // e.g. ₹10,000
  maxOpenPositions: number; // e.g. 3
  avoidFirst15MinOpen: boolean;
  avoidMajorNewsEvents: boolean;
  confidenceThresholdPct: number; // e.g. 75%
}

export interface PreAnalysisContext {
  purpose: "TRADE" | "INVESTMENT";
  timeHorizon: "INTRADAY" | "DAYS_WEEKS" | "MONTHS_YEARS";
  allocatedCapital: number; // ₹ INR Budget
  desiredProfitTargetRupees: number; // ₹ Desired Profit Target
  desiredProfitTargetPct: number; // % Desired Profit Target
  existingExposure: boolean;
  entryTrigger: "FRESH_IDEA" | "TRACKING_TARGET" | "AVERAGING";
  interestReason: "TECHNICAL_SETUP" | "FUNDAMENTAL_MOAT" | "NEWS_HYPE" | "COMMUNITY_TIP";
  targetPriceLevel?: number;
  userNotes?: string;
}

export interface NoTradeZoneEvaluation {
  isNoTradeZone: boolean;
  noTradeReason: string;
  suggestedAction: "NO_TRADE_STAY_IN_CASH" | "ACCUMULATE_ON_DIPS" | "HOLD" | "WATCHLIST";
  disciplineWarning?: string;
}

export class PersonalProfileEngine {
  private profile: PersonalProfile = {
    tradingStyle: "SWING_TRADER",
    riskAppetite: "MODERATE",
    preferredSectors: ["IT/Tech", "Banking/Financials", "Automobile", "Energy"],
    maxRiskPerTradePct: 2.0,
    dailyMaxLossLimitRupees: 10000,
    maxOpenPositions: 3,
    avoidFirst15MinOpen: true,
    avoidMajorNewsEvents: true,
    confidenceThresholdPct: 75
  };

  private currentContext: PreAnalysisContext = {
    purpose: "TRADE",
    timeHorizon: "DAYS_WEEKS",
    allocatedCapital: 50000,
    desiredProfitTargetRupees: 5000,
    desiredProfitTargetPct: 10.0,
    existingExposure: false,
    entryTrigger: "FRESH_IDEA",
    interestReason: "TECHNICAL_SETUP",
    userNotes: "Looking for swing breakout opportunity above key moving average."
  };

  public getProfile(): PersonalProfile {
    return { ...this.profile };
  }

  public updateProfile(updated: Partial<PersonalProfile>): PersonalProfile {
    this.profile = { ...this.profile, ...updated };
    return this.getProfile();
  }

  public getCurrentContext(): PreAnalysisContext {
    return { ...this.currentContext };
  }

  public updateContext(updated: Partial<PreAnalysisContext>): PreAnalysisContext {
    this.currentContext = { ...this.currentContext, ...updated };
    return this.getCurrentContext();
  }

  public calculateBudgetPlan(
    budgetRupees: number,
    profitTargetRupees: number,
    currentPrice: number,
    stopLossPrice: number,
    projectedTargetPrice: number
  ) {
    const safePrice = currentPrice || 1000;
    const quantity = Math.max(1, Math.floor((budgetRupees || 50000) / safePrice));
    const actualInvested = Number((quantity * safePrice).toFixed(2));
    const requiredTargetPrice = Number((safePrice + ((profitTargetRupees || 5000) / quantity)).toFixed(2));
    const projectedProfitRupees = Number(((projectedTargetPrice - safePrice) * quantity).toFixed(2));
    const maxLossRupees = Number(((safePrice - stopLossPrice) * quantity).toFixed(2));
    const targetAchievable = projectedTargetPrice >= requiredTargetPrice;

    return {
      quantity,
      actualInvested,
      requiredTargetPrice,
      projectedProfitRupees,
      maxLossRupees,
      targetAchievable,
      profitTargetPct: Number((((profitTargetRupees || 5000) / actualInvested) * 100).toFixed(1))
    };
  }

  /**
   * Evaluates if the current stock setup falls into a NO-TRADE ZONE.
   * Checks market hours discipline, signal divergence, and hype-driven interest caution.
   */
  public evaluateNoTradeZone(
    overallScore: number,
    confidenceScore: number,
    hasConflict: boolean,
    interestReason?: string
  ): NoTradeZoneEvaluation {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Check market open discipline (9:15 AM to 9:30 AM IST volatility)
    const isFirst15Min = (currentHour === 9 && currentMin >= 15 && currentMin <= 30);
    if (this.profile.avoidFirst15MinOpen && isFirst15Min) {
      return {
        isNoTradeZone: true,
        noTradeReason: "Market Open Volatility (9:15 - 9:30 AM IST). High risk of fakeouts.",
        suggestedAction: "NO_TRADE_STAY_IN_CASH",
        disciplineWarning: "Discipline Guardrail: Avoid trading during the first 15 minutes of market open."
      };
    }

    // Check low confidence threshold
    if (confidenceScore < this.profile.confidenceThresholdPct) {
      return {
        isNoTradeZone: true,
        noTradeReason: `Pattern Match Strength (${confidenceScore}%) is below your personal threshold (${this.profile.confidenceThresholdPct}%).`,
        suggestedAction: "NO_TRADE_STAY_IN_CASH",
        disciplineWarning: "High Uncertainty: Signals do not offer sufficient statistical alignment today."
      };
    }

    // Check module conflict
    if (hasConflict && this.profile.riskAppetite === "CONSERVATIVE") {
      return {
        isNoTradeZone: true,
        noTradeReason: "Conflicting Signals Detected: Technical and Fundamental modules disagree.",
        suggestedAction: "NO_TRADE_STAY_IN_CASH",
        disciplineWarning: "Conservative Profile Protection: Do not take positions when core modules diverge."
      };
    }

    // Check hype-driven interest reason
    if (interestReason === "NEWS_HYPE" || interestReason === "COMMUNITY_TIP") {
      return {
        isNoTradeZone: false,
        noTradeReason: "Hype / Social Media Interest Detected. Proceed only with strict stop-loss discipline.",
        suggestedAction: "WATCHLIST",
        disciplineWarning: "Caution: Do not trade on social media tip or news hype without fundamental validation."
      };
    }

    return {
      isNoTradeZone: false,
      noTradeReason: "Valid setup identified matching your personal trading profile.",
      suggestedAction: overallScore >= 75 ? "ACCUMULATE_ON_DIPS" : "HOLD"
    };
  }
}

export const personalProfileEngine = new PersonalProfileEngine();
