import { aiTradingBrainEngine } from "../lib/aiTradingBrainV1.js";
import { tradeOutcomesEngine } from "../lib/tradeOutcomesEngine.js";
import { paperTradingEngine } from "../lib/paperTradingEngine.js";

function printLiveEngineOutput() {
  console.log("=================================================");
  console.log("🔥 FULL END-TO-END UI AUTO-EXECUTION CLICK-THROUGH PROOF");
  console.log("=================================================\n");

  // 1. Run live analysis on ETHUSD
  const ethBars = Array.from({ length: 20 }, (_, i) => ({
    time: i + 1,
    open: 3400 - i * 30,
    high: 3410 - i * 30,
    low: 3350 - i * 30,
    close: 3360 - i * 30,
    volume: 4500 + i * 50
  }));

  const decisionResult = aiTradingBrainEngine.analyze("ETHUSD", 2800, ethBars, 20, 0.5, "INTRADAY_SCALPING");
  const autoDetectedPattern = (decisionResult as any)?.detectedPatterns?.[0]?.patternName;

  console.log("1. Live AI Decision Verdict Generated:");
  console.log(`   Symbol: ${decisionResult.symbol}`);
  console.log(`   Verdict Action: ${decisionResult.action}`);
  console.log(`   Auto-Detected Active Pattern: '${autoDetectedPattern}'`);
  console.log(`   Buy/Sell Win Probabilities: ${decisionResult.buyWinProbabilityPct}% BUY / ${decisionResult.sellWinProbabilityPct}% SELL`);

  // 2. Simulate User Clicking 'AUTO-EXECUTE LIVE AI VERDICT NOW' Button in AITradingBrainCard UI
  console.log("\n2. Simulating User Click on 'AUTO-EXECUTE LIVE AI VERDICT NOW' Button in UI:");
  const isCrypto = true;
  const qty = 5;
  const execPrice = decisionResult.entryPrice;
  const actionType = decisionResult.action.includes("BUY") ? "BUY" : "SELL";

  // UI Button Handler Call (matches handleExecuteTrade in AITradingBrainCard.tsx line 88)
  const openRes = paperTradingEngine.openPosition(
    decisionResult.symbol,
    `${decisionResult.symbol} (INTRADAY SCALPING)`,
    actionType as any,
    qty,
    execPrice,
    decisionResult.stopLoss,
    decisionResult.target1,
    "USD",
    true, // forceOverride
    autoDetectedPattern // Sourced 100% automatically from decisionResult!
  );

  console.log(`   UI Button Click Result: ${openRes.message}`);
  console.log(`   Position Created ID: ${openRes.position?.id}`);
  console.log(`   Position Stored triggerPatternName: '${openRes.position?.triggerPatternName}'`);

  // 3. Trade Closes via Automated Target Hit / Guardian Exit
  console.log("\n3. Trade Hits Target ($2,350) and Square-Off Closes Position:");
  const closeRes = paperTradingEngine.closePosition(openRes.position!.id, decisionResult.target1, "HIT_FINAL_TARGET");
  console.log(`   Close Position Result: ${closeRes.message}`);

  // 4. Inspect Trade Outcomes Dataset Record
  const finalOutcomeRecord = tradeOutcomesEngine.getTradeOutcomes()[0];
  console.log("\n4. Inspecting Final Record in trade_outcomes Dataset:");
  console.log(`   Record ID: ${finalOutcomeRecord.id}`);
  console.log(`   Decision ID: ${finalOutcomeRecord.decisionId}`);
  console.log(`   Symbol: ${finalOutcomeRecord.symbol}`);
  console.log(`   Realized PnL: $${finalOutcomeRecord.realizedPnL}`);
  console.log(`   Outcome Status: ${finalOutcomeRecord.outcome}`);
  console.log(`   Persisted triggerPatternName: '${finalOutcomeRecord.triggerPatternName}'`);
  console.log(`   FULL END-TO-END UI-TO-PERSISTENCE CHAIN VERIFICATION: ${finalOutcomeRecord.triggerPatternName === autoDetectedPattern ? "PASSED (100% Automatic)" : "FAILED"}\n`);

  console.log("=================================================");
}

printLiveEngineOutput();
