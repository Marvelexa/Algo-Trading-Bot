/**
 * Regression Test: 4-Quadrant F&O Open Interest (OI) Classification
 * Validates Long Buildup, Short Covering, Short Buildup, and Long Unwinding
 * against hand-constructed historical price + OI scenarios.
 */

import { oiEngine, OIQuadrantClassification } from "../lib/oiEngine";

function runOiFourQuadrantTest() {
  console.log("=========================================================");
  console.log("STARTING REGRESSION TEST: 4-Quadrant F&O OI Classification");
  console.log("=========================================================");

  const testCases: Array<{
    scenarioName: string;
    priceChangePct: number;
    oiChangePct: number;
    expectedClassification: OIQuadrantClassification;
    expectedMinMultiplier: number;
  }> = [
    {
      scenarioName: "Scenario 1: Fresh Institutional Buying Rally",
      priceChangePct: 1.8,
      oiChangePct: 4.5,
      expectedClassification: "LONG_BUILDUP",
      expectedMinMultiplier: 1.10
    },
    {
      scenarioName: "Scenario 2: Squeeze-Driven Short Covering Rally",
      priceChangePct: 1.2,
      oiChangePct: -3.2,
      expectedClassification: "SHORT_COVERING",
      expectedMinMultiplier: 0.85
    },
    {
      scenarioName: "Scenario 3: Fresh Short Buildup Breakdown",
      priceChangePct: -2.1,
      oiChangePct: 5.8,
      expectedClassification: "SHORT_BUILDUP",
      expectedMinMultiplier: 1.10
    },
    {
      scenarioName: "Scenario 4: Bullish Position Liquidation / Long Unwinding",
      priceChangePct: -1.4,
      oiChangePct: -2.5,
      expectedClassification: "LONG_UNWINDING",
      expectedMinMultiplier: 0.85
    }
  ];

  let passedCount = 0;

  for (const tc of testCases) {
    const result = oiEngine.classifyOI(tc.priceChangePct, tc.oiChangePct);
    
    if (result.classification === tc.expectedClassification) {
      console.log(`✅ [PASS] ${tc.scenarioName} -> Classified as ${result.classification} (Multiplier: ${result.multiplier}x). ${result.description}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${tc.scenarioName} -> Got ${result.classification}, Expected ${tc.expectedClassification}`);
      process.exit(1);
    }
  }

  // Verify Max Pain Calculation Algorithm
  console.log("\n--- Testing Exact NSE Max Pain Calculation ---");
  const testStrikes = [
    { strike: 23800, callOI: 10000, putOI: 95000, callOIChange: 0, putOIChange: 0 },
    { strike: 23900, callOI: 25000, putOI: 70000, callOIChange: 0, putOIChange: 0 },
    { strike: 24000, callOI: 85000, putOI: 85000, callOIChange: 0, putOIChange: 0 }, // Expected Max Pain (Sellers loss minimized)
    { strike: 24100, callOI: 90000, putOI: 20000, callOIChange: 0, putOIChange: 0 },
    { strike: 24200, callOI: 110000, putOI: 8000, callOIChange: 0, putOIChange: 0 }
  ];

  const maxPain = oiEngine.calculateMaxPain(24000, testStrikes);
  console.log(`✅ Max Pain Strike Calculated: ${maxPain}`);

  if (maxPain === 24000) {
    console.log("✅ [TEST PASSED]: Max Pain algorithm correctly identified optimal option seller payout strike!");
  } else {
    console.error(`❌ Max Pain algorithm returned ${maxPain}, expected 24000`);
    process.exit(1);
  }

  console.log("=========================================================");
  console.log(`ALL ${passedCount}/${testCases.length} 4-QUADRANT OI SCENARIOS PASSED WITH 100% PRECISION!`);
  console.log("=========================================================");
}

runOiFourQuadrantTest();
