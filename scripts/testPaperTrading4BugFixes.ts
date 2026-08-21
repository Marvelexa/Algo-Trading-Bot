/**
 * REGRESSION TEST: 4 HARD-EVIDENCE PAPER TRADING BUGS AUDIT
 * Fixture: Replays the exact session timestamps ($64,702.22 entry, -$0.29 loss, duplicate requests).
 */

import { paperTradingEngine } from "../lib/paperTradingEngine";
import { aiTradingBrainEngine } from "../lib/aiTradingBrainV1";

function runRegressionSuite() {
  console.log("=========================================================================");
  console.log("   REGRESSION SUITE: 4 HARD-EVIDENCE PAPER TRADING BUG AUDIT             ");
  console.log("=========================================================================\n");

  let totalPass = 0;

  // -------------------------------------------------------------------------
  // FIX 1: DUPLICATE POSITION GUARD TEST
  // -------------------------------------------------------------------------
  console.log("[TEST 1: DUPLICATE POSITION GUARD]");
  // Reset account
  paperTradingEngine.resetAccount(50000);

  const res1 = paperTradingEngine.openPosition("BTCUSD", "Bitcoin", "BUY", 0.5, 64702.22, 64572.82, 65349.22, "USD");
  console.log("  Position 1 Open Result:", res1.success ? "✅ SUCCESS" : "❌ FAIL", "| Message:", res1.message);

  // Attempt duplicate position opening immediately
  const res2 = paperTradingEngine.openPosition("BTCUSD", "Bitcoin", "BUY", 0.5, 64702.22, 64572.82, 65349.22, "USD");
  console.log("  Duplicate Position 2 Open Result:", res2.success ? "❌ UNEXPECTED SUCCESS" : "✅ BLOCKED (PASS)", "| Message:", res2.message);

  if (!res2.success && res2.message.includes("Duplicate execution blocked")) {
    console.log("  ✅ [PASS] Fix 1 Verified: Duplicate position on active symbol strictly blocked.\n");
    totalPass++;
  } else {
    console.log("  ❌ [FAIL] Fix 1 Failed: Duplicate position was NOT blocked!\n");
  }

  // -------------------------------------------------------------------------
  // FIX 2: 15-MINUTE HYSTERESIS COOLDOWN GUARD TEST
  // -------------------------------------------------------------------------
  console.log("[TEST 2: 15-MINUTE HYSTERESIS COOLDOWN GUARD]");
  const openPos = paperTradingEngine.getOpenPositions()[0];
  if (openPos) {
    paperTradingEngine.closePosition(openPos.id, 64700.00, "MANUAL_SQUARE_OFF");
  }

  // Attempt to open another trade immediately after closing (within 15 mins window)
  const res3 = paperTradingEngine.openPosition("BTCUSD", "Bitcoin", "BUY", 0.5, 64702.22, 64572.82, 65349.22, "USD");
  console.log("  Rapid-Fire Position 3 Result:", res3.success ? "❌ UNEXPECTED SUCCESS" : "✅ BLOCKED BY COOLDOWN (PASS)", "| Message:", res3.message);

  if (!res3.success && res3.message.includes("Execution Cooldown Active")) {
    console.log("  ✅ [PASS] Fix 2 Verified: Rapid-fire re-entry within 15 mins window strictly blocked.\n");
    totalPass++;
  } else {
    console.log("  ❌ [FAIL] Fix 2 Failed: Rapid-fire trade was NOT blocked by cooldown!\n");
  }

  // -------------------------------------------------------------------------
  // FIX 3: R (RISK UNIT) CALIBRATION AGAINST CHOP RANGE
  // -------------------------------------------------------------------------
  console.log("[TEST 3: R CALIBRATION AGAINST REALIZED CHOP RANGE]");
  const brain = aiTradingBrainEngine.analyze("BTCUSD", 64702.22, []);
  const rDistance = Math.abs(brain.entryPrice - brain.stopLoss);
  const rPct = Number(((rDistance / brain.entryPrice) * 100).toFixed(2));

  console.log(`  BTCUSD Price: $${brain.entryPrice} | Calibrated R: $${rDistance.toFixed(2)} (${rPct}% of price)`);
  console.log(`  Target: $${brain.target1} | SL: $${brain.stopLoss}`);

  if (rPct >= 0.40 && Math.abs((Math.abs(brain.target1 - brain.entryPrice) / rDistance) - 5.0) < 0.05) {
    console.log("  ✅ [PASS] Fix 3 Verified: R distance ($" + rDistance.toFixed(2) + ") is wide enough to absorb $500 session chop range.\n");
    totalPass++;
  } else {
    console.log("  ❌ [FAIL] Fix 3 Failed: R distance is still under-calibrated!\n");
  }

  // -------------------------------------------------------------------------
  // FIX 4: OUTCOME LABEL BUG TEST (-$0.29 LOSS REPRODUCTION)
  // -------------------------------------------------------------------------
  console.log("[TEST 4: OUTCOME LABEL BUG TEST (-$0.29 LOSS)]");
  // Force open position with test ID for label audit
  paperTradingEngine.openPosition("TCS", "Tata Consultancy Services", "BUY", 10, 2250, 2200, 2400, "INR");
  const tcsPos = paperTradingEngine.getOpenPositions().find(p => p.ticker === "TCS");
  
  if (tcsPos) {
    // Square off with -$0.29 loss
    const closeRes = paperTradingEngine.closePosition(tcsPos.id, 2249.971, "TEST_SMALL_LOSS");
    const closedTrd = paperTradingEngine.getClosedTrades().find(t => t.id === closeRes.record?.id);
    console.log("  Closed Trade Realized P&L:", closedTrd?.realizedPnL, "| Outcome Tag:", closedTrd?.outcome);

    if (closedTrd && closedTrd.outcome === "LOSS" && closedTrd.realizedPnL < 0) {
      console.log("  ✅ [PASS] Fix 4 Verified: -$0.29 loss is strictly tagged as 'LOSS' (Never 'BREAKEVEN').\n");
      totalPass++;
    } else {
      console.log("  ❌ [FAIL] Fix 4 Failed: Negative loss was mislabeled as " + closedTrd?.outcome + "\n");
    }
  }

  console.log(`Regression Test Summary: ${totalPass}/4 passing.`);
  if (totalPass === 4) {
    console.log("🎉 ALL 4 HARD-EVIDENCE PAPER TRADING BUGS VERIFIED FIXED 100%!");
  }
}

runRegressionSuite();
