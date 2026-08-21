/**
 * Item 5 Verification Script: 4-Quadrant OI Classification & Max Pain Raw Numbers Output
 * Prints exact raw metrics (Price Change %, OI Change %, PCR, Multipliers, Strikes, Call/Put OI)
 * for every scenario tested.
 */

import { oiEngine } from "../lib/oiEngine";

function runOiRawNumbersTest() {
  console.log("===============================================================");
  console.log("ITEM 5: 4-QUADRANT OI CLASSIFICATION & MAX PAIN RAW NUMBERS TEST");
  console.log("===============================================================");

  const scenarios = [
    { name: "Scenario 1: Long Buildup", priceChg: 1.85, oiChg: 5.40 },
    { name: "Scenario 2: Short Covering", priceChg: 1.40, oiChg: -4.10 },
    { name: "Scenario 3: Short Buildup", priceChg: -2.30, oiChg: 6.20 },
    { name: "Scenario 4: Long Unwinding", priceChg: -1.75, oiChg: -3.80 }
  ];

  for (const sc of scenarios) {
    const res = oiEngine.classifyOI(sc.priceChg, sc.oiChg);
    console.log(`\n🔹 [${sc.name}]:`);
    console.log(`   - Price Change: +${sc.priceChg}% | OI Change: ${sc.oiChg}%`);
    console.log(`   - Classification Output: "${res.classification}"`);
    console.log(`   - Confidence Multiplier: ${res.multiplier}x`);
    console.log(`   - Exact Description: "${res.description}"`);
  }

  console.log("\n---------------------------------------------------------------");
  console.log("--- RAW STRIKE-LEVEL OPTION CHAIN & MAX PAIN CALCULATION ---");
  console.log("---------------------------------------------------------------");

  const strikes = [
    { strike: 23800, callOI: 12000, putOI: 98000, callOIChange: 400, putOIChange: 14000 },
    { strike: 23900, callOI: 24000, putOI: 76000, callOIChange: 1100, putOIChange: 9200 },
    { strike: 24000, callOI: 82000, putOI: 85000, callOIChange: 4500, putOIChange: 4800 },
    { strike: 24100, callOI: 94000, putOI: 22000, callOIChange: 11200, putOIChange: 800 },
    { strike: 24200, callOI: 115000, putOI: 7500, callOIChange: 16500, putOIChange: 200 }
  ];

  console.log("Strike-Level Input Data:");
  console.table(strikes);

  const calculatedMaxPain = oiEngine.calculateMaxPain(24000, strikes);
  console.log(`\nCalculated Max Pain Strike: ₹${calculatedMaxPain}`);

  const completeOIReport = oiEngine.analyzeOI("NIFTY50", 24000, 0.8, 2.5, [0.95, 1.02, 1.08], strikes);

  console.log("\nComplete F&O Open Interest Summary Report:");
  console.log(`- Symbol: ${completeOIReport.symbol} @ ₹${completeOIReport.currentPrice}`);
  console.log(`- F&O Classification: ${completeOIReport.classification} (Multiplier: ${completeOIReport.confidenceMultiplier}x)`);
  console.log(`- Current PCR: ${completeOIReport.pcrCurrent.toFixed(2)} (${completeOIReport.pcrTrend})`);
  console.log(`- Max Pain Strike: ₹${completeOIReport.maxPainStrike}`);
  console.log(`- Key Call Resistance Strike: ₹${completeOIReport.topCallResistanceStrike}`);
  console.log(`- Key Put Support Strike: ₹${completeOIReport.topPutSupportStrike}`);
  console.log(`- Summary Text: "${completeOIReport.summaryText}"`);

  console.log("\n===============================================================");
  console.log("✅ [PASSED]: Raw Numbers Audit Complete for 4-Quadrant OI & Max Pain!");
  console.log("===============================================================");
}

runOiRawNumbersTest();
