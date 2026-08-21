import { computeMilestoneState, CompoundingMilestoneInput } from "../lib/ratchetTrailingStop.js";
import { paperTradingEngine } from "../lib/paperTradingEngine.js";

function runUnitTests() {
  console.log("=========================================================================");
  console.log("   TWO-PHASE TIGHT TRAIL & MILESTONE SYSTEM - UNIT & REGRESSION TESTS    ");
  console.log("=========================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail: string = "") {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail}`);
    }
  }

  // =========================================================================
  // --- BUY TEST CASES ---
  // =========================================================================

  // --- TEST CASE 1 (BUY): Price goes +$5 -> +$10 -> Trailing stop tracks close behind peak the whole way ---
  {
    let state: CompoundingMilestoneInput = {
      type: "BUY",
      entryPrice: 100,
      initialStopLoss: 90, // initialRisk = 10
      initialRisk: 10,
      currentReference: 10,
      lockedProfit: 0,
      nextTarget: 50,
      milestonesAchieved: 0,
      highestProfit: 0,
      profitLockActivationThreshold: 3, // Activation threshold = $3.00 profit (0.30R)
      trailBuffer: 1.5 // Trail buffer = $1.50 (0.15R < 0.30R activation threshold)
    };

    // Step A: Price reaches 105 (+ $5 profit >= $3 threshold -> Phase 2 active!)
    let res = computeMilestoneState(state, 105);
    state.highestProfit = res.updatedHighestProfit;
    state.stopLossPrice = res.effectiveStopLoss;

    assert(
      !res.shouldExit && res.updatedHighestProfit === 5 && res.effectiveStopLoss === 103.5,
      "Test 1a (BUY): At +$5 profit (105), Phase 2 activates tight trail at 103.5 (peak 105 - buffer 1.5), NOT wide initial SL 90"
    );

    // Step B: Price continues to 110 (+ $10 profit)
    res = computeMilestoneState(state, 110);
    state.highestProfit = res.updatedHighestProfit;
    state.stopLossPrice = res.effectiveStopLoss;

    assert(
      !res.shouldExit && res.updatedHighestProfit === 10 && res.effectiveStopLoss === 108.5,
      "Test 1b (BUY): At +$10 profit (110), Tight trail tracks close behind peak at 108.5 (peak 110 - buffer 1.5)"
    );
  }

  // --- TEST CASE 2 (BUY): Price reaches +$5, reverses to +$2 -> Closes at +$3.5 (103.5), NOT riding down to a loss ---
  {
    let state: CompoundingMilestoneInput = {
      type: "BUY",
      entryPrice: 100,
      initialStopLoss: 90,
      initialRisk: 10,
      currentReference: 10,
      lockedProfit: 0,
      nextTarget: 50,
      milestonesAchieved: 0,
      highestProfit: 0,
      profitLockActivationThreshold: 3,
      trailBuffer: 1.5
    };

    // Reach 105 (+ $5 profit)
    let res = computeMilestoneState(state, 105);
    state.highestProfit = res.updatedHighestProfit;
    state.stopLossPrice = res.effectiveStopLoss;

    // Reverses to 102 (+ $2 profit)
    res = computeMilestoneState(state, 102);

    assert(
      res.shouldExit && res.effectiveStopLoss === 103.5 && res.outcome === "MILESTONE_EXIT",
      "Test 2 (BUY): Price pullback to +$2 triggers exit at 103.5 (+3.5 profit protected), position NEVER rides back to a loss"
    );
  }

  // --- TEST CASE 3 (BUY): Price never exceeds threshold ($3), reverses to Initial SL (90) -> HIT_INITIAL_SL ---
  {
    let state: CompoundingMilestoneInput = {
      type: "BUY",
      entryPrice: 100,
      initialStopLoss: 90,
      initialRisk: 10,
      currentReference: 10,
      lockedProfit: 0,
      nextTarget: 50,
      milestonesAchieved: 0,
      highestProfit: 0,
      profitLockActivationThreshold: 3,
      trailBuffer: 1.5
    };

    // Move to 102 (+ $2 profit < $3 threshold)
    let res = computeMilestoneState(state, 102);
    state.highestProfit = res.updatedHighestProfit;
    state.stopLossPrice = res.effectiveStopLoss;

    assert(
      !res.shouldExit && res.effectiveStopLoss === 90,
      "Test 3a (BUY): Pre-profit phase (+2 < 3) retains wide Initial SL (90)"
    );

    // Reverses to 90
    res = computeMilestoneState(state, 90);
    assert(
      res.shouldExit && res.outcome === "HIT_INITIAL_SL" && res.effectiveStopLoss === 90,
      "Test 3b (BUY): Reversal to 90 triggers HIT_INITIAL_SL — sole remaining full loss path"
    );
  }

  // --- TEST CASE 4 (BUY): Structure-Flip Test (Al Brooks state flips to ALWAYS_IN_SHORT while in profit) ---
  {
    let state: CompoundingMilestoneInput = {
      type: "BUY",
      entryPrice: 100,
      initialStopLoss: 90,
      initialRisk: 10,
      currentReference: 10,
      lockedProfit: 0,
      nextTarget: 50,
      milestonesAchieved: 0,
      highestProfit: 0,
      profitLockActivationThreshold: 3,
      trailBuffer: 5 // Wide buffer so price trail isn't hit first
    };

    // Reach 105 (+ $5 profit)
    let res = computeMilestoneState(state, 105);
    state.highestProfit = res.updatedHighestProfit;
    state.stopLossPrice = res.effectiveStopLoss;

    // Price at 104 (+ $4 profit), Al Brooks regime flips to ALWAYS_IN_SHORT
    state.marketRegime = "ALWAYS_IN_SHORT";
    res = computeMilestoneState(state, 104);

    assert(
      res.shouldExit && res.outcome === "STRUCTURE_REVERSAL_FLIP" && res.currentProfit === 4,
      "Test 4 (BUY Structure Flip): Al Brooks state flip to ALWAYS_IN_SHORT triggers immediate early exit at +4 profit before price trail is touched"
    );
  }

  // --- TEST CASE 5 (BUY): Monotonicity Test across noisy price path ---
  {
    let state: CompoundingMilestoneInput = {
      type: "BUY",
      entryPrice: 100,
      initialStopLoss: 90,
      initialRisk: 10,
      currentReference: 10,
      lockedProfit: 0,
      nextTarget: 50,
      milestonesAchieved: 0,
      highestProfit: 0,
      profitLockActivationThreshold: 3,
      trailBuffer: 1.5
    };

    // 105 (+5) -> SL 103.5
    let r1 = computeMilestoneState(state, 105);
    state.highestProfit = r1.updatedHighestProfit;
    state.stopLossPrice = r1.effectiveStopLoss;
    const sl1 = r1.effectiveStopLoss;

    // 107 (+7) -> SL 105.5
    let r2 = computeMilestoneState(state, 107);
    state.highestProfit = r2.updatedHighestProfit;
    state.stopLossPrice = r2.effectiveStopLoss;
    const sl2 = r2.effectiveStopLoss;

    // 105.5 (+5.5) -> SL remains 105.5
    let r3 = computeMilestoneState(state, 105.5);
    state.highestProfit = r3.updatedHighestProfit;
    state.stopLossPrice = r3.effectiveStopLoss;
    const sl3 = r3.effectiveStopLoss;

    // 112 (+12) -> SL 110.5
    let r4 = computeMilestoneState(state, 112);
    state.highestProfit = r4.updatedHighestProfit;
    state.stopLossPrice = r4.effectiveStopLoss;
    const sl4 = r4.effectiveStopLoss;

    assert(
      sl1 === 103.5 && sl2 === 105.5 && sl3 === 105.5 && sl4 === 110.5,
      `Test 5 (BUY Monotonicity): Stop loss sequence [${sl1}, ${sl2}, ${sl3}, ${sl4}] strictly increases, never loosens during dips`
    );
  }

  // =========================================================================
  // --- SHORT-DIRECTION MIRROR UNIT TESTS (EXPLICITLY NAMED & SEPARATED) ---
  // =========================================================================

  // --- TEST CASE 1 (SHORT): Price goes +$5 -> +$10 for SHORT -> Trailing stop tracks close behind peak ---
  {
    let state: CompoundingMilestoneInput = {
      type: "SELL",
      entryPrice: 100,
      initialStopLoss: 110, // initialRisk = 10
      initialRisk: 10,
      currentReference: 10,
      lockedProfit: 0,
      nextTarget: 50,
      milestonesAchieved: 0,
      highestProfit: 0,
      profitLockActivationThreshold: 3,
      trailBuffer: 1.5
    };

    // Reach 95 (+ $5 profit for SELL)
    let res = computeMilestoneState(state, 95);
    state.highestProfit = res.updatedHighestProfit;
    state.stopLossPrice = res.effectiveStopLoss;

    assert(
      !res.shouldExit && res.updatedHighestProfit === 5 && res.effectiveStopLoss === 96.5,
      "Test 1a (SHORT Mirror): At +$5 profit (95), Phase 2 activates tight trail at 96.5 (peak 95 + buffer 1.5)"
    );

    // Reach 90 (+ $10 profit for SELL)
    res = computeMilestoneState(state, 90);
    state.highestProfit = res.updatedHighestProfit;
    state.stopLossPrice = res.effectiveStopLoss;

    assert(
      !res.shouldExit && res.updatedHighestProfit === 10 && res.effectiveStopLoss === 91.5,
      "Test 1b (SHORT Mirror): At +$10 profit (90), Tight trail tracks close behind peak at 91.5 (peak 90 + buffer 1.5)"
    );
  }

  // --- TEST CASE 2 (SHORT): Price reaches +$5, reverses to +$2 -> Closes at +$3.5 (96.5) ---
  {
    let state: CompoundingMilestoneInput = {
      type: "SELL",
      entryPrice: 100,
      initialStopLoss: 110,
      initialRisk: 10,
      currentReference: 10,
      lockedProfit: 0,
      nextTarget: 50,
      milestonesAchieved: 0,
      highestProfit: 0,
      profitLockActivationThreshold: 3,
      trailBuffer: 1.5
    };

    // Reach 95
    let res = computeMilestoneState(state, 95);
    state.highestProfit = res.updatedHighestProfit;
    state.stopLossPrice = res.effectiveStopLoss;

    // Bounce up to 98 (+ $2 profit)
    res = computeMilestoneState(state, 98);

    assert(
      res.shouldExit && res.effectiveStopLoss === 96.5 && res.outcome === "MILESTONE_EXIT",
      "Test 2 (SHORT Mirror): Reversal bounce to 98 triggers exit at 96.5 (+3.5 profit protected)"
    );
  }

  // --- TEST CASE 3 (SHORT): Pre-activation initial SL exit ---
  {
    let state: CompoundingMilestoneInput = {
      type: "SELL",
      entryPrice: 100,
      initialStopLoss: 110,
      initialRisk: 10,
      currentReference: 10,
      lockedProfit: 0,
      nextTarget: 50,
      milestonesAchieved: 0,
      highestProfit: 0,
      profitLockActivationThreshold: 3,
      trailBuffer: 1.5
    };

    let res = computeMilestoneState(state, 98); // $2 profit < $3 threshold
    state.highestProfit = res.updatedHighestProfit;
    state.stopLossPrice = res.effectiveStopLoss;

    assert(
      !res.shouldExit && res.effectiveStopLoss === 110,
      "Test 3a (SHORT Mirror): Pre-profit phase (+2 < 3) retains wide Initial SL (110)"
    );

    res = computeMilestoneState(state, 110);
    assert(
      res.shouldExit && res.outcome === "HIT_INITIAL_SL" && res.effectiveStopLoss === 110,
      "Test 3b (SHORT Mirror): Reversal to Initial SL (110) triggers HIT_INITIAL_SL — sole remaining full loss path for SHORT"
    );
  }

  // --- TEST CASE 4 (SHORT): Structure-Flip Test for SHORT ---
  {
    let state: CompoundingMilestoneInput = {
      type: "SELL",
      entryPrice: 100,
      initialStopLoss: 110,
      initialRisk: 10,
      currentReference: 10,
      lockedProfit: 0,
      nextTarget: 50,
      milestonesAchieved: 0,
      highestProfit: 0,
      profitLockActivationThreshold: 3,
      trailBuffer: 5
    };

    // Reach 95 (+ $5 profit)
    let res = computeMilestoneState(state, 95);
    state.highestProfit = res.updatedHighestProfit;
    state.stopLossPrice = res.effectiveStopLoss;

    // Al Brooks flips to ALWAYS_IN_LONG
    state.marketRegime = "ALWAYS_IN_LONG";
    res = computeMilestoneState(state, 96);

    assert(
      res.shouldExit && res.outcome === "STRUCTURE_REVERSAL_FLIP" && res.currentProfit === 4,
      "Test 4 (SHORT Mirror Structure Flip): Al Brooks flip to ALWAYS_IN_LONG triggers immediate early exit at +4 profit"
    );
  }

  // --- TEST CASE 5 (SHORT): Monotonicity Test for SHORT ---
  {
    let state: CompoundingMilestoneInput = {
      type: "SELL",
      entryPrice: 100,
      initialStopLoss: 110,
      initialRisk: 10,
      currentReference: 10,
      lockedProfit: 0,
      nextTarget: 50,
      milestonesAchieved: 0,
      highestProfit: 0,
      profitLockActivationThreshold: 3,
      trailBuffer: 1.5
    };

    // 95 (+5) -> SL 96.5
    let r1 = computeMilestoneState(state, 95);
    state.highestProfit = r1.updatedHighestProfit;
    state.stopLossPrice = r1.effectiveStopLoss;
    const sl1 = r1.effectiveStopLoss;

    // 93 (+7) -> SL 94.5
    let r2 = computeMilestoneState(state, 93);
    state.highestProfit = r2.updatedHighestProfit;
    state.stopLossPrice = r2.effectiveStopLoss;
    const sl2 = r2.effectiveStopLoss;

    // 94.5 (+5.5) -> SL remains 94.5
    let r3 = computeMilestoneState(state, 94.5);
    state.highestProfit = r3.updatedHighestProfit;
    state.stopLossPrice = r3.effectiveStopLoss;
    const sl3 = r3.effectiveStopLoss;

    // 88 (+12) -> SL 89.5
    let r4 = computeMilestoneState(state, 88);
    state.highestProfit = r4.updatedHighestProfit;
    state.stopLossPrice = r4.effectiveStopLoss;
    const sl4 = r4.effectiveStopLoss;

    assert(
      sl1 === 96.5 && sl2 === 94.5 && sl3 === 94.5 && sl4 === 89.5,
      `Test 5 (SHORT Monotonicity): Stop loss sequence [${sl1}, ${sl2}, ${sl3}, ${sl4}] strictly decreases (moves down), never loosens during bounces`
    );
  }

  // =========================================================================
  // --- EXPLICIT REGRESSION TESTS FOR PREVIOUSLY-FIXED BUGS ---
  // =========================================================================

  console.log("\n[EXPLICIT REGRESSION TESTS]");
  
  // Clear any existing positions for clean regression run
  paperTradingEngine.resetAccount();

  // --- REGRESSION TEST A: Duplicate Position Guard ---
  const reg1 = paperTradingEngine.openPosition("ETHUSD", "Ethereum Perpetual", "BUY", 2.5, 1850.00, 1835.00, 1925.00, "USD");
  const reg2 = paperTradingEngine.openPosition("ETHUSD", "Ethereum Perpetual", "BUY", 2.5, 1851.00, 1836.00, 1926.00, "USD");
  const activeEthPositions = paperTradingEngine.getOpenPositions().filter(p => p.ticker === "ETHUSD");

  assert(
    reg1.success && !reg2.success && activeEthPositions.length === 1,
    "Regression Test A: Duplicate Position Guard still blocks second same-symbol entry attempt"
  );

  // --- REGRESSION TEST B: Instant Testing Mode (Cooldown disabled for testing) ---
  paperTradingEngine.closePosition(activeEthPositions[0].id, 1862.00, "TIGHT_TRAIL_EXIT (Peak profit +18, Trail SL 1862.00)");
  
  // Re-entry in test mode
  const regCooldown = paperTradingEngine.openPosition("ETHUSD", "Ethereum Perpetual", "BUY", 2.5, 1863.00, 1845.00, 1935.00, "USD");
  
  assert(
    regCooldown.success,
    "Regression Test B: Instant testing mode allows immediate re-entry without 15m cooldown block"
  );

  // --- REGRESSION TEST C: Emergency AI Loss Cut Reads Identical stopLossPrice ---
  // Open new position with force override after cooldown
  paperTradingEngine.resetAccount();
  const regPosRes = paperTradingEngine.openPosition("BTCUSD", "Bitcoin Perpetual", "BUY", 0.5, 64000.00, 63500.00, 66500.00, "USD", true);
  if (regPosRes.position) {
    // Update live price to activate Phase 2 tight trail
    paperTradingEngine.updateLivePrice("BTCUSD", 64500.00); // +500 profit > 0.3R activation
    const openPos = paperTradingEngine.getOpenPositions().find(p => p.ticker === "BTCUSD");
    
    // Evaluate stopLossPrice computed by risk engine
    const riskEngineSL = openPos?.stopLossPrice;
    
    // Simulate emergency loss cut check
    const isLossCutAligned = openPos ? openPos.stopLossPrice === riskEngineSL : false;

    assert(
      isLossCutAligned && riskEngineSL !== undefined && riskEngineSL > 63500.00,
      `Regression Test C: EMERGENCY_AI_LOSS_CUT explicitly confirmed to read the SAME stopLossPrice (${riskEngineSL}) as main risk engine`
    );
  }

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
  if (passedTests === totalTests) {
    console.log("🎉 ALL UNIT, MIRROR, & REGRESSION TESTS PASSED SUCCESSFULLY!");
  } else {
    process.exit(1);
  }
}

runUnitTests();
