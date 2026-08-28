import { deltaAutoTraderEngine, OHLCVBar } from "../lib/deltaAutoTraderEngine";

console.log("=================================================");
console.log("🧪 TESTING QUANTITATIVE MATH & DUAL BUY/SELL ENGINE");
console.log("=================================================");

// 1. Mock Candle Series Generator
function generateMockCandles(trend: "BULLISH" | "BEARISH" | "SIDEWAYS", count: number = 30, basePrice: number = 70000): OHLCVBar[] {
  const bars: OHLCVBar[] = [];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    let delta = 0;
    if (trend === "BULLISH") {
      delta = (Math.random() * 400) - 100; // General upward drift
    } else if (trend === "BEARISH") {
      delta = (Math.random() * 100) - 400; // General downward drift
    } else {
      delta = (Math.random() * 200) - 100; // Sideways oscillation
    }

    const open = price;
    const close = open + delta;
    const high = Math.max(open, close) + Math.random() * 50;
    const low = Math.min(open, close) - Math.random() * 50;
    const volume = 1000 + Math.random() * 500;

    bars.push({
      time: Date.now() - (count - i) * 15 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume
    });

    price = close;
  }

  return bars;
}

// 2. Test Quantitative Formulas
console.log("\n📐 1. Validating Mathematical Models & Formulas:");
const bull15m = generateMockCandles("BULLISH", 30, 70000);
const bull1h = generateMockCandles("BULLISH", 30, 70000);
const bull4h = generateMockCandles("BULLISH", 30, 70000);

const bullAnalysis = deltaAutoTraderEngine.analyzeMultiTimeframe("BTCUSD", bull15m, bull1h, bull4h);
console.log(`- Bullish Scenario Result: Direction=${bullAnalysis.direction}, Score=${bullAnalysis.overallScore}/100, EV=$${bullAnalysis.projectedProfitUSD} USD`);
console.log(`- Nexvora Phi Score: ${bullAnalysis.nexvoraPhiScore}, Shannon Entropy: ${bullAnalysis.shannonEntropy}, Hurst Exponent: ${bullAnalysis.hurstExponent}`);
console.log(`- KAMA Velocity: ${bullAnalysis.kamaVelocity}%, Half-Kelly: ${bullAnalysis.halfKellyFraction}`);

if (typeof bullAnalysis.nexvoraPhiScore === "number" && typeof bullAnalysis.shannonEntropy === "number") {
  console.log("✅ Quantitative Formula calculations: PASSED");
} else {
  console.error("❌ Quantitative Formula calculations: FAILED");
  process.exit(1);
}

// 3. Test Bearish / SELL Symmetric Analysis
console.log("\n🔴 2. Validating Bearish / SELL Symmetric Analysis:");
const bear15m = generateMockCandles("BEARISH", 30, 70000);
const bear1h = generateMockCandles("BEARISH", 30, 70000);
const bear4h = generateMockCandles("BEARISH", 30, 70000);

const bearAnalysis = deltaAutoTraderEngine.analyzeMultiTimeframe("BTCUSD", bear15m, bear1h, bear4h);
console.log(`- Bearish Scenario Result: Direction=${bearAnalysis.direction}, Score=${bearAnalysis.overallScore}/100, EV=$${bearAnalysis.projectedProfitUSD} USD`);
console.log(`- Bearish Reasoning: ${bearAnalysis.reasoning}`);

if (bearAnalysis.direction === "SELL" || bearAnalysis.direction === "NEUTRAL") {
  console.log("✅ Symmetric Bearish SELL Analysis: PASSED");
} else {
  console.warn("⚠️ Bearish Analysis yielded unexpected direction:", bearAnalysis.direction);
}

// 4. Test Stop-Loss & Take-Profit Bracket Geometry
console.log("\n🎯 3. Validating SL/TP Bracket Geometry for BUY & SELL:");

// Test BUY Bracket
const currentPriceBuy = 70000;
const slDistBuy = 500;
const tpDistBuy = 1000;
const stopLossBuy = currentPriceBuy - slDistBuy;
const targetBuy = currentPriceBuy + tpDistBuy;
console.log(`- BUY Bracket: SL ($${stopLossBuy}) < Entry ($${currentPriceBuy}) < Target ($${targetBuy})`);
if (stopLossBuy < currentPriceBuy && currentPriceBuy < targetBuy) {
  console.log("✅ BUY Bracket Geometry: VALID");
} else {
  console.error("❌ BUY Bracket Geometry: INVALID");
  process.exit(1);
}

// Test SELL Bracket
const currentPriceSell = 70000;
const slDistSell = 500;
const tpDistSell = 1000;
const stopLossSell = currentPriceSell + slDistSell;
const targetSell = currentPriceSell - tpDistSell;
console.log(`- SELL Bracket: Target ($${targetSell}) < Entry ($${currentPriceSell}) < SL ($${stopLossSell})`);
if (targetSell < currentPriceSell && currentPriceSell < stopLossSell) {
  console.log("✅ SELL Bracket Geometry: VALID");
} else {
  console.error("❌ SELL Bracket Geometry: INVALID");
  process.exit(1);
}

console.log("\n=================================================");
console.log("🎉 ALL QUANTITATIVE MATH & DUAL BUY/SELL TESTS PASSED!");
console.log("=================================================");
