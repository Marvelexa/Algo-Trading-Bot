import { stockResearchEngine } from "../lib/stockEngine.js";

async function testDumpingMarket() {
  console.log("==========================================================================");
  console.log("⚡ TESTING MARKET DUMP / SELL SIGNAL DETECTION ⚡");
  console.log("==========================================================================");

  // Create dumping bars (64,406 -> 64,000) matching user's screenshot
  const basePrice = 64406;
  const dumpBars = Array.from({ length: 25 }, (_, i) => {
    const p = i < 10 ? basePrice + i * 10 : basePrice + 100 - (i - 10) * 45; // Sharp red dumping candles
    return {
      time: "2026-07-26T11:" + String(i).padStart(2, "0"),
      open: p + 30,
      high: p + 40,
      low: p - 40,
      close: p,
      volume: 120000
    };
  });

  const currentPrice = dumpBars[dumpBars.length - 1].close; // ~63,725 USD

  // Call analyzeStock with force=true and INTRADAY
  const rec = await stockResearchEngine.analyzeStock("BTCUSD", true, "INTRADAY");

  console.log(`Asset Ticker: ${rec.ticker}`);
  console.log(`Live Market Price: USD $${rec.currentPrice.toLocaleString()}`);
  console.log(`AI Suggested Action: ${rec.suggestedAction}`);
  console.log(`Quantitative Score: ${rec.overallScore}/100`);
  console.log(`Trade Direction: ${rec.timingSignal.direction}`);
  console.log(`Timing Status: ${rec.timingSignal.timingStatus}`);
  console.log(`Stop Loss (Above Price for Short): USD $${rec.timingSignal.stopLoss.toLocaleString()}`);
  console.log(`Target 1 (Below Price for Short): USD $${rec.timingSignal.target1.toLocaleString()}`);
  console.log(`Risk / Reward Ratio: ${rec.timingSignal.riskRewardRatio}`);
  console.log(`Reasoning: ${rec.timingSignal.optimalTimingReason}`);
  console.log("==========================================================================\n");
}

testDumpingMarket().catch(console.error);
