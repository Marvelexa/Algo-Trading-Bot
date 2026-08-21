/**
 * Verification Script: Single-Source-of-Truth Decision Architecture
 * Verifies that all 4 modules (INTRADAY_SCALPING, SWING_TRADING, LONG_TERM_COMPOUNDER, OPTIONS_BUYING)
 * produce their verdict through the SAME shared AITradingBrainResult decision-object structure.
 * 
 * Test Case: Evaluates RELIANCE under Intraday and Swing modes simultaneously.
 * Confirms both calls return AITradingBrainResult with activeTradingMode cleanly labeled.
 */

import { aiTradingBrainEngine, MarketBar } from "../lib/aiTradingBrainV1";

function generateBars(basePrice: number = 1250, count: number = 25): MarketBar[] {
  const bars: MarketBar[] = [];
  let curr = basePrice;
  for (let i = 0; i < count; i++) {
    const open = curr;
    const close = curr + 1.2;
    const high = close + 1.5;
    const low = open - 0.5;
    bars.push({ time: i, open, high, low, close, volume: 200000 });
    curr = close;
  }
  return bars;
}

function runSingleSourceOfTruthTest() {
  console.log("===============================================================");
  console.log("ITEM 1: SINGLE-SOURCE-OF-TRUTH VERIFICATION TEST");
  console.log("===============================================================");

  const bars = generateBars(1250, 25);
  const currentPrice = bars[bars.length - 1].close;
  const symbol = "RELIANCE";

  console.log(`Analyzing Symbol: ${symbol} @ Current Price: ₹${currentPrice}`);

  // 1. Compute Intraday Verdict
  const intradayResult = aiTradingBrainEngine.analyze(symbol, currentPrice, bars, 65, 1.05, "INTRADAY_SCALPING");

  // 2. Compute Swing Verdict
  const swingResult = aiTradingBrainEngine.analyze(symbol, currentPrice, bars, 65, 1.05, "SWING_TRADING");

  // 3. Compute Long-Term Verdict
  const longTermResult = aiTradingBrainEngine.analyze(symbol, currentPrice, bars, 65, 1.05, "LONG_TERM_COMPOUNDER");

  // 4. Compute Positional F&O Verdict
  const fnoResult = aiTradingBrainEngine.analyze(symbol, currentPrice, bars, 65, 1.05, "OPTIONS_BUYING");

  console.log("\n--- SINGLE VERDICT OBJECT STRUCTURE VERIFICATION ---");
  
  const results = [
    { modeName: "INTRADAY_SCALPING", res: intradayResult },
    { modeName: "SWING_TRADING", res: swingResult },
    { modeName: "LONG_TERM_COMPOUNDER", res: longTermResult },
    { modeName: "OPTIONS_BUYING", res: fnoResult }
  ];

  let allValid = true;

  for (const item of results) {
    const r = item.res;
    console.log(`\n🔹 Module Output [${item.modeName}]:`);
    console.log(`   - activeTradingMode Label: "${r.activeTradingMode}"`);
    console.log(`   - Symbol: ${r.symbol}`);
    console.log(`   - Verdict Action: ${r.action}`);
    console.log(`   - Buy Prob: ${r.buyWinProbabilityPct}%, Sell Prob: ${r.sellWinProbabilityPct}%`);
    console.log(`   - Entry: ₹${r.entryPrice}, SL: ₹${r.stopLoss}, Target1: ₹${r.target1}`);
    console.log(`   - Weighting Breakdown: Tech ${r.weightingBreakdown?.techPct}%, Sent ${r.weightingBreakdown?.sentPct}%, Fund ${r.weightingBreakdown?.fundPct}%, OI ${r.weightingBreakdown?.oiPct}%, Macro ${r.weightingBreakdown?.macroPct}%`);

    // Verify shared object keys
    if (!r.activeTradingMode || !r.action || r.buyWinProbabilityPct === undefined || !r.weightingBreakdown) {
      console.error(`❌ Module ${item.modeName} did not conform to AITradingBrainResult contract!`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log("\n===============================================================");
    console.log("✅ [PASSED]: Single-Source-of-Truth Verdict Object Structure Verified Across All 4 Modules!");
    console.log("===============================================================");
  } else {
    console.error("❌ Single-Source-of-Truth verification failed!");
    process.exit(1);
  }
}

runSingleSourceOfTruthTest();
