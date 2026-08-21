import { stockResearchEngine } from "../lib/stockEngine";
import { indianTechnicalIndicatorsEngine } from "../lib/indianTechnicalIndicatorsEngine";
import { nexvoraCryptoMasterIndicator } from "../lib/nexvoraCryptoMasterIndicator";
import { paperTradingEngine } from "../lib/paperTradingEngine";
import { deltaExchangeEngine } from "../lib/deltaExchangeEngine";
import { brokerTickEngine } from "../lib/brokerTickEngine";
import { angelOneSmartApiEngine } from "../lib/angelOneSmartApiEngine";

export async function runMasterSystemAudit() {
  console.log(`===============================================================`);
  console.log(`🛡️ NEXVORA AI TRADING SYSTEM - FULL MASTER SYSTEM AUDIT & TEST`);
  console.log(`===============================================================`);

  let passedTests = 0;
  let failedTests = 0;

  function assertTest(name: string, condition: boolean, details: string = "") {
    if (condition) {
      console.log(`✅ [PASS] ${name} ${details}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details}`);
      failedTests++;
    }
  }

  // 1. Angel One SmartAPI Engine Audit
  console.log(`\n--- 1. ANGEL ONE SMARTAPI ENGINE AUDIT ---`);
  try {
    const relToken = angelOneSmartApiEngine.getToken("RELIANCE");
    assertTest("Angel One Token Lookup (RELIANCE)", relToken === "2885", `Token: ${relToken}`);
    
    const infyToken = angelOneSmartApiEngine.getToken("INFY");
    assertTest("Angel One Token Lookup (INFY)", infyToken === "1594", `Token: ${infyToken}`);
  } catch (e: any) {
    assertTest("Angel One Engine Exception", false, e.message);
  }

  // 2. Delta Exchange Engine Audit
  console.log(`\n--- 2. DELTA EXCHANGE CRYPTO ENGINE AUDIT ---`);
  try {
    await deltaExchangeEngine.initialize();
    const btcTicker = await deltaExchangeEngine.fetchTicker("BTCUSD");
    const isTickerValid = btcTicker !== null && parseFloat(btcTicker.mark_price || "0") > 10000;
    assertTest("Delta Exchange Live Ticker (BTCUSD)", isTickerValid, `Mark Price: $${btcTicker?.mark_price} USD`);

    const btcCandles = await deltaExchangeEngine.fetchCandles("BTCUSD", "1m");
    assertTest("Delta Exchange Live Candles (BTCUSD)", btcCandles.length > 0, `Count: ${btcCandles.length}`);
  } catch (e: any) {
    assertTest("Delta Exchange Engine Exception", false, e.message);
  }

  // 3. Indian Technical Indicators Master Suite Audit (15 Modules)
  console.log(`\n--- 3. TECHNICAL INDICATORS MASTER SUITE AUDIT (15 MODULES) ---`);
  try {
    const dummyBars = Array.from({ length: 55 }, (_, i) => ({
      time: i,
      open: 1200 + i * 2,
      high: 1205 + i * 2,
      low: 1195 + i * 2,
      close: 1202 + i * 2,
      volume: 50000 + i * 1000
    }));

    const report = indianTechnicalIndicatorsEngine.generateFullReport(dummyBars, 1310, "SWING_TRADER");
    assertTest("Triple Confirmation Status", !!report.tripleConfirmation, report.tripleConfirmation.status);
    assertTest("Smart Money Concepts (SMC)", !!report.smc, report.smc.signalDescription);
    assertTest("Volume Profile POC", !!report.volumeProfile, `POC: ${report.volumeProfile.pocPrice}`);
    assertTest("Options Analytics Max Pain", !!report.optionsAnalytics, `Max Pain: ${report.optionsAnalytics.estimatedMaxPainStrike}`);
    assertTest("Harmonic Pattern Scan", !!report.harmonicPattern, report.harmonicPattern.signalDescription);
    assertTest("Elliott Wave Principle", !!report.elliottWave, report.elliottWave.signalDescription);
    assertTest("Donchian Channels", !!report.donchianChannel, report.donchianChannel.signalDescription);
    assertTest("Ichimoku Kinko Hyo Cloud", !!report.ichimokuCloud, report.ichimokuCloud.signalDescription);
    assertTest("ATR Volatility Stop Loss", !!report.atrStopLoss, `SL: ${report.atrStopLoss.recommendedBuyStopLoss}`);
  } catch (e: any) {
    assertTest("Technical Indicators Engine Exception", false, e.message);
  }

  // 4. Proprietary Nexvora Master Crypto Indicator (NEXVORA-MCI) Audit
  console.log(`\n--- 4. PROPRIETARY NEXVORA MASTER CRYPTO INDICATOR AUDIT ---`);
  try {
    const dummyCryptoBars = [
      { time: 1, open: 64000, high: 64500, low: 63900, close: 64450, volume: 150 },
      { time: 2, open: 64450, high: 64800, low: 64300, close: 64750, volume: 210 },
      { time: 3, open: 64750, high: 65200, low: 64600, close: 65100, volume: 340 }
    ];
    const mci = nexvoraCryptoMasterIndicator.calculateMasterSignal("BTCUSD", 65100, dummyCryptoBars, -0.012);
    assertTest("NEXVORA-MCI Signal Output", !!mci.masterSignal, `Signal: ${mci.masterSignal} (${mci.masterScore}/100)`);
    assertTest("NEXVORA-MCI Target 1 USD", mci.targetsAndStopLossUSD.target1USD > 65100, `Target 1: $${mci.targetsAndStopLossUSD.target1USD} USD`);
    assertTest("NEXVORA-MCI Stop Loss USD", mci.targetsAndStopLossUSD.stopLossUSD < 65100, `Stop Loss: $${mci.targetsAndStopLossUSD.stopLossUSD} USD`);
  } catch (e: any) {
    assertTest("Nexvora-MCI Engine Exception", false, e.message);
  }

  // 5. Paper Trading & Virtual Portfolio Engine Audit
  console.log(`\n--- 5. PAPER TRADING & VIRTUAL PORTFOLIO ENGINE AUDIT ---`);
  try {
    const openRes = paperTradingEngine.openPosition("BTCUSD", "Bitcoin Delta 24/7 Test", "BUY", 0.1, 64000, 63000, 66000, "USD");
    assertTest("Paper Order Execution", openRes.success, openRes.message);

    paperTradingEngine.updateLivePrice("BTCUSD", 65500);
    const positions = paperTradingEngine.getOpenPositions();
    const pos = positions.find(p => p.ticker === "BTCUSD");
    assertTest("Paper Position Live Price Update", pos?.currentPrice === 65500, `Current Price: $${pos?.currentPrice} USD`);
    assertTest("Paper Position Unrealized PnL Calculation", pos !== undefined && pos.unrealizedPnL > 0, `PnL: +$${pos?.unrealizedPnL} USD`);

    if (pos) {
      const closeRes = paperTradingEngine.closePosition(pos.id, 65500, "System Audit Test Close");
      assertTest("Paper Position Square Off", closeRes.success, closeRes.message);
    }
  } catch (e: any) {
    assertTest("Paper Trading Engine Exception", false, e.message);
  }

  // 6. Stock Research & AI Synthesis Engine Audit (RELIANCE + BTCUSD)
  console.log(`\n--- 6. STOCK RESEARCH & AI SYNTHESIS ENGINE AUDIT ---`);
  try {
    const relAnalysis = await stockResearchEngine.analyzeStock("RELIANCE", true, "SWING_TRADER");
    assertTest("Reliance Stock Analysis Execution", !!relAnalysis.company && relAnalysis.currentPrice > 0, `Price: ₹${relAnalysis.currentPrice}`);

    const btcAnalysis = await stockResearchEngine.analyzeStock("BTCUSD", true, "SWING_TRADER");
    assertTest("BTCUSD Crypto Analysis Execution", !!btcAnalysis.company && btcAnalysis.currentPrice > 0, `Price: $${btcAnalysis.currentPrice} USD`);
  } catch (e: any) {
    assertTest("Stock Research Engine Exception", false, e.message);
  }

  console.log(`\n===============================================================`);
  console.log(`📊 MASTER SYSTEM AUDIT SUMMARY:`);
  console.log(`Total Tests Run: ${passedTests + failedTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`===============================================================`);
}

runMasterSystemAudit().catch(console.error);
