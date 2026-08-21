import { fnOptionsBreakoutEngine } from "../lib/fnOptionsBreakoutEngine";

async function testFnOptionsBreakoutSystem() {
  console.log("=========================================================================");
  console.log("   AUTOMATED F&O OPTIONS BREAKOUT TRADING SYSTEM REGRESSION TEST SUITE   ");
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

  // ────── TEST 1: 5-Stage Screening Pipeline Evaluation ──────
  console.log("[STEP 1: 5-Stage Screening Pipeline Evaluation]");
  const sampleSetup = fnOptionsBreakoutEngine.evaluateOptionsBreakout(
    "NIFTY50",
    25200,
    [],
    3000000, // Volume Today (30L)
    2000000, // 20D Avg (20L)
    120,     // Bid
    122,     // Ask (Spread 1.6%)
    800000,  // OI
    500000   // Avg OI
  );

  assert(sampleSetup.filters.length === 5, "Step 1a: Pipeline includes exactly 5 distinct screening filters");
  assert(sampleSetup.allFiltersPassed, "Step 1b: Liquid NIFTY setup passes all 5 screening filters");

  // ────── TEST 2: Filter Rejection (Thin Volume Underlying) ──────
  console.log("\n[STEP 2: Filter Rejection (Thin Volume Underlying)]");
  const thinVolumeSetup = fnOptionsBreakoutEngine.evaluateOptionsBreakout(
    "MIDCAP_STOCK",
    500,
    [],
    50000,  // Volume Today (Thin)
    1000000 // 20D Avg (10L)
  );

  assert(!thinVolumeSetup.allFiltersPassed, "Step 2a: Thin-volume underlying rejected by Filter 2");
  assert(thinVolumeSetup.action === "NO_TRADE", "Step 2b: Rejected setup sets action to NO_TRADE");

  // ────── TEST 3: 5-Min Resistance Breakout (BUY CE Entry) ──────
  console.log("\n[STEP 3: 5-Min Resistance Breakout Entry (BUY CE)]");
  const basePrice = 25000;
  const breakoutBars = Array.from({ length: 20 }, (_, i) => {
    const p = i === 19 ? basePrice + 80 : basePrice + (i * 2);
    return {
      time: new Date(Date.now() - (20 - i) * 300000).toISOString(),
      open: p - 5,
      high: p + 10,
      low: p - 5,
      close: p + 8,
      volume: 400000
    };
  });

  const ceBreakoutSetup = fnOptionsBreakoutEngine.evaluateOptionsBreakout(
    "NIFTY50",
    25080,
    breakoutBars,
    3000000,
    2000000,
    150,
    152,
    900000,
    500000
  );

  assert(ceBreakoutSetup.action === "BUY_CE", `Step 3a: 5-min resistance breakout triggers BUY_CE (Got: ${ceBreakoutSetup.action})`);
  assert(ceBreakoutSetup.optionType === "CE", "Step 3b: Option type selected is CE");
  assert(ceBreakoutSetup.emaTrendAligned, "Step 3c: EMA 9 > EMA 21 confirms bullish momentum alignment");

  // ────── TEST 4: 5-Min Support Breakdown (BUY PE Entry) ──────
  console.log("\n[STEP 4: 5-Min Support Breakdown Entry (BUY PE)]");
  const breakdownBars = Array.from({ length: 20 }, (_, i) => {
    const p = i === 19 ? basePrice - 90 : basePrice - (i * 2);
    return {
      time: new Date(Date.now() - (20 - i) * 300000).toISOString(),
      open: p + 5,
      high: p + 5,
      low: p - 10,
      close: p - 8,
      volume: 450000
    };
  });

  const peBreakdownSetup = fnOptionsBreakoutEngine.evaluateOptionsBreakout(
    "BANKNIFTY",
    24910,
    breakdownBars,
    4000000,
    2500000,
    180,
    182,
    1200000,
    600000
  );

  assert(peBreakdownSetup.action === "BUY_PE", `Step 4a: 5-min support breakdown triggers BUY_PE (Got: ${peBreakdownSetup.action})`);
  assert(peBreakdownSetup.optionType === "PE", "Step 4b: Option type selected is PE");
  assert(peBreakdownSetup.emaTrendAligned, "Step 4c: EMA 9 < EMA 21 confirms bearish momentum alignment");

  // ────── TEST 5: Ratchet Trailing SL 1:5 Risk-Reward Math ──────
  console.log("\n[STEP 5: 1:5 Risk-Reward Premium Calculation]");
  const expectedTarget = Number((ceBreakoutSetup.estimatedPremiumEntry + (ceBreakoutSetup.riskUnitR * 5.0)).toFixed(2));
  assert(ceBreakoutSetup.finalTargetPremium === expectedTarget, `Step 5a: Final 5R Target Premium calculation matches 1:5 RR ratio (${ceBreakoutSetup.finalTargetPremium})`);
  assert(ceBreakoutSetup.initialSLPremium === Number((ceBreakoutSetup.estimatedPremiumEntry - ceBreakoutSetup.riskUnitR).toFixed(2)), "Step 5b: Initial SL Premium calculation matches invalidation point");

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
  if (passedTests === totalTests) {
    console.log("🎉 AUTOMATED F&O OPTIONS BREAKOUT TRADING SYSTEM VERIFIED 100%!");
  } else {
    process.exit(1);
  }
}

testFnOptionsBreakoutSystem();
