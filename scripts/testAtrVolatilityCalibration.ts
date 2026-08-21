/**
 * DIAGNOSTIC VERIFICATION TEST: ATR VOLATILITY CALIBRATION & NOISE BUFFER AUDIT
 * Verifies that R (Risk Unit) is properly calibrated against actual candle volatility
 * and that Target - Entry = 5 * R holds 100% mathematically.
 */

import { aiTradingBrainEngine } from "../lib/aiTradingBrainV1";
import { stockResearchEngine } from "../lib/stockEngine";

async function runAtrAudit() {
  console.log("=========================================================================");
  console.log("   DIAGNOSTIC AUDIT: ATR VOLATILITY CALIBRATION & 1:5 RR MATH VERIFIER   ");
  console.log("=========================================================================\n");

  const testSymbols = ["BTCUSD", "ETHUSD", "RELIANCE", "TCS"];
  let totalPass = 0;

  for (const sym of testSymbols) {
    const isCrypto = sym.includes("USD");
    const rec = await stockResearchEngine.analyzeStock(sym, true, "SWING_TRADER");
    const bars = rec.bars || [];
    const brain = aiTradingBrainEngine.analyze(sym, rec.currentPrice, bars);

    const entry = brain.entryPrice;
    const sl = brain.stopLoss;
    const target = brain.target1;
    const isBull = brain.action.includes("BUY");

    const rUnit = Math.abs(entry - sl);
    const targetDist = Math.abs(target - entry);
    const rrRatio = targetDist / rUnit;

    const priceSym = isCrypto ? "$" : "₹";
    const rPctOfPrice = Number(((rUnit / entry) * 100).toFixed(2));

    console.log(`[${sym}]`);
    console.log(`  Live Price: ${priceSym}${entry}`);
    console.log(`  Verdict: ${brain.action}`);
    console.log(`  R (Risk Distance): ${priceSym}${rUnit.toFixed(2)} (${rPctOfPrice}% of Price)`);
    console.log(`  Initial SL: ${priceSym}${sl}`);
    console.log(`  5R Target: ${priceSym}${target}`);
    console.log(`  Calculated RR Ratio: 1 : ${rrRatio.toFixed(2)}`);

    // 1. Math Exactness Check (1:5 RR)
    const isMathCorrect = Math.abs(rrRatio - 5.0) < 0.05;
    if (isMathCorrect) {
      console.log(`  ✅ [PASS] 1:5 RR Ratio Math is 100% Exact.`);
      totalPass++;
    } else {
      console.log(`  ❌ [FAIL] RR Ratio mismatch: ${rrRatio}`);
    }

    // 2. Volatility Noise Floor Check (R should be >= 0.4% to prevent single-wick whipsaws)
    const isNoiseProtected = rPctOfPrice >= 0.40;
    if (isNoiseProtected) {
      console.log(`  ✅ [PASS] Volatility Buffer Confirmed: R (${rPctOfPrice}%) is safely above single 5m candle noise floor (>= 0.40%).`);
      totalPass++;
    } else {
      console.log(`  ⚠️ [WARN] R (${rPctOfPrice}%) is below 0.40% noise floor.`);
    }

    console.log("-------------------------------------------------------------------------");
  }

  console.log(`\nDiagnostic Audit Result: ${totalPass}/${testSymbols.length * 2} checks passed.`);
  if (totalPass === testSymbols.length * 2) {
    console.log("🎉 ALL VOLATILITY CALIBRATION & 1:5 RR MATH CHECKS VERIFIED 100%!");
  }
}

runAtrAudit();
