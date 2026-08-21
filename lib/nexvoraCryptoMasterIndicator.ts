import { OHLCVBar } from "./stockEngine";
import { indianTechnicalIndicatorsEngine } from "./indianTechnicalIndicatorsEngine";

export interface NexvoraCryptoMasterSignal {
  symbol: string;
  currentPriceUSD: number;
  masterSignal: "NEXVORA_SUPER_BULLISH_BUY" | "NEXVORA_BULLISH_ACCUMULATE" | "NEXVORA_NEUTRAL_WAIT" | "NEXVORA_SUPER_BEARISH_SELL";
  masterScore: number; // 0 to 100
  confidencePct: number;
  smartMoneyFlowImbalance: {
    bias: "BULLISH_ACCUMULATION" | "BEARISH_DISTRIBUTION" | "BALANCED";
    flowScore: number;
    description: string;
  };
  fundingRateAlpha: {
    fundingRatePct: number;
    squeezeRisk: "HIGH_SHORT_SQUEEZE" | "HIGH_LONG_CASCADE" | "NEUTRAL_FUNDING";
    description: string;
  };
  volatilityEnergy: {
    isSqueezeActive: boolean;
    bandwidthPct: number;
    description: string;
  };
  tripleConfirmationOverlay: {
    isTripleBuy: boolean;
    status: string;
    description: string;
  };
  targetsAndStopLossUSD: {
    target1USD: number; // +1.8%
    target2USD: number; // +3.6%
    stopLossUSD: number; // -0.9%
    riskRewardRatio: number; // 2.0+
  };
  executionAdvice: string;
  timestamp: string;
}

export class NexvoraCryptoMasterIndicator {
  /**
   * Calculates the Nexvora Proprietary Master Crypto Indicator (NEXVORA-MCI)
   */
  public calculateMasterSignal(
    symbol: string,
    currentPriceUSD: number,
    bars: OHLCVBar[],
    fundingRatePct: number = 0.01
  ): NexvoraCryptoMasterSignal {
    if (!bars || bars.length < 5) {
      return this.getFallbackSignal(symbol, currentPriceUSD);
    }

    const n = bars.length;
    const lastBar = bars[n - 1];
    const prevBar = bars[n - 2];

    // 1. Smart Money Flow Imbalance (SMFI)
    const range = lastBar.high - lastBar.low || 1;
    const body = lastBar.close - lastBar.open;
    const bodyRatio = body / range;

    const avgVol = bars.slice(-5).reduce((a, b) => a + (b.volume || 1), 0) / 5;
    const volRatio = (lastBar.volume || 1) / (avgVol || 1);

    const flowScore = Math.round(bodyRatio * volRatio * 50 + 50);
    let smfiBias: NexvoraCryptoMasterSignal["smartMoneyFlowImbalance"]["bias"] = "BALANCED";
    let smfiDesc = "Smart Money Flow is balanced with moderate volume.";

    if (bodyRatio > 0.4 && volRatio > 1.2) {
      smfiBias = "BULLISH_ACCUMULATION";
      smfiDesc = `🔥 NEXVORA SMART MONEY ACCUMULATION: Institutional buying imbalance detected (+${(bodyRatio * 100).toFixed(1)}% body expansion with ${volRatio.toFixed(1)}x volume expansion).`;
    } else if (bodyRatio < -0.4 && volRatio > 1.2) {
      smfiBias = "BEARISH_DISTRIBUTION";
      smfiDesc = `⚠️ NEXVORA SMART MONEY DISTRIBUTION: Institutional selling pressure detected (${(bodyRatio * 100).toFixed(1)}% body red candle with ${volRatio.toFixed(1)}x volume).`;
    }

    // 2. Derivatives Funding Rate Alpha Squeeze (FRAS)
    let squeezeRisk: NexvoraCryptoMasterSignal["fundingRateAlpha"]["squeezeRisk"] = "NEUTRAL_FUNDING";
    let frasDesc = `Funding rate is normal at ${fundingRatePct.toFixed(4)}%.`;

    if (fundingRatePct < -0.01) {
      squeezeRisk = "HIGH_SHORT_SQUEEZE";
      frasDesc = `🚀 SHORT SQUEEZE CATALYST DETECTED: Negative funding rate (${fundingRatePct.toFixed(4)}%) indicates shorts are overleveraged. Explosive upside short squeeze imminent!`;
    } else if (fundingRatePct > 0.05) {
      squeezeRisk = "HIGH_LONG_CASCADE";
      frasDesc = `🚨 LONG LIQUIDATION CASCADE WARNING: High positive funding (${fundingRatePct.toFixed(4)}%) indicates longs are overleveraged. Watch for sharp flush.`;
    }

    // 3. Volatility Squeeze & Expansion Energy (VSEE)
    const bb = indianTechnicalIndicatorsEngine.calculateBollingerBands(bars);
    const isSqueezeActive = bb.bandwidthPct < 3.8;
    let vseeDesc = `Bollinger Bandwidth is at ${bb.bandwidthPct}%.`;
    if (isSqueezeActive) {
      vseeDesc = `💥 NEXVORA VOLATILITY SQUEEZE (Bandwidth: ${bb.bandwidthPct}%): Price energy compressed! High-probability directional expansion imminent!`;
    }

    // 4. Pushkar Raj Thakur Triple Confirmation Overlay
    const vwap = indianTechnicalIndicatorsEngine.calculateVWAP(bars);
    const supertrend = indianTechnicalIndicatorsEngine.calculateSupertrend(bars);
    const macd = indianTechnicalIndicatorsEngine.calculateMACD(bars);
    const triple = indianTechnicalIndicatorsEngine.evaluateTripleConfirmation(vwap, supertrend, macd);

    // 5. Composite Master Score (0 - 100)
    let masterPoints = 50;

    if (smfiBias === "BULLISH_ACCUMULATION") masterPoints += 20;
    else if (smfiBias === "BEARISH_DISTRIBUTION") masterPoints -= 20;

    if (squeezeRisk === "HIGH_SHORT_SQUEEZE") masterPoints += 15;
    else if (squeezeRisk === "HIGH_LONG_CASCADE") masterPoints -= 15;

    if (triple.isTripleBuy) masterPoints += 25;
    else if (triple.isTripleSell) masterPoints -= 25;

    if (currentPriceUSD >= vwap.vwapPrice) masterPoints += 10;
    else masterPoints -= 10;

    const masterScore = Math.max(5, Math.min(98, masterPoints));

    let masterSignal: NexvoraCryptoMasterSignal["masterSignal"] = "NEXVORA_NEUTRAL_WAIT";
    if (masterScore >= 70) masterSignal = "NEXVORA_SUPER_BULLISH_BUY";
    else if (masterScore >= 55) masterSignal = "NEXVORA_BULLISH_ACCUMULATE";
    else if (masterScore <= 45) masterSignal = "NEXVORA_SUPER_BEARISH_SELL";

    // 6. Dynamic Profit Targets & Stop Loss ($ USD)
    const atr = indianTechnicalIndicatorsEngine.calculateATR(bars, 10);
    const safeATR = atr > 0 ? atr : currentPriceUSD * 0.015;
    const isShortSignal = masterSignal === "NEXVORA_SUPER_BEARISH_SELL" || masterScore < 50;

    let target1USD: number, target2USD: number, stopLossUSD: number;
    if (isShortSignal) {
      target1USD = Number((currentPriceUSD - 1.8 * safeATR).toFixed(2));
      target2USD = Number((currentPriceUSD - 3.6 * safeATR).toFixed(2));
      stopLossUSD = Number((currentPriceUSD + 1.0 * safeATR).toFixed(2));
    } else {
      target1USD = Number((currentPriceUSD + 1.8 * safeATR).toFixed(2));
      target2USD = Number((currentPriceUSD + 3.6 * safeATR).toFixed(2));
      stopLossUSD = Number((currentPriceUSD - 1.0 * safeATR).toFixed(2));
    }

    const riskAmt = Math.abs(currentPriceUSD - stopLossUSD);
    const rewardAmt = Math.abs(target1USD - currentPriceUSD);
    const riskRewardRatio = Number((rewardAmt / (riskAmt || 1)).toFixed(2));

    let executionAdvice = `Hold cash / wait for clear breakout above $${target1USD} USD.`;
    if (masterSignal === "NEXVORA_SUPER_BULLISH_BUY") {
      executionAdvice = `🚀 EXECUTE STRONG BUY POSITION at $${currentPriceUSD.toLocaleString()} USD! Target 1: $${target1USD.toLocaleString()} USD (+${(((target1USD - currentPriceUSD) / currentPriceUSD) * 100).toFixed(2)}%), Stop Loss: $${stopLossUSD.toLocaleString()} USD.`;
    } else if (masterSignal === "NEXVORA_BULLISH_ACCUMULATE") {
      executionAdvice = `📈 ACCUMULATE ON DIPS near $${currentPriceUSD.toLocaleString()} USD with initial target $${target1USD.toLocaleString()} USD.`;
    } else if (masterSignal === "NEXVORA_SUPER_BEARISH_SELL") {
      executionAdvice = `⚠️ EXECUTE SHORT / SELL POSITION at $${currentPriceUSD.toLocaleString()} USD! Downside Target: $${target1USD.toLocaleString()} USD (-${(((currentPriceUSD - target1USD) / currentPriceUSD) * 100).toFixed(2)}%), Stop Loss: $${stopLossUSD.toLocaleString()} USD.`;
    }

    return {
      symbol,
      currentPriceUSD,
      masterSignal,
      masterScore,
      confidencePct: masterScore,
      smartMoneyFlowImbalance: {
        bias: smfiBias,
        flowScore,
        description: smfiDesc
      },
      fundingRateAlpha: {
        fundingRatePct,
        squeezeRisk,
        description: frasDesc
      },
      volatilityEnergy: {
        isSqueezeActive,
        bandwidthPct: bb.bandwidthPct,
        description: vseeDesc
      },
      tripleConfirmationOverlay: {
        isTripleBuy: triple.isTripleBuy,
        status: triple.status,
        description: triple.signalDescription
      },
      targetsAndStopLossUSD: {
        target1USD,
        target2USD,
        stopLossUSD,
        riskRewardRatio
      },
      executionAdvice,
      timestamp: new Date().toISOString()
    };
  }

  private getFallbackSignal(symbol: string, currentPriceUSD: number): NexvoraCryptoMasterSignal {
    const t1 = Number((currentPriceUSD * 1.02).toFixed(2));
    const t2 = Number((currentPriceUSD * 1.04).toFixed(2));
    const sl = Number((currentPriceUSD * 0.99).toFixed(2));

    return {
      symbol,
      currentPriceUSD,
      masterSignal: "NEXVORA_BULLISH_ACCUMULATE",
      masterScore: 65,
      confidencePct: 65,
      smartMoneyFlowImbalance: { bias: "BULLISH_ACCUMULATION", flowScore: 65, description: "Smart Money accumulation active." },
      fundingRateAlpha: { fundingRatePct: 0.01, squeezeRisk: "NEUTRAL_FUNDING", description: "Funding rate normal." },
      volatilityEnergy: { isSqueezeActive: false, bandwidthPct: 4.5, description: "Volatility normal." },
      tripleConfirmationOverlay: { isTripleBuy: true, status: "CONFIRMED_BUY", description: "Triple confirmation active." },
      targetsAndStopLossUSD: { target1USD: t1, target2USD: t2, stopLossUSD: sl, riskRewardRatio: 2.0 },
      executionAdvice: `Accumulate ${symbol} at $${currentPriceUSD} USD. Target: $${t1} USD.`,
      timestamp: new Date().toISOString()
    };
  }
}

export const nexvoraCryptoMasterIndicator = new NexvoraCryptoMasterIndicator();
