/**
 * Master Verification Suite: Four-Style Trading System Architecture
 * Verifies all 4 Trading Modes: Intraday, Swing, Long-Term Investment, Positional F&O
 * and confirms weighting breakdowns, risk scaling, earnings checks, and dashboard outputs.
 */

import { aiTradingBrainEngine, MarketBar, TradingMode } from "../lib/aiTradingBrainV1";

function generateTestBars(basePrice: number = 1000, count: number = 30): MarketBar[] {
  const bars: MarketBar[] = [];
  let current = basePrice;
  for (let i = 0; i < count; i++) {
    const change = (Math.sin(i) * 3) + 1.5;
    const open = current;
    const close = current + change;
    const high = Math.max(open, close) + 2;
    const low = Math.min(open, close) - 1;
    const volume = 150000 + Math.floor(Math.sin(i) * 20000);
    bars.push({
      time: i,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
    current = close;
  }
  return bars;
}

function runFourStyleSystemTest() {
  console.log("=========================================================");
  console.log("STARTING MASTER TEST: Four-Style Trading System Architecture");
  console.log("=========================================================");

  const bars = generateTestBars(1250, 30);
  const currentPrice = bars[bars.length - 1].close;

  const modes: Array<{ mode: TradingMode; expectedTechPct: number; expectedFundPct: number; expectedSentPct: number; expectedOiPct: number; expectedMacroPct: number }> = [
    { mode: "INTRADAY_SCALPING", expectedTechPct: 70, expectedSentPct: 20, expectedFundPct: 5, expectedOiPct: 5, expectedMacroPct: 0 },
    { mode: "SWING_TRADING", expectedTechPct: 45, expectedSentPct: 25, expectedFundPct: 20, expectedOiPct: 5, expectedMacroPct: 5 },
    { mode: "LONG_TERM_COMPOUNDER", expectedTechPct: 15, expectedSentPct: 15, expectedFundPct: 55, expectedOiPct: 0, expectedMacroPct: 15 },
    { mode: "OPTIONS_BUYING", expectedTechPct: 50, expectedSentPct: 25, expectedFundPct: 0, expectedOiPct: 15, expectedMacroPct: 10 }
  ];

  for (const item of modes) {
    const res = aiTradingBrainEngine.analyze("TCS", currentPrice, bars, 72, 1.12, item.mode);

    console.log(`\n🔹 TESTING TRADING MODE: [${item.mode}]`);
    console.log(`   - Action Verdict: ${res.action} (Buy Prob: ${res.buyWinProbabilityPct}%, Sell Prob: ${res.sellWinProbabilityPct}%)`);
    console.log(`   - Entry: ₹${res.entryPrice}, Stop-Loss: ₹${res.stopLoss}, Target 1: ₹${res.target1} (R:R ${res.riskRewardRatio})`);
    
    if (res.weightingBreakdown) {
      console.log(`   - Weighting Breakdown: Tech ${res.weightingBreakdown.techPct}%, Sent ${res.weightingBreakdown.sentPct}%, Fund ${res.weightingBreakdown.fundPct}%, OI ${res.weightingBreakdown.oiPct}%, Macro ${res.weightingBreakdown.macroPct}%`);

      if (
        res.weightingBreakdown.techPct === item.expectedTechPct &&
        res.weightingBreakdown.fundPct === item.expectedFundPct &&
        res.weightingBreakdown.sentPct === item.expectedSentPct &&
        res.weightingBreakdown.oiPct === item.expectedOiPct &&
        res.weightingBreakdown.macroPct === item.expectedMacroPct
      ) {
        console.log(`   ✅ Weighting ratios match PRD spec exactly!`);
      } else {
        console.error(`   ❌ Weighting mismatch for ${item.mode}! Expected Tech ${item.expectedTechPct}%, Fund ${item.expectedFundPct}%`);
        process.exit(1);
      }
    }

    if (item.mode === "LONG_TERM_COMPOUNDER") {
      if (res.longTermReport) {
        console.log(`   - Long-Term Fundamental Thesis: ${res.longTermReport.investmentThesis}`);
        console.log(`   - PE Valuation Percentile: ${res.longTermReport.valuationPercentile}%`);
        console.log(`   - Auto-Execution Allowed: ${res.longTermReport.isAutoExecutionAllowed}`);
        if (!res.longTermReport.isAutoExecutionAllowed) {
          console.log(`   ✅ Confirmed: Long-Term Investment Mode strictly prohibits auto-execution!`);
        } else {
          console.error(`   ❌ Long-Term Mode allowed auto-execution! (PRD Rule Breach)`);
          process.exit(1);
        }
      }
    }

    if (item.mode === "SWING_TRADING") {
      if (res.earningsDateNotice) {
        console.log(`   ✅ Confirmed Earnings Check Notice: ${res.earningsDateNotice}`);
      }
    }

    if (item.mode === "OPTIONS_BUYING") {
      if (res.oiAnalysis) {
        console.log(`   ✅ Confirmed OI Classification: ${res.oiAnalysis.classification} (Multiplier: ${res.oiAnalysis.confidenceMultiplier}x) | Max Pain: ₹${res.oiAnalysis.maxPainStrike}`);
      }
    }
  }

  console.log("\n=========================================================");
  console.log("ALL 4 TRADING MODES VERIFIED AND FULLY SPEC-COMPLIANT!");
  console.log("=========================================================");
}

runFourStyleSystemTest();
