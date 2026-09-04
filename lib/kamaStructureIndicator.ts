// ============================================================================
// kamaStructureIndicator.ts
// Adaptive Low-Lag Indicator Stack for Nexvora Delta Auto-Trader
//
// Layers:
//   1. KAMA (Kaufman's Adaptive Moving Average) — adaptive-lag directional bias
//   2. Price Structure (Swing Highs/Lows -> BOS / CHoCH) — near-zero-lag confirmation
//   3. Real Wilder's ADX — trend-strength gate (replaces the hardcoded 28.5 stub)
//   4. Wilder's ATR — volatility sizing for SL/TP (unchanged role, real calc)
//   5. Composite Score — deterministic weighted decision table (no independence
//      assumption bug — this is a straight weighted sum, not multiplied probabilities)
//
// Usage: feed confirmed (closed) candles only. Do not call on an in-progress candle;
// your 30-60s daemon tick already aligns with this.
// ============================================================================

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

// ----------------------------------------------------------------------------
// 1. KAMA — Kaufman's Adaptive Moving Average
// ----------------------------------------------------------------------------

export interface KAMAPoint {
  value: number;
  slope: number;            // kama[i] - kama[i-1]. Positive = bullish drift.
  efficiencyRatio: number;  // 0 (choppy) .. 1 (strong clean trend)
}

/**
 * KAMA adapts its own smoothing constant every bar using the Efficiency Ratio:
 * ER = |net price change over `period`| / (sum of |bar-to-bar changes| over `period`)
 *
 * ER near 1  -> strong directional move -> smoothing constant approaches the FAST EMA
 * ER near 0  -> choppy/sideways         -> smoothing constant approaches the SLOW EMA
 *
 * This is what gives you "low lag when it matters, low noise when it doesn't" —
 * a single fixed EMA/HMA period can't do both.
 */
export function calculateKAMA(
  candles: Candle[],
  period: number = 10,
  fastPeriod: number = 2,
  slowPeriod: number = 30
): KAMAPoint[] {
  const closes = candles.map((c) => c.close);
  const results: KAMAPoint[] = new Array(closes.length);

  const fastAlpha = 2 / (fastPeriod + 1);
  const slowAlpha = 2 / (slowPeriod + 1);

  // Seed: first `period` bars just track price directly (not enough history for ER)
  let prevKAMA = closes[0] ?? 0;
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      results[i] = { value: closes[i], slope: 0, efficiencyRatio: 0 };
      prevKAMA = closes[i];
      continue;
    }

    const netChange = Math.abs(closes[i] - closes[i - period]);
    let volatilitySum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      volatilitySum += Math.abs(closes[j] - closes[j - 1]);
    }
    const efficiencyRatio = volatilitySum === 0 ? 0 : netChange / volatilitySum;

    const smoothingConstant = Math.pow(
      efficiencyRatio * (fastAlpha - slowAlpha) + slowAlpha,
      2
    );

    const kama = prevKAMA + smoothingConstant * (closes[i] - prevKAMA);
    results[i] = { value: kama, slope: kama - prevKAMA, efficiencyRatio };
    prevKAMA = kama;
  }

  return results;
}

// ----------------------------------------------------------------------------
// 2. Price Structure — Swing points, BOS / CHoCH
// ----------------------------------------------------------------------------

export type StructureSignal = "BOS_BULL" | "BOS_BEAR" | "CHOCH_BULL" | "CHOCH_BEAR" | "NONE";

export interface SwingPoint {
  index: number;
  price: number;
  type: "HIGH" | "LOW";
}

/**
 * Finds fractal swing highs/lows: a bar whose high (or low) is the most extreme
 * within `lookback` bars on each side. Confirmed only once the right side is fully formed,
 * so this never repaints once flagged (unlike a raw MA cross).
 */
export function findSwingPoints(candles: Candle[], lookback: number = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const windowSlice = candles.slice(i - lookback, i + lookback + 1);

    const isHigh = windowSlice.every((c) => c.high <= candles[i].high);
    const isLow = windowSlice.every((c) => c.low >= candles[i].low);

    if (isHigh) swings.push({ index: i, price: candles[i].high, type: "HIGH" });
    if (isLow) swings.push({ index: i, price: candles[i].low, type: "LOW" });
  }
  return swings;
}

/**
 * BOS (Break of Structure) = price closes beyond the most recent swing point
 * in the direction of the existing trend -> trend continuation.
 * CHoCH (Change of Character) = price closes beyond the most recent swing point
 * against the prior trend direction -> possible reversal.
 *
 * Both fire on a CONFIRMED CLOSE of the breaking candle, so there is no
 * intra-candle repaint and the lag is effectively one candle.
 */
export function detectStructureSignal(
  candles: Candle[],
  lookback: number = 3
): StructureSignal {
  const swings = findSwingPoints(candles, lookback);
  if (swings.length < 2) return "NONE";

  const lastHigh = [...swings].reverse().find((s) => s.type === "HIGH");
  const lastLow = [...swings].reverse().find((s) => s.type === "LOW");
  if (!lastHigh || !lastLow) return "NONE";

  const lastClose = candles[candles.length - 1].close;
  const priorTrendBullish = lastLow.index > lastHigh.index; // most recent extreme was a low -> was trending down before that low, or up after

  if (lastClose > lastHigh.price) {
    return priorTrendBullish ? "CHOCH_BULL" : "BOS_BULL";
  }
  if (lastClose < lastLow.price) {
    return priorTrendBullish ? "BOS_BEAR" : "CHOCH_BEAR";
  }
  return "NONE";
}

// ----------------------------------------------------------------------------
// 3. Real Wilder's ADX (fixes the hardcoded 28.5 stub found in the audit)
// ----------------------------------------------------------------------------

export interface ADXResult {
  adx: number;
  plusDI: number;
  minusDI: number;
}

function wilderSmooth(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = 0; i < period && i < values.length; i++) sum += values[i];
  result[period - 1] = sum;
  for (let i = period; i < values.length; i++) {
    result[i] = result[i - 1] - result[i - 1] / period + values[i];
  }
  return result;
}

export function calculateADX(candles: Candle[], period: number = 14): ADXResult[] {
  const n = candles.length;
  if (n < period + 1) {
    return new Array(n).fill(null).map(() => ({ adx: 0, plusDI: 0, minusDI: 0 }));
  }

  const tr: number[] = new Array(n).fill(0);
  const plusDM: number[] = new Array(n).fill(0);
  const minusDM: number[] = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    plusDM[i] = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
    minusDM[i] = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;

    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
  }

  const smoothTR = wilderSmooth(tr, period);
  const smoothPlusDM = wilderSmooth(plusDM, period);
  const smoothMinusDM = wilderSmooth(minusDM, period);

  const results: ADXResult[] = new Array(n).fill(null).map(() => ({
    adx: 0,
    plusDI: 0,
    minusDI: 0,
  }));

  const dxSeries: number[] = new Array(n).fill(0);

  for (let i = period; i < n; i++) {
    const plusDI = smoothTR[i] === 0 ? 0 : (smoothPlusDM[i] / smoothTR[i]) * 100;
    const minusDI = smoothTR[i] === 0 ? 0 : (smoothMinusDM[i] / smoothTR[i]) * 100;
    const diSum = plusDI + minusDI;
    const dx = diSum === 0 ? 0 : (Math.abs(plusDI - minusDI) / diSum) * 100;

    dxSeries[i] = dx;
    results[i].plusDI = plusDI;
    results[i].minusDI = minusDI;
  }

  // ADX = Wilder-smoothed average of DX, starting after 2*period bars
  let adxSum = 0;
  const adxStart = period * 2;
  for (let i = period; i < Math.min(adxStart, n); i++) adxSum += dxSeries[i];
  if (adxStart - 1 < n) results[adxStart - 1].adx = adxSum / period;

  for (let i = adxStart; i < n; i++) {
    results[i].adx = (results[i - 1].adx * (period - 1) + dxSeries[i]) / period;
  }

  return results;
}

// ----------------------------------------------------------------------------
// 4. Wilder's ATR (unchanged role — volatility sizing for SL/TP)
// ----------------------------------------------------------------------------

export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const n = candles.length;
  if (n < 2) return new Array(n).fill(0);
  const tr: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
  }
  return wilderSmooth(tr, period).map((v) => v / period);
}

// ----------------------------------------------------------------------------
// 5. Composite Score — deterministic weighted decision table
//    (Not a Bayesian log-odds product — indicators here are correlated by
//    design, so summing avoids the overstated-probability bug from the audit.)
// ----------------------------------------------------------------------------

export interface CompositeResult {
  score: number;            // 0-100
  bias: "LONG" | "SHORT" | "NONE";
  breakdown: {
    kamaPoints: number;     // max 35
    structurePoints: number;// max 35
    adxPoints: number;      // max 15
    volumePoints: number;   // max 15
  };
  entryThreshold: number;   // default 80
}

export function calculateCompositeScore(
  candles: Candle[],
  opts: { kamaPeriod?: number; adxPeriod?: number; swingLookback?: number; entryThreshold?: number } = {}
): CompositeResult {
  const kamaPeriod = opts.kamaPeriod ?? 10;
  const adxPeriod = opts.adxPeriod ?? 14;
  const swingLookback = opts.swingLookback ?? 3;
  const entryThreshold = opts.entryThreshold ?? 70;

  if (!candles || candles.length < 15) {
    return {
      score: 0,
      bias: "NONE",
      breakdown: { kamaPoints: 0, structurePoints: 0, adxPoints: 0, volumePoints: 0 },
      entryThreshold
    };
  }

  const kama = calculateKAMA(candles, kamaPeriod);
  const adx = calculateADX(candles, adxPeriod);
  const structure = detectStructureSignal(candles, swingLookback);

  const lastKama = kama[kama.length - 1] || { value: 0, slope: 0, efficiencyRatio: 0 };
  const lastAdx = adx[adx.length - 1] || { adx: 0, plusDI: 0, minusDI: 0 };

  const bullishStructure = structure === "BOS_BULL" || structure === "CHOCH_BULL";
  const bearishStructure = structure === "BOS_BEAR" || structure === "CHOCH_BEAR";
  const bullishKama = lastKama.slope > 0;

  // Agreement check: only score directional points if KAMA and structure agree
  const directionAgrees =
    (bullishKama && bullishStructure) || (!bullishKama && bearishStructure);

  const kamaPoints = directionAgrees
    ? Math.min(35, Math.round(lastKama.efficiencyRatio * 35))
    : 0;

  // 🛡️ ANTI-TRAP STRUCTURE VALIDATION (Filters out breakout exhaustion wicks):
  const lastCandle = candles[candles.length - 1];
  const lastRange = lastCandle ? (lastCandle.high - lastCandle.low) : 0;
  const upperWick = lastCandle ? (lastCandle.high - Math.max(lastCandle.close, lastCandle.open)) : 0;
  const lowerWick = lastCandle ? (Math.min(lastCandle.close, lastCandle.open) - lastCandle.low) : 0;

  const isBullTrap = bullishStructure && lastRange > 0 && (upperWick / lastRange > 0.35);
  const isBearTrap = bearishStructure && lastRange > 0 && (lowerWick / lastRange > 0.35);

  const structurePoints = (directionAgrees && !isBullTrap && !isBearTrap) ? 35 : 0;

  const adxPoints = lastAdx.adx > 20 ? Math.min(15, Math.round(((lastAdx.adx - 20) / 30) * 15)) : 0;

  // Volume expansion vs recent average as a simple confirmation filter
  const recentVolumes = candles.slice(-10).map((c) => c.volume);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / (recentVolumes.length || 1);
  const lastVolume = candles[candles.length - 1]?.volume || 0;
  const volumePoints = lastVolume > avgVolume * 1.2 ? 15 : lastVolume > avgVolume ? 8 : 0;

  const score = kamaPoints + structurePoints + adxPoints + volumePoints;
  const bias: CompositeResult["bias"] = !directionAgrees
    ? "NONE"
    : bullishKama
    ? "LONG"
    : "SHORT";

  return {
    score,
    bias: score >= entryThreshold ? bias : "NONE",
    breakdown: { kamaPoints, structurePoints, adxPoints, volumePoints },
    entryThreshold,
  };
}

// ----------------------------------------------------------------------------
// 6. Entry / Exit Decision Layer
//    Turns the composite score into an actual BUY / SELL / EXIT action,
//    plus ATR-based SL/TP. This is the layer your engine's daemon tick should call.
// ----------------------------------------------------------------------------

export type Position = "LONG" | "SHORT" | "NONE";

export interface TradeSignal {
  action: "BUY" | "SELL" | "EXIT_LONG" | "EXIT_SHORT" | "HOLD";
  reason: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  atrValue?: number;
  slDistance?: number;
  tpDistance?: number;
  composite: CompositeResult;
}

export function getTradeSignal(
  candles: Candle[],
  currentPosition: Position,
  opts: {
    kamaPeriod?: number;
    adxPeriod?: number;
    atrPeriod?: number;
    swingLookback?: number;
    entryThreshold?: number;
    slMultiplier?: number;  // ATR multiple for stop loss, default 1.5
    tpMultiplier?: number;  // ATR multiple for take profit, default 3 (2:1 RR)
  } = {}
): TradeSignal {
  const slMultiplier = opts.slMultiplier ?? 1.5;
  const tpMultiplier = opts.tpMultiplier ?? 3;
  const atrPeriod = opts.atrPeriod ?? 14;
  const swingLookback = opts.swingLookback ?? 3;

  const composite = calculateCompositeScore(candles, opts);
  const structure = detectStructureSignal(candles, swingLookback);
  const atr = calculateATR(candles, atrPeriod);
  const lastClose = candles[candles.length - 1]?.close || 0;
  const rawAtr = atr[atr.length - 1] || (lastClose * 0.015);
  // 🛡️ UNIFIED ANTI-NOISE VOLATILITY FLOOR (Single Source of Truth):
  // Minimum 1.0% ATR buffer so crypto wick noise never triggers premature SL
  const lastAtr = Math.max(lastClose * 0.010, rawAtr);
  const slDistance = lastAtr * slMultiplier;
  const tpDistance = lastAtr * tpMultiplier;

  // --- Already in a position: check for early invalidation first ---
  // (Broker-side SL/TP orders still handle the hard exit — this is the
  // "get out before SL if the setup is clearly wrong" layer.)
  if (currentPosition === "LONG") {
    const invalidated = structure === "BOS_BEAR" || structure === "CHOCH_BEAR";
    if (invalidated) {
      return { action: "EXIT_LONG", reason: "Structure broke bearish against open long", composite };
    }
    return { action: "HOLD", reason: "Long position intact, no invalidation", composite };
  }

  if (currentPosition === "SHORT") {
    const invalidated = structure === "BOS_BULL" || structure === "CHOCH_BULL";
    if (invalidated) {
      return { action: "EXIT_SHORT", reason: "Structure broke bullish against open short", composite };
    }
    return { action: "HOLD", reason: "Short position intact, no invalidation", composite };
  }

  // --- Flat: look for a new entry ---
  if (composite.bias === "LONG") {
    return {
      action: "BUY",
      reason: `Score ${composite.score}/${composite.entryThreshold}: KAMA+structure agree bullish (${structure}), ADX confirms trend`,
      entryPrice: lastClose,
      stopLoss: lastClose - slDistance,
      takeProfit: lastClose + tpDistance,
      atrValue: lastAtr,
      slDistance,
      tpDistance,
      composite,
    };
  }

  if (composite.bias === "SHORT") {
    return {
      action: "SELL",
      reason: `Score ${composite.score}/${composite.entryThreshold}: KAMA+structure agree bearish (${structure}), ADX confirms trend`,
      entryPrice: lastClose,
      stopLoss: lastClose + slDistance,
      takeProfit: lastClose - tpDistance,
      atrValue: lastAtr,
      slDistance,
      tpDistance,
      composite,
    };
  }

    if (composite.score >= 50) {
    console.log(`[KAMA_AUDIT] Score: ${composite.score}/${composite.entryThreshold} (KAMA: ${composite.breakdown.kamaPoints}/35, Structure: ${composite.breakdown.structurePoints}/35 [${structure}], ADX: ${composite.breakdown.adxPoints}/15, Vol: ${composite.breakdown.volumePoints}/15) | Pos: ${currentPosition} -> HOLD (Threshold not met or signals disagree)`);
  }
  return { action: "HOLD", reason: "Score below entry threshold or signals disagree", composite };
}
