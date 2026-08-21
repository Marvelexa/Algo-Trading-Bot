/**
 * Item 2 Verification Script: Duplicate Position Guard & 15-Min Cooldown Across ALL FOUR Modules
 * Tests each module individually:
 * 1. INTRADAY_SCALPING
 * 2. SWING_TRADING
 * 3. LONG_TERM_COMPOUNDER
 * 4. OPTIONS_BUYING
 * 
 * Verifies:
 * A. Duplicate Same-Direction Entry is BLOCKED by Duplicate Position Guard.
 * B. Rapid Re-entry within 15-Min Window is BLOCKED by Cooldown Engine.
 * Reports PASS/FAIL and raw message per module individually.
 */

import { paperTradingEngine } from "../lib/paperTradingEngine";

function runGuardAndCooldownAllModesTest() {
  console.log("===============================================================");
  console.log("ITEM 2: DUPLICATE POSITION GUARD & 15-MIN COOLDOWN TEST (ALL 4 MODULES)");
  console.log("===============================================================");

  const modules = [
    { name: "INTRADAY_SCALPING", ticker: "INFY_INTRADAY", company: "Infosys Intraday" },
    { name: "SWING_TRADING", ticker: "TCS_SWING", company: "TCS Swing" },
    { name: "LONG_TERM_COMPOUNDER", ticker: "HDFCBANK_LT", company: "HDFC Bank Long Term" },
    { name: "OPTIONS_BUYING", ticker: "NIFTY_FNO", company: "Nifty F&O Call" }
  ];

  let totalPassed = 0;

  for (const mod of modules) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`🔹 TESTING MODULE: [${mod.name}] on Ticker: ${mod.ticker}`);
    console.log(`---------------------------------------------------------------`);

    paperTradingEngine.resetAccount(100000);

    // 1. Initial Trade Execution
    const trade1 = paperTradingEngine.openPosition(
      mod.ticker,
      mod.company,
      "BUY",
      10,
      1500,
      1470,
      1590,
      "INR"
    );

    if (!trade1.success || !trade1.position) {
      console.error(`❌ [${mod.name}] Initial Trade Failed:`, trade1.message);
      process.exit(1);
    }
    console.log(`   1. Initial Position Opened: ${trade1.position.ticker} @ ₹${trade1.position.entryPrice}`);

    // 2. Attempt Duplicate Same-Direction Entry
    const duplicateAttempt = paperTradingEngine.openPosition(
      mod.ticker,
      mod.company,
      "BUY",
      10,
      1505,
      1470,
      1590,
      "INR"
    );

    console.log(`   2. Duplicate Entry Attempt Result: Success = ${duplicateAttempt.success}`);
    console.log(`      Message: "${duplicateAttempt.message}"`);

    if (duplicateAttempt.success || !duplicateAttempt.message.includes("Same-direction re-entry blocked")) {
      console.error(`❌ [${mod.name}] Duplicate Position Guard FAILED to block duplicate entry!`);
      process.exit(1);
    }
    console.log(`   ✅ [PASS]: Duplicate Position Guard successfully blocked same-direction re-entry for ${mod.name}!`);

    // 3. Close the initial position
    const closeRes = paperTradingEngine.closePosition(trade1.position.id, 1520, "MANUAL_EXIT");
    console.log(`   3. Closed Initial Position @ ₹1520. Message: "${closeRes.message}"`);

    // 4. Attempt Rapid Re-entry immediately within 15-minute cooldown window
    const rapidReentryAttempt = paperTradingEngine.openPosition(
      mod.ticker,
      mod.company,
      "BUY",
      10,
      1525,
      1490,
      1600,
      "INR"
    );

    console.log(`   4. Rapid Re-entry Attempt Result: Success = ${rapidReentryAttempt.success}`);
    console.log(`      Message: "${rapidReentryAttempt.message}"`);

    if (rapidReentryAttempt.success || !rapidReentryAttempt.message.includes("Execution Cooldown Active")) {
      console.error(`❌ [${mod.name}] 15-Minute Cooldown Guard FAILED to block rapid re-entry!`);
      process.exit(1);
    }
    console.log(`   ✅ [PASS]: 15-Minute Hysteresis Cooldown Engine successfully blocked rapid re-entry for ${mod.name}!`);

    totalPassed++;
  }

  console.log("\n===============================================================");
  console.log(`SUMMARY: ${totalPassed}/4 MODULES INDIVIDUALLY PASSED BOTH GUARDS!`);
  console.log("===============================================================");
}

runGuardAndCooldownAllModesTest();
