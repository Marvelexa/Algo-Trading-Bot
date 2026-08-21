/**
 * Nexvora AI Stock Research Analyst - Decision Audit Trail & Personal Trading Journal Engine
 * Enforces Personal Risk Discipline:
 * 1. Paper Trading Engine (Virtual $100,000 / ₹10,00,000 account balance)
 * 2. Position Sizing Risk Calculator (Calculates exact share count based on user capital & stop loss)
 * 3. Decision Audit Trail Logger (Stores exact inputs, timestamps, and confidence scores)
 * 4. Personal Trading Journal & Accuracy Tracker (Log win/loss, helpful/unhelpful feedback)
 */

export interface AuditLogEntry {
  id: string;
  ticker: string;
  company: string;
  action: string;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  overallScore: number;
  confidenceScore: number;
  passedRules: string[];
  mode: "PAPER_TRADING" | "LIVE_BROKER";
  timestamp: string;
  userOutcome?: "WIN" | "LOSS" | "BREAKEVEN" | "PENDING";
  userFeedback?: "HELPFUL" | "UNHELPFUL";
}

export interface PositionSizingResult {
  totalCapital: number;
  maxCapitalAllocationPct: number;
  maxCapitalAllocationAmount: number;
  maxRiskPerTradeAmount: number;
  recommendedShareQuantity: number;
  riskPerShare: number;
}

export class AuditJournalEngine {
  private auditLogs: AuditLogEntry[] = [
    {
      id: "LOG-1001",
      ticker: "AAPL",
      company: "Apple Inc.",
      action: "ACCUMULATE ON DIPS",
      entryPrice: 232.50,
      stopLoss: 218.40,
      target1: 252.00,
      overallScore: 83,
      confidenceScore: 79,
      passedRules: ["Coffee Can Monopolistic Moat", "CAN SLIM Momentum Trigger"],
      mode: "PAPER_TRADING",
      timestamp: "2026-07-22 18:40",
      userOutcome: "WIN",
      userFeedback: "HELPFUL"
    },
    {
      id: "LOG-1002",
      ticker: "RELIANCE.NS",
      company: "Reliance Industries",
      action: "ACCUMULATE ON DIPS",
      entryPrice: 3120.50,
      stopLoss: 2980.00,
      target1: 3380.00,
      overallScore: 78,
      confidenceScore: 74,
      passedRules: ["Graham Margin of Safety", "Coffee Can Monopolistic Moat"],
      mode: "PAPER_TRADING",
      timestamp: "2026-07-22 19:15",
      userOutcome: "PENDING",
      userFeedback: "HELPFUL"
    }
  ];

  private paperBalance: number = 100000; // $100,000 USD / ₹10,00,000 INR default

  public calculatePositionSize(
    totalCapital: number,
    currentPrice: number,
    stopLoss: number,
    maxCapitalAllocationPct: number = 2.5,
    maxAccountRiskPct: number = 1.0
  ): PositionSizingResult {
    const capital = Math.max(1000, totalCapital);
    const maxCapitalAllocationAmount = Number(((capital * maxCapitalAllocationPct) / 100).toFixed(2));
    const maxRiskPerTradeAmount = Number(((capital * maxAccountRiskPct) / 100).toFixed(2));

    const riskPerShare = Math.max(0.01, Math.abs(currentPrice - stopLoss));
    
    // Quantity limited by either max risk per share or max position size
    const sharesByRisk = Math.floor(maxRiskPerTradeAmount / riskPerShare);
    const sharesByCap = Math.floor(maxCapitalAllocationAmount / currentPrice);
    
    const recommendedShareQuantity = Math.max(1, Math.min(sharesByRisk, sharesByCap));

    return {
      totalCapital: capital,
      maxCapitalAllocationPct,
      maxCapitalAllocationAmount,
      maxRiskPerTradeAmount,
      recommendedShareQuantity,
      riskPerShare: Number(riskPerShare.toFixed(2))
    };
  }

  public logDecision(
    ticker: string,
    company: string,
    action: string,
    entryPrice: number,
    stopLoss: number,
    target1: number,
    overallScore: number,
    confidenceScore: number,
    passedRules: string[],
    mode: "PAPER_TRADING" | "LIVE_BROKER" = "PAPER_TRADING"
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      ticker,
      company,
      action,
      entryPrice,
      stopLoss,
      target1,
      overallScore,
      confidenceScore,
      passedRules,
      mode,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      userOutcome: "PENDING"
    };

    this.auditLogs.unshift(entry);
    return entry;
  }

  public updateLogFeedback(id: string, feedback: "HELPFUL" | "UNHELPFUL", outcome?: "WIN" | "LOSS" | "BREAKEVEN") {
    const log = this.auditLogs.find(l => l.id === id);
    if (log) {
      log.userFeedback = feedback;
      if (outcome) log.userOutcome = outcome;
    }
  }

  public getAuditLogs(): AuditLogEntry[] {
    return this.auditLogs;
  }

  public getPaperBalance(): number {
    return this.paperBalance;
  }
}

export const auditJournalEngine = new AuditJournalEngine();
