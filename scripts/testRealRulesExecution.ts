import { knowledgeBaseEngine } from "../lib/knowledgeBase.js";

const results = knowledgeBaseEngine.evaluateRules({
  symbol: "NIFTY50",
  ticker: "NIFTY50",
  currentPrice: 24500,
  peRatio: 22,
  debtToEquity: 0.35,
  yoyRevenueGrowthPct: 18.4,
  netMarginPct: 19.5,
  rsi: 52,
  ema20: 24400,
  ema50: 24200,
  supportLevel: 24300,
  resistanceLevel: 24800
});

console.log("=========================================================");
console.log("REAL RULES EXECUTION RESULTS:");
results.forEach(r => {
  console.log(`${r.passed ? "✅ [PASS]" : "❌ [FAIL]"} ${r.ruleName} -> ${r.metricValue}`);
});
console.log("=========================================================");
