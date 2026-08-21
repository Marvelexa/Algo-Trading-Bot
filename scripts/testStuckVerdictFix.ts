import { stockResearchEngine } from "../lib/stockEngine";
import { aiTradingBrainEngine, MarketBar } from "../lib/aiTradingBrainV1";
import * as crypto from "crypto";

async function testStuckVerdictFix() {
  console.log("=========================================================================");
  console.log("   STEP 1: PROVING STUCK VERDICT BUG FIX & DYNAMICS ACROSS 4 SYMBOLS     ");
  console.log("=========================================================================\n");

  const testSymbols = ["ETHUSD", "BTCUSD", "RELIANCE", "WIPRO"];
  const reasoningHashes: Record<string, string> = {};
  const reasoningTexts: Record<string, string> = {};
  const actions: Record<string, string> = {};

  for (const sym of testSymbols) {
    const isCrypto = sym.includes("USD");
    const rec = await stockResearchEngine.analyzeStock(sym, true, "SWING_TRADER");
    
    // Compute MD5 hash of reasoning text
    const textToHash = (rec.reasoning || rec.technicalAnalysis.summary || "");
    const textHash = crypto.createHash("md5").update(textToHash).digest("hex");
    
    reasoningHashes[sym] = textHash;
    reasoningTexts[sym] = textToHash;
    actions[sym] = rec.suggestedAction;

    console.log(`\n[${sym}]`);
    console.log(`  Live Price: ${isCrypto ? "$" : "₹"}${rec.currentPrice}`);
    console.log(`  Technical Signal: ${rec.technicalAnalysis.signal} (${rec.technicalAnalysis.confidence}%)`);
    console.log(`  Fundamental Signal: ${rec.fundamentalAnalysis.signal}`);
    console.log(`  News Sentiment: ${rec.newsAnalysis.signal}`);
    console.log(`  Overall Action: ${rec.suggestedAction} (${rec.confidenceScore}%)`);
    console.log(`  Reasoning Hash: ${textHash}`);
  }

  console.log("\n-------------------------------------------------------------------------");
  console.log(" VERDICT & REASONING DIVERSITY VERIFICATION");
  console.log("-------------------------------------------------------------------------");

  const uniqueHashes = new Set(Object.values(reasoningHashes));
  const uniqueActions = new Set(Object.values(actions));

  console.log(`Total Symbols Tested: ${testSymbols.length}`);
  console.log(`Unique Actions Count: ${uniqueActions.size} -> [${Array.from(uniqueActions).join(", ")}]`);
  console.log(`Unique Reasoning Hashes Count: ${uniqueHashes.size} / ${testSymbols.length}`);

  if (uniqueHashes.size === testSymbols.length) {
    console.log("✅ [PASS] 100% Unique Reasoning Strings generated per symbol — No static/canned text stuck bug!");
  } else {
    console.warn("⚠️ [WARN] Some reasoning strings are identical across symbols!");
  }

  // ────── TEST 2: SYNTHETIC CANDLE SEQUENCE DIVERSITY ──────
  console.log("\n[STEP 2: Synthetic Candle Sequence Evaluation]");

  // 1. Bullish Candle Sequence (Higher Highs / Higher Lows)
  const bullishBars: MarketBar[] = [];
  let price = 100;
  for (let i = 0; i < 50; i++) {
    const low = price;
    const high = price + 3;
    const close = price + 2.5;
    bullishBars.push({
      time: new Date(Date.now() - (50 - i) * 60000).toISOString(),
      open: price,
      high,
      low,
      close,
      volume: 15000 + i * 200
    });
    price += 1.5;
  }

  // 2. Bearish Candle Sequence (Lower Highs / Lower Lows)
  const bearishBars: MarketBar[] = [];
  price = 200;
  for (let i = 0; i < 50; i++) {
    const low = price - 3;
    const high = price;
    const close = price - 2.5;
    bearishBars.push({
      time: new Date(Date.now() - (50 - i) * 60000).toISOString(),
      open: price,
      high,
      low,
      close,
      volume: 25000 + i * 300
    });
    price -= 1.5;
  }

  // 3. Flat / Ranging Sequence
  const flatBars: MarketBar[] = [];
  price = 150;
  for (let i = 0; i < 50; i++) {
    const offset = (i % 2 === 0 ? 0.5 : -0.5);
    flatBars.push({
      time: new Date(Date.now() - (50 - i) * 60000).toISOString(),
      open: price,
      high: price + 1,
      low: price - 1,
      close: price + offset,
      volume: 5000
    });
  }

  const bullResult = aiTradingBrainEngine.analyze("BULL_TEST", 175, bullishBars);
  const bearResult = aiTradingBrainEngine.analyze("BEAR_TEST", 125, bearishBars);
  const flatResult = aiTradingBrainEngine.analyze("FLAT_TEST", 150, flatBars);

  console.log(`\nBullish Sequence Verdict: ${bullResult.action} (Prob: ${bullResult.probabilityPct}%)`);
  console.log(`Bearish Sequence Verdict: ${bearResult.action} (Prob: ${bearResult.probabilityPct}%)`);
  console.log(`Flat/Range Sequence Verdict: ${flatResult.action} (Prob: ${flatResult.probabilityPct}%)`);

  if (bullResult.action.includes("BUY") && bearResult.action.includes("SELL") && flatResult.action === "HOLD") {
    console.log("✅ [PASS] AI Engine accurately produces BUY on uptrend, SELL on downtrend, and HOLD on range!");
  } else {
    console.warn("⚠️ Engine response sequence needs calibration.");
  }
}

testStuckVerdictFix();
