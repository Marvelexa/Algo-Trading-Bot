import { nemtronEngine } from "../lib/nemtronEngine.js";

async function runNemtronEngineTests() {
  console.log("=========================================================================");
  console.log("   NVIDIA NEMTRON 3 ULTRA AI ENGINE - LIVE VERIFICATION & SYSTEM TEST     ");
  console.log("=========================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail: string = "") {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail}`);
    }
  }

  // --- TEST 1: BUY Setup Analysis (BTCUSD Bullish Structure) ---
  console.log("[Testing Setup 1: BTCUSD Bullish Reversal]");
  const test1 = await nemtronEngine.analyzeMarketWithNemtron(
    "BTCUSD",
    64800.00,
    "ALWAYS_IN_LONG",
    "STRONG_BULL_SHAVED",
    "BULLISH_OB",
    "NO_SUPPLY_BULLISH"
  );

  assert(
    test1 !== null && test1.actionRecommendation === "BUY" && test1.marketBias === "BULLISH",
    `Nemtron 3 Ultra correctly predicts BUY for bullish bar & ALWAYS_IN_LONG structure (Bias: ${test1.marketBias}, Rec: ${test1.actionRecommendation})`
  );
  console.log(`   Nemtron 3 Ultra Reasoning: "${test1.nemtronReasoning}"\n`);

  // --- TEST 2: SELL Setup Analysis (NIFTY50 Bearish Breakdown) ---
  console.log("[Testing Setup 2: NIFTY50 Bearish Breakdown]");
  const test2 = await nemtronEngine.analyzeMarketWithNemtron(
    "NIFTY50",
    23750.00,
    "ALWAYS_IN_SHORT",
    "STRONG_BEAR_SHAVED",
    "BEARISH_OB",
    "NO_DEMAND_BEARISH"
  );

  assert(
    test2 !== null && test2.actionRecommendation === "SELL" && test2.marketBias === "BEARISH",
    `Nemtron 3 Ultra correctly predicts SELL for strong bear dump candle & ALWAYS_IN_SHORT breakdown (Bias: ${test2.marketBias}, Rec: ${test2.actionRecommendation})`
  );
  console.log(`   Nemtron 3 Ultra Reasoning: "${test2.nemtronReasoning}"\n`);

  // --- TEST 3: System Model Name Verification ---
  assert(
    test3_checkModel(test1.modelUsed),
    `Model confirmed as Nemtron 3 Ultra (${test1.modelUsed})`
  );

  // --- TEST 4: Master Framework Evidence Output ---
  assert(
    Array.isArray(test1.frameworkEvidence) && test1.frameworkEvidence.length >= 2,
    `Nemtron 3 Ultra embeds multi-framework institutional evidence (${test1.frameworkEvidence.join(" | ")})`
  );

  function test3_checkModel(m: string): boolean {
    return m.includes("nemtron");
  }

  console.log("\n=========================================================================");
  console.log(`Results: ${passed}/${total} Nemtron 3 Ultra system tests passed.`);
  if (passed === total) {
    console.log("🎉 NEMTRON 3 ULTRA AI ENGINE IS 100% OPERATIONAL & VERIFIED!");
  } else {
    process.exit(1);
  }
}

runNemtronEngineTests();
