/**
 * Production-Grade Cross-Asset Correlation Engine
 * Computes Pearson correlation across aligned return series.
 */

export interface AssetCorrelationPair {
  assetName: string;
  pearsonCorrelation: number;
  relationshipType: "STRONG_POSITIVE" | "MODERATE_POSITIVE" | "INVERSE_HEDGE" | "NEUTRAL";
  sampleSize: number;
}

export interface CrossAssetCorrelationReport {
  symbol: string;
  benchmarkCorrelation: AssetCorrelationPair;
  vixCorrelation: AssetCorrelationPair;
  usdInrCorrelation: AssetCorrelationPair;
  crudeOilCorrelation: AssetCorrelationPair;
  diversificationScore: number;
}

export class CrossAssetCorrelationEngine {

  private static returnsFromCloses(closes: number[]): number[] {
    const r: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0) r.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    return r;
  }

  private static pearson(x: number[], y: number[]): { r: number; n: number } {
    const n = Math.min(x.length, y.length);
    if (n < 5) return { r: 0, n };
    let sx = 0, sy = 0;
    for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; }
    const mx = sx / n, my = sy / n;
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx, dy = y[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }
    const denom = Math.sqrt(dx2 * dy2);
    return { r: denom > 0 ? num / denom : 0, n };
  }

  private static classify(r: number): AssetCorrelationPair["relationshipType"] {
    if (r >= 0.7) return "STRONG_POSITIVE";
    if (r >= 0.3) return "MODERATE_POSITIVE";
    if (r <= -0.3) return "INVERSE_HEDGE";
    return "NEUTRAL";
  }

  public evaluateCrossAssetCorrelation(
    symbol: string,
    targetCloses: number[] = [],
    benchmarkCloses: number[] = [],
    vixCloses: number[] = [],
    usdInrCloses: number[] = [],
    crudeCloses: number[] = []
  ): CrossAssetCorrelationReport {
    const target = CrossAssetCorrelationEngine.returnsFromCloses(targetCloses);

    const compute = (name: string, closes: number[]): AssetCorrelationPair => {
      const r = CrossAssetCorrelationEngine.returnsFromCloses(closes);
      const { r: corr, n } = CrossAssetCorrelationEngine.pearson(target, r);
      return {
        assetName: name,
        pearsonCorrelation: Number(corr.toFixed(4)),
        relationshipType: CrossAssetCorrelationEngine.classify(corr),
        sampleSize: n
      };
    };

    const bench   = compute("NIFTY 50 Benchmark", benchmarkCloses);
    const vix     = compute("India VIX (Volatility Index)", vixCloses);
    const usd     = compute("USD/INR Currency Pair", usdInrCloses);
    const crude   = compute("Brent Crude Oil", crudeCloses);

    const absSum = Math.abs(bench.pearsonCorrelation)
      + Math.abs(vix.pearsonCorrelation)
      + Math.abs(usd.pearsonCorrelation)
      + Math.abs(crude.pearsonCorrelation);
    const diversificationScore = Math.round(Math.max(0, Math.min(100, 100 - (absSum / 4) * 60)));

    return {
      symbol,
      benchmarkCorrelation: bench,
      vixCorrelation: vix,
      usdInrCorrelation: usd,
      crudeOilCorrelation: crude,
      diversificationScore
    };
  }
}

export const crossAssetCorrelationEngine = new CrossAssetCorrelationEngine();
