/**
 * Production-Grade Bayesian Confidence Engine
 * Multi-source Bayesian Updating with log-odds arithmetic:
 *   log_posterior_odds = log_prior_odds + Σ log(LR_i)
 *
 * Likelihood ratios are converted from score-space into LR via
 * LR = exp(k * (score - 50) / 50), centered so a score of 50 → LR ≈ 1.
 * This avoids the singular blow-up when score = 100.
 */

export interface BayesianUpdatingReport {
  priorWinProbPct: number;
  likelihoodRatioTech: number;
  likelihoodRatioMemory: number;
  likelihoodRatioFundamental: number;
  posteriorWinProbPct: number;
  bayesianEdgePct: number;
  formulaDescription: string;
}

export class BayesianConfidenceEngine {

  /**
   * Map a 0–100 evidence score to a likelihood ratio LR = P(E|Win)/P(E|Loss).
   * score=50 → LR≈1 (neutral). score=80 → LR≈3. score=20 → LR≈0.33.
   * Capped at [1/10, 10] to prevent degenerate posteriors.
   */
  private scoreToLR(score: number, sensitivity: number = 1.0): number {
    const clamped = Math.min(100, Math.max(0, score));
    const lr = Math.exp(sensitivity * ((clamped - 50) / 50) * Math.log(3));
    return Math.min(10, Math.max(0.1, lr));
  }

  /**
   * Posterior Win Probability = (Prior * LR_Tech * LR_Mem * LR_Fund) normalized.
   * Assumes conditional independence of evidence (standard naïve Bayes assumption).
   */
  public calculatePosterior(
    priorWinProbPct: number = 50.0,
    techScore: number = 70,
    marketMemoryWinRatePct: number = 65,
    fundamentalScore: number = 60,
    newsSentimentScore: number = 65
  ): BayesianUpdatingReport {
    const prior = Math.min(0.95, Math.max(0.05, priorWinProbPct / 100));

    const lrTech = this.scoreToLR(techScore, 1.0);
    const lrMem  = this.scoreToLR(marketMemoryWinRatePct, 1.0);
    const lrFund = this.scoreToLR(fundamentalScore, 0.85);
    const lrSent = this.scoreToLR(newsSentimentScore, 0.6);

    const logPriorOdds = Math.log(prior / (1 - prior));
    const logPosteriorOdds = logPriorOdds
      + Math.log(lrTech) + Math.log(lrMem) + Math.log(lrFund) + Math.log(lrSent);
    const posteriorP = 1 / (1 + Math.exp(-logPosteriorOdds));

    const posteriorWinProbPct = Number((posteriorP * 100).toFixed(2));
    const edgePct = Number((posteriorWinProbPct - priorWinProbPct).toFixed(2));

    return {
      priorWinProbPct,
      likelihoodRatioTech: Number(lrTech.toFixed(3)),
      likelihoodRatioMemory: Number(lrMem.toFixed(3)),
      likelihoodRatioFundamental: Number(lrFund.toFixed(3)),
      posteriorWinProbPct,
      bayesianEdgePct: edgePct,
      formulaDescription: "Bayesian Posterior: log-odds = log(prior/(1-prior)) + Σ log(LR_i); P = sigmoid(log-odds). Assumes conditional independence."
    };
  }
}

export const bayesianConfidenceEngine = new BayesianConfidenceEngine();
