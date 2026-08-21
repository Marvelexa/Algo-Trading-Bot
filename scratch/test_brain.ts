import { stockResearchEngine } from '../lib/stockEngine';
import { aiTradingBrainEngine } from '../lib/aiTradingBrainV1';

async function testSubScores() {
  const tickers = ['RELIANCE', 'BTCUSD', 'ETHUSD', 'TCS', 'INFY'];

  for (const sym of tickers) {
    const rec = await stockResearchEngine.analyzeStock(sym, true, 'SWING_TRADER');
    const brain = aiTradingBrainEngine.analyze(sym, rec.currentPrice, rec.bars || []);
    
    console.log('\n--- ' + sym + ' ---');
    console.log('Bars Count:', rec.bars?.length);
    console.log('MTF ConfluenceScore:', brain.mtf.confluenceScore);
    console.log('Al Brooks PressureScore:', brain.alBrooks.pressureScore);
    console.log('Al Brooks Regime:', brain.alBrooks.marketRegime);
    console.log('SMC Score:', brain.smc.smcScore);
    console.log('VSA Score:', brain.vsa.vsaScore);
    console.log('TrendStrengthPct:', brain.trendStrengthPct);
    console.log('Action:', brain.action);
  }
}

testSubScores();
