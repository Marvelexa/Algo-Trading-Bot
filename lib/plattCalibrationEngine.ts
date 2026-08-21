/**
 * Production-Grade Platt Probability Calibration Engine with Auditable Diagnostics
 * Platt Scaling: P_calibrated = 1 / (1 + exp(-(A * logit(p) + B)))
 * Diagnostics computed from a held-out outcome window (actual labels).
 */

export interface CalibrationDiagnostics {
  brierScore: number;
  ecePct: number;
  calibrationDatasetSize: number;
  lastCalibrationTimestamp: string;
}

export interface CalibrationResult {
  rawProbPct: number;
  calibratedProbPct: number;
  calibrationDeltaPct: number;
  diagnostics: CalibrationDiagnostics;
  formulaText: string;
}

export class PlattCalibrationEngine {
  private paramA: number = 0.85;
  private paramB: number = -0.05;
  private temperature: number = 1.15;

  private predictedHistory: number[] = [];
  private outcomeHistory: number[] = [];
  private lastCalibrationDate: string = "1970-01-01";
  private datasetSize: number = 0;
  private static MAX_HISTORY = 5000;

  constructor(a: number = 0.85, b: number = -0.05, t: number = 1.15) {
    this.paramA = a;
    this.paramB = b;
    this.temperature = t;
  }

  /**
   * Calibrate a raw win probability. If `actualOutcome` (0/1) is provided,
   * it is appended to the rolling diagnostics window so Brier/ECE reflect
   * real model behavior instead of a fabricated constant.
   */
  public calibrateProbability(rawWinProbPct: number, actualOutcome?: 0 | 1 | null): CalibrationResult {
    const p = Math.min(0.999, Math.max(0.001, rawWinProbPct / 100));
    const logit = Math.log(p / (1 - p));
    const scaledLogit = (this.paramA * logit + this.paramB) / this.temperature;
    const calibratedP = 1 / (1 + Math.exp(-scaledLogit));

    if (actualOutcome === 0 || actualOutcome === 1) {
      this.predictedHistory.push(calibratedP);
      this.outcomeHistory.push(actualOutcome);
      if (this.predictedHistory.length > PlattCalibrationEngine.MAX_HISTORY) {
        this.predictedHistory.shift();
        this.outcomeHistory.shift();
      }
      this.datasetSize = this.predictedHistory.length;
      this.lastCalibrationDate = new Date().toISOString();
    }

    const diagnostics = this.computeDiagnostics();
    const calibratedProbPct = Number((calibratedP * 100).toFixed(2));
    return {
      rawProbPct: rawWinProbPct,
      calibratedProbPct,
      calibrationDeltaPct: Number((calibratedProbPct - rawWinProbPct).toFixed(2)),
      diagnostics,
      formulaText: `Platt: P = 1/(1+exp(-(${this.paramA} * logit(p) + ${this.paramB})/${this.temperature}))`
    };
  }

  /**
   * Brier score = mean((p_i - y_i)^2). Perfect = 0; random 0.25 for binary.
   * ECE = weighted average |confidence - accuracy| over probability bins.
   */
  public computeDiagnostics(): CalibrationDiagnostics {
    const n = this.predictedHistory.length;
    if (n === 0) {
      return { brierScore: 0, ecePct: 0, calibrationDatasetSize: 0, lastCalibrationTimestamp: this.lastCalibrationDate };
    }
    let brierSum = 0;
    for (let i = 0; i < n; i++) {
      const d = this.predictedHistory[i] - this.outcomeHistory[i];
      brierSum += d * d;
    }
    const brierScore = Number((brierSum / n).toFixed(4));

    const bins = 10;
    const binCounts = new Array(bins).fill(0);
    const binConfSum = new Array(bins).fill(0);
    const binAccSum = new Array(bins).fill(0);
    for (let i = 0; i < n; i++) {
      const p = this.predictedHistory[i];
      const idx = Math.min(bins - 1, Math.floor(p * bins));
      binCounts[idx]++;
      binConfSum[idx] += p;
      binAccSum[idx] += this.outcomeHistory[i];
    }
    let ece = 0;
    for (let b = 0; b < bins; b++) {
      if (binCounts[b] === 0) continue;
      const conf = binConfSum[b] / binCounts[b];
      const acc  = binAccSum[b]  / binCounts[b];
      ece += (binCounts[b] / n) * Math.abs(acc - conf);
    }
    return {
      brierScore,
      ecePct: Number((ece * 100).toFixed(2)),
      calibrationDatasetSize: n,
      lastCalibrationTimestamp: this.lastCalibrationDate
    };
  }

  /** Replace history (e.g. when loading from persistent storage). */
  public loadHistory(predicted: number[], outcomes: number[], timestamp: string): void {
    const n = Math.min(predicted.length, outcomes.length, PlattCalibrationEngine.MAX_HISTORY);
    this.predictedHistory = predicted.slice(-n);
    this.outcomeHistory = outcomes.slice(-n);
    this.datasetSize = n;
    this.lastCalibrationDate = timestamp;
  }

  public setParameters(a: number, b: number, temperature: number): void {
    this.paramA = a;
    this.paramB = b;
    this.temperature = temperature;
  }
}

export const plattCalibrationEngine = new PlattCalibrationEngine();
