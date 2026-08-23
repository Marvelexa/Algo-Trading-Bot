import { deltaAutoTraderEngine, AutoTraderPosition } from "../lib/deltaAutoTraderEngine";
import { deltaExchangeEngine } from "../lib/deltaExchangeEngine";

function assert(condition: boolean, testName: string, details?: string) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     ↳ ${details}`);
    process.exit(1);
  } else {
    console.log(`  ✅ [PASS] ${testName}`);
    if (details) console.log(`     ↳ ${details}`);
  }
}

console.log("================================================================================");
console.log("🧪 RUNNING SUITE: TARGET RATCHET, TRAILING SL, AND DELTA BRACKET ORDERS");
console.log("================================================================================");

// 1. STEP-UP TARGET RATCHET TEST
console.log("\n1. STEP-UP TARGET RATCHET & LADDER TESTS");

// Setup a mock position: Entry = 100, Initial SL = 95 (Risk = $5), Initial TP = 110 (Gain = $10)
const testPosition: AutoTraderPosition = {
  id: "test_ratchet_pos_1",
  symbol: "ETHUSD",
  type: "BUY",
  quantity: 1,
  entryPrice: 100,
  currentPrice: 100,
  stopLossPrice: 95,
  targetPrice: 110,
  initialRiskUSD: 5,
  atrValue: 3,
  confidenceScore: 85,
  unrealizedPnLUSD: 0,
  unrealizedPnLPct: 0,
  trailingStopActive: false,
  highestProfitUSD: 0,
  timeframeAlignment: "15m+1h+4h Aligned",
  entryTimestamp: new Date().toISOString(),
  entryTimeMs: Date.now(),
  maxHoldTimeExpiry: Date.now() + 86400000,
  ratchetTier: 0
};

(deltaAutoTraderEngine as any).openPositions = [testPosition];

// Simulate price rising to 110 (Target 1 Reached)
const logsT1 = deltaAutoTraderEngine.updateLivePriceAndCheckExits("ETHUSD", 110.5);

assert((testPosition.ratchetTier || 0) >= 1, "Target Ratchet increments tier to 1 upon reaching Target 1", `ratchetTier = ${testPosition.ratchetTier}`);
assert(testPosition.targetPrice > 110, "Target Price extended upward above 110", `New Target = $${testPosition.targetPrice}`);
assert(testPosition.stopLossPrice > 100, "Stop Loss moved above Entry into guaranteed profit", `New SL = $${testPosition.stopLossPrice}`);
assert((testPosition.lockedProfitUSD || 0) > 0, "Guaranteed profit is locked", `Locked Profit = $${testPosition.lockedProfitUSD}`);

// 2. SIMULATE TARGET 2 REACHED (Price rises to new target)
const currentTP = testPosition.targetPrice;
const logsT2 = deltaAutoTraderEngine.updateLivePriceAndCheckExits("ETHUSD", currentTP + 0.5);

assert((testPosition.ratchetTier || 0) >= 2, "Target Ratchet increments tier to 2 upon reaching Target 2", `ratchetTier = ${testPosition.ratchetTier}`);
assert(testPosition.targetPrice > currentTP, "Target Price extended further upward", `New Target = $${testPosition.targetPrice}`);
assert(testPosition.stopLossPrice > 105, "Stop Loss trailed further up into higher guaranteed profit", `New SL = $${testPosition.stopLossPrice}`);

// 3. SIMULATE REVERSAL TO HIT TRAILING SL (Price drops to Stop Loss)
const activeSL = testPosition.stopLossPrice;
const initialClosedCount = deltaAutoTraderEngine.getClosedRecords().length;

const exitLogs = deltaAutoTraderEngine.updateLivePriceAndCheckExits("ETHUSD", activeSL - 0.5);

assert((deltaAutoTraderEngine as any).openPositions.length === 0, "Position automatically closed upon hitting trailed SL", "Open positions = 0");
const latestClosed = deltaAutoTraderEngine.getClosedRecords()[0];
assert(latestClosed && latestClosed.outcome === "WIN", "Closed record outcome is WIN with profit banked", `Outcome = ${latestClosed?.outcome}, PnL = $${latestClosed?.realizedPnLUSD}`);

// 4. BEARISH / SHORT SETUP EVALUATION TEST
console.log("\n2. BEARISH / SHORT SETUP SIGNAL TEST");
const mockBearish15m = [
  { open: 105, high: 106, low: 104, close: 104.5, volume: 100 },
  { open: 104.5, high: 105, low: 102, close: 102.5, volume: 150 },
  { open: 102.5, high: 103, low: 99, close: 99.5, volume: 200 }
];
const mockBearish1h = Array.from({ length: 25 }, (_, i) => ({
  open: 120 - i,
  high: 121 - i,
  low: 119 - i,
  close: 119.5 - i,
  volume: 500
}));
const mockBearish4h = Array.from({ length: 25 }, (_, i) => ({
  open: 150 - i * 2,
  high: 151 - i * 2,
  low: 148 - i * 2,
  close: 148.5 - i * 2,
  volume: 1000
}));

const bearAnalysis = deltaAutoTraderEngine.analyzeMultiTimeframe("BTCUSD", mockBearish15m, mockBearish1h, mockBearish4h);
assert(bearAnalysis.direction === "SELL", "System accurately identifies SELL / SHORT setups during bearish breakdown", `Direction: ${bearAnalysis.direction}, Bear Score: ${bearAnalysis.overallScore}/100`);
assert(bearAnalysis.overallScore >= 75, "Bearish setup receives high conviction score", `Score: ${bearAnalysis.overallScore}/100`);

// 5. DELTA EXCHANGE BRACKET ORDER METHOD EXISTENCE & SIGNATURE
console.log("\n3. DELTA EXCHANGE BRACKET ORDER METHODS");
assert(typeof deltaExchangeEngine.setBracketOrder === "function", "deltaExchangeEngine.setBracketOrder method exists");
assert(typeof deltaExchangeEngine.updateBracketOrder === "function", "deltaExchangeEngine.updateBracketOrder method exists");
assert(typeof deltaExchangeEngine.cancelBracketOrder === "function", "deltaExchangeEngine.cancelBracketOrder method exists");

console.log("\n================================================================================");
console.log("🏁 ALL TARGET RATCHET, SELL/SHORT & BRACKET TESTS PASSED PERFECTLY!");
console.log("================================================================================");
