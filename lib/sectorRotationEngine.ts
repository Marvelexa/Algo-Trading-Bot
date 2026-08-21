/**
 * Production-Grade Sector Rotation & Capital Flow Engine
 * Computes Real RS-Ratio & RS-Momentum (Weinstein / Mansfield classic approach):
 *   RS_Ratio      = (sector / benchmark)            normalized to 100 over a window
 *   RS_Momentum   = rate-of-change of RS_Ratio over a shorter window
 */

export interface SectorRotationPhase {
  sectorName: string;
  relativeStrengthIndex: number;
  momentumScore: number;
  phase: "LEADING" | "WEAKENING" | "LAGGING" | "IMPROVING";
  capitalFlowScore: number;
}

export interface SectorRotationReport {
  leadingSectors: string[];
  laggingSectors: string[];
  currentSectorPhase: SectorRotationPhase;
  sectorConfluenceBonusPct: number;
}

export class SectorRotationEngine {
  private sectorMapping: Record<string, string> = {
    HDFCBANK: "Nifty Bank", BANKNIFTY: "Nifty Bank",
    TCS: "Nifty IT", INFY: "Nifty IT", WIPRO: "Nifty IT",
    RELIANCE: "Nifty Energy", ONGC: "Nifty Energy",
    TATAMOTORS: "Nifty Auto", MARUTI: "Nifty Auto", "M&M": "Nifty Auto",
    SUNPHARMA: "Nifty Pharma", DRREDDY: "Nifty Pharma",
    ITC: "Nifty FMCG", HINDUNILVR: "Nifty FMCG",
    TATASTEEL: "Nifty Metal", JSWSTEEL: "Nifty Metal",
    ADANIPORTS: "Nifty Infra", LT: "Nifty Infra"
  };

  /**
   * Evaluate sector rotation phase using real RS-Ratio / RS-Momentum math.
   *
   * @param sectorCloses    Recent closes of the sector index (oldest → newest)
   * @param benchmarkCloses Recent closes of the benchmark (Nifty 50)
   */
  public evaluateSectorRotation(
    symbol: string,
    sectorCloses: number[] = [],
    benchmarkCloses: number[] = []
  ): SectorRotationReport {
    const sectorName = this.sectorMapping[symbol?.toUpperCase()] || "Nifty General";
    const window = Math.min(sectorCloses.length, benchmarkCloses.length);
    const N = Math.min(window, 60);
    if (N < 20) {
      return {
        leadingSectors: [], laggingSectors: [],
        currentSectorPhase: {
          sectorName, relativeStrengthIndex: 100, momentumScore: 50,
          phase: "LAGGING", capitalFlowScore: 30
        },
        sectorConfluenceBonusPct: 0
      };
    }

    const sec = sectorCloses.slice(-N);
    const ben = benchmarkCloses.slice(-N);

    const half = Math.floor(N / 2);
    const rsRatioCurrent = (sec[N - 1] / sec[0]) / (ben[N - 1] / ben[0]) * 100;
    const rsRatioPrior   = (sec[half - 1] / sec[0]) / (ben[half - 1] / ben[0]) * 100;
    const rsMomentum = ((rsRatioCurrent - rsRatioPrior) / rsRatioPrior) * 100;

    const relativeStrengthIndex = Number(rsRatioCurrent.toFixed(2));
    const momentumScore = Number(Math.max(0, Math.min(100, 50 + rsMomentum * 4)).toFixed(1));

    let phase: SectorRotationPhase["phase"] = "LAGGING";
    if (relativeStrengthIndex >= 105 && momentumScore >= 55) phase = "LEADING";
    else if (relativeStrengthIndex < 100 && momentumScore >= 55) phase = "IMPROVING";
    else if (relativeStrengthIndex >= 100 && momentumScore < 45) phase = "WEAKENING";
    else phase = "LAGGING";

    const capitalFlowScore = Math.max(0, Math.min(100,
      Math.round(50 + (relativeStrengthIndex - 100) * 1.5 + (momentumScore - 50) * 0.5)));

    const sectorConfluenceBonusPct =
      phase === "LEADING" ? 12 : phase === "IMPROVING" ? 8 : 0;

    return {
      leadingSectors: phase === "LEADING" ? [sectorName] : [],
      laggingSectors: phase === "LAGGING" ? [sectorName] : [],
      currentSectorPhase: {
        sectorName, relativeStrengthIndex, momentumScore,
        phase, capitalFlowScore
      },
      sectorConfluenceBonusPct
    };
  }
}

export const sectorRotationEngine = new SectorRotationEngine();
