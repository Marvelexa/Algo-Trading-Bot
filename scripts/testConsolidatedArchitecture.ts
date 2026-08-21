import { stockResearchEngine } from "../lib/stockEngine";
import { aiTradingBrainEngine } from "../lib/aiTradingBrainV1";

async function testConsolidatedArchitecture() {
  console.log("=========================================================================");
  console.log("   STEP 5: MASTER CONSOLIDATED SINGLE-SOURCE-OF-TRUTH ARCHITECTURE TEST  ");
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

  const testSymbols = ["ETHUSD", "BTCUSD", "RELIANCE", "TCS"];

  console.log("Symbol   | Live Price | AI Brain Verdict | Stock Engine Action | Direction | 5R Target | Initial SL | Status");
  console.log("-------------------------------------------------------------------------------------------------------");

  for (const sym of testSymbols) {
    const isCrypto = sym.includes("USD");
    const currSym = isCrypto ? "$" : "₹";
    
    // 1. Fetch unified Stock Recommendation (which internally consumes aiTradingBrainEngine)
    const rec = await stockResearchEngine.analyzeStock(sym, true, "SWING_TRADER");

    // 2. Fetch direct AI Trading Brain Engine output
    const brain = aiTradingBrainEngine.analyze(sym, rec.currentPrice, rec.bars || []);

    // 3. Map actions to standardized string
    const recActionNorm = rec.suggestedAction.includes("SELL") ? "SELL" : rec.suggestedAction.includes("BUY") ? "BUY" : "HOLD";
    const brainActionNorm = brain.action.includes("SELL") ? "SELL" : brain.action.includes("BUY") ? "BUY" : "HOLD";

    const actionsMatch = recActionNorm === brainActionNorm;
    const targetsMatch = rec.timingSignal.target1 === brain.target1;
    const stopLossesMatch = rec.timingSignal.stopLoss === brain.stopLoss;

    console.log(
      `${sym.padEnd(8)} | ${currSym}${rec.currentPrice.toString().padEnd(9)} | ${brain.action.padEnd(16)} | ${rec.suggestedAction.padEnd(19)} | ${rec.timingSignal.direction.padEnd(9)} | ${currSym}${rec.timingSignal.target1.toString().padEnd(9)} | ${currSym}${rec.timingSignal.stopLoss.toString().padEnd(10)} | ${actionsMatch && targetsMatch && stopLossesMatch ? "✅ MATCH" : "❌ DIVERGED"}`
    );

    assert(
      actionsMatch,
      `Step 5a (${sym}): StockEngine suggestedAction ('${rec.suggestedAction}') matches AITradingBrain action ('${brain.action}') 100%`
    );

    assert(
      targetsMatch,
      `Step 5b (${sym}): StockEngine 5R Target (${rec.timingSignal.target1}) matches AITradingBrain target1 (${brain.target1}) 100%`
    );

    assert(
      stopLossesMatch,
      `Step 5c (${sym}): StockEngine Initial SL (${rec.timingSignal.stopLoss}) matches AITradingBrain stopLoss (${brain.stopLoss}) 100%`
    );
  }

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
  if (passedTests === totalTests) {
    console.log("🎉 CONSOLIDATED SINGLE-SOURCE-OF-TRUTH ARCHITECTURE VERIFIED 100%!");
  } else {
    process.exit(1);
  }
}

testConsolidatedArchitecture();
