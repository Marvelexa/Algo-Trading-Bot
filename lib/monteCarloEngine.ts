/**
 * Production-Grade Monte Carlo Portfolio Simulation Engine
 * Simulates 10,000+ portfolio path iterations by bootstrapping historical trade return distributions.
 * Computes Probability of Ruin %, Expected CAGR %, Worst Drawdown %, Median Drawdown %, and 95th/5th Percentiles.
 */

export interface MonteCarloReport {
  symbol: string;
  totalSimulationsCount: number;
  tradeSequenceLength: number;
  initialCapital: number;

  probabilityOfRuinPct: number; // % paths where drawdown reached >= threshold
  expectedCagrPct: number;      // Median annualized CAGR
  worstCaseCagrPct: number;     // 5th percentile CAGR
  bestCaseCagrPct: number;      // 95th percentile CAGR

  medianDrawdownPct: number;
  worstDrawdownPct: number;     // 95th percentile max drawdown

  medianFinalCapital: number;
  fifthPercentileCapital: number;
  ninetyFifthPercentileCapital: number;
}

export class MonteCarloEngine {

  private rngState: number | null = null;

  private rng(): number {
    if (this.rngState === null) {
      this.rngState = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    }
    let x = this.rngState;
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    this.rngState = x >>> 0;
    return (this.rngState + 1) / 0x100000000;
  }

  public seedRng(seed: number): void {
    this.rngState = (seed >>> 0) || 1;
  }

  /**
   * Run 10,000+ Monte Carlo Portfolio Path Simulations
   * @param tradesPerYear Used to annualize CAGR. Provide if you know trading frequency.
   */
  public runMonteCarloSimulations(
    symbol: string,
    tradeReturnPcts: number[] = [2.5, -1.2, 3.8, -1.5, 4.2, -0.8, 1.9, -1.1, 5.0, -2.0],
    simulationsCount: number = 10000,
    tradesPerPath: number = 100,
    initialCapital: number = 100000,
    ruinThresholdPct: number = 50.0,
    tradesPerYear: number = 50
  ): MonteCarloReport {
    const returnsPool = tradeReturnPcts.length > 0 ? tradeReturnPcts : [2.0, -1.0, 3.0, -1.5];
    const finalCapitals: number[] = [];
    const maxDrawdowns: number[] = [];
    let ruinCount = 0;

    const yearsPerPath = tradesPerYear > 0 ? tradesPerPath / tradesPerYear : 1;

    for (let sim = 0; sim < simulationsCount; sim++) {
      let equity = initialCapital;
      let peak = initialCapital;
      let pathMaxDrawdownPct = 0;
      let pathRuin = false;

      for (let t = 0; t < tradesPerPath; t++) {
        const randomIndex = Math.floor(this.rng() * returnsPool.length);
        const returnPct = returnsPool[randomIndex];
        equity *= 1 + (returnPct / 100);

        if (equity > peak) peak = equity;
        if (peak > 0) {
          const ddPct = ((peak - equity) / peak) * 100;
          if (ddPct > pathMaxDrawdownPct) pathMaxDrawdownPct = ddPct;
          if (!pathRuin && ddPct >= ruinThresholdPct) pathRuin = true;
        }
      }

      if (pathRuin) ruinCount++;
      finalCapitals.push(equity);
      maxDrawdowns.push(pathMaxDrawdownPct);
    }

    finalCapitals.sort((a, b) => a - b);
    maxDrawdowns.sort((a, b) => a - b);

    const idx = (p: number) => Math.min(finalCapitals.length - 1, Math.max(0, Math.floor(simulationsCount * p)));
    const idxDD = (p: number) => Math.min(maxDrawdowns.length - 1, Math.max(0, Math.floor(simulationsCount * p)));

    const medianCap = finalCapitals[idx(0.50)];
    const cap5th = finalCapitals[idx(0.05)];
    const cap95th = finalCapitals[idx(0.95)];

    const medianDD = maxDrawdowns[idxDD(0.50)];
    const worstDD = maxDrawdowns[idxDD(0.95)];

    const cagr = (final: number) =>
      yearsPerPath > 0 && initialCapital > 0 && final > 0
        ? (Math.pow(final / initialCapital, 1 / yearsPerPath) - 1) * 100
        : 0;

    return {
      symbol,
      totalSimulationsCount: simulationsCount,
      tradeSequenceLength: tradesPerPath,
      initialCapital,
      probabilityOfRuinPct: Number(((ruinCount / simulationsCount) * 100).toFixed(2)),
      expectedCagrPct: Number(cagr(medianCap).toFixed(2)),
      worstCaseCagrPct: Number(cagr(cap5th).toFixed(2)),
      bestCaseCagrPct: Number(cagr(cap95th).toFixed(2)),
      medianDrawdownPct: Number(medianDD.toFixed(2)),
      worstDrawdownPct: Number(worstDD.toFixed(2)),
      medianFinalCapital: Number(medianCap.toFixed(2)),
      fifthPercentileCapital: Number(cap5th.toFixed(2)),
      ninetyFifthPercentileCapital: Number(cap95th.toFixed(2))
    };
  }
}

export const monteCarloEngine = new MonteCarloEngine();
