import { stockResearchEngine } from "../lib/stockEngine";
import { aiTradingBrainEngine } from "../lib/aiTradingBrainV1";

async function verifyBugFixes() {
  console.log("=========================================================================");
  console.log("   BUG 1 & BUG 2 REGRESSION & ACCURACY TEST SUITE                        ");
  console.log("=========================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, title: string, detail: string = "") {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${title} - ${detail}`);
    }
  }

  // --- BUG 1 TEST 1: SHORT Signal Direction & Currency Consistency on USD Crypto (ETHUSD) ---
  const ethRec = await stockResearchEngine.analyzeStock("ETHUSD", true, "SWING_TRADER");
  console.log("\n[TEST ETHUSD Crypto Signal]");
  console.log("  Price:", "$" + ethRec.currentPrice);
  console.log("  Suggested Action:", ethRec.suggestedAction);
  console.log("  Timing Direction:", ethRec.timingSignal.direction);
  console.log("  Timing Status:", ethRec.timingSignal.timingStatus);
  console.log("  Timing Reason Snippet:", ethRec.timingSignal.optimalTimingReason.substring(0, 100) + "...");

  assert(
    ethRec.currency === "USD",
    "Bug 1a: ETHUSD currency is identified as USD"
  );

  assert(
    !ethRec.timingSignal.optimalTimingReason.includes("₹"),
    "Bug 1b: ETHUSD timing reason contains NO hardcoded ₹ (INR) symbols"
  );

  if (ethRec.timingSignal.direction === "SHORT") {
    assert(
      ethRec.timingSignal.timingStatus !== "OPTIMAL BUY ZONE",
      "Bug 1c: SHORT signal timing status is NOT 'OPTIMAL BUY ZONE'"
    );
  }

  // --- BUG 1 TEST 2: INR Stock Currency Consistency (RELIANCE) ---
  const relRec = await stockResearchEngine.analyzeStock("RELIANCE", true, "SWING_TRADER");
  console.log("\n[TEST RELIANCE INR Stock Signal]");
  console.log("  Price:", "₹" + relRec.currentPrice);
  console.log("  Timing Direction:", relRec.timingSignal.direction);
  console.log("  Timing Status:", relRec.timingSignal.timingStatus);

  assert(
    relRec.currency === "INR",
    "Bug 1d: RELIANCE currency is identified as INR"
  );
  assert(
    !relRec.timingSignal.optimalTimingReason.includes("$"),
    "Bug 1e: RELIANCE timing reason contains NO hardcoded $ (USD) symbols"
  );

  // --- BUG 2 TEST 1: Target Distance % Bounds for Intraday vs Swing ---
  console.log("\n[TEST BUG 2: Timeframe-Aligned R & 5R Target Distance Bounds]");
  
  const ethIntraday = await stockResearchEngine.analyzeStock("ETHUSD", true, "INTRADAY");
  const ethSwing = await stockResearchEngine.analyzeStock("ETHUSD", true, "SWING_TRADER");

  const intradayTargetDist = Math.abs(ethIntraday.timingSignal.target1 - ethIntraday.currentPrice);
  const intradayTargetDistPct = (intradayTargetDist / ethIntraday.currentPrice) * 100;

  const swingTargetDist = Math.abs(ethSwing.timingSignal.target1 - ethSwing.currentPrice);
  const swingTargetDistPct = (swingTargetDist / ethSwing.currentPrice) * 100;

  console.log(`  Intraday 5R Target Distance: ${intradayTargetDist.toFixed(2)} points (${intradayTargetDistPct.toFixed(2)}%)`);
  console.log(`  Swing 5R Target Distance: ${swingTargetDist.toFixed(2)} points (${swingTargetDistPct.toFixed(2)}%)`);

  assert(
    intradayTargetDistPct <= 4.01,
    `Bug 2a: Intraday 5R target distance is realistic (${intradayTargetDistPct.toFixed(2)}% <= 4.0%)`
  );

  assert(
    swingTargetDistPct <= 7.51,
    `Bug 2b: Swing 5R target distance is realistic (${swingTargetDistPct.toFixed(2)}% <= 7.5%)`
  );

  assert(
    intradayTargetDist < swingTargetDist,
    `Bug 2c: Intraday target distance (${intradayTargetDist.toFixed(2)}) is tighter than Swing target distance (${swingTargetDist.toFixed(2)})`
  );

  // --- BUG 2 TEST 2: AI Trading Brain v1 Output ---
  const brainResult = aiTradingBrainEngine.analyze("ETHUSD", ethRec.currentPrice, ethRec.bars || []);
  const brainTargetDist = Math.abs(brainResult.target1 - brainResult.entryPrice);
  const brainTargetDistPct = (brainTargetDist / brainResult.entryPrice) * 100;

  console.log(`  AI Trading Brain v1 5R Target Distance: ${brainTargetDist.toFixed(2)} points (${brainTargetDistPct.toFixed(2)}%)`);

  assert(
    brainTargetDistPct <= 7.51,
    `Bug 2d: AI Trading Brain v1 5R target distance is bounded (${brainTargetDistPct.toFixed(2)}% <= 7.5%)`
  );

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
  if (passedTests === totalTests) {
    console.log("🎉 ALL BUG 1 & BUG 2 REGRESSION TESTS PASSED SUCCESSFULLY!");
  } else {
    process.exit(1);
  }
}

verifyBugFixes();
