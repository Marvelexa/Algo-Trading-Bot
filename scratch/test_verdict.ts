import { stockResearchEngine } from '../lib/stockEngine';
import { aiTradingBrainEngine } from '../lib/aiTradingBrainV1';

async function verifyFix() {
  console.log('===============================================================');
  console.log('   STEP 4 & 5: DYNAMIC VERDICT & REGRESSION VERIFICATION TEST  ');
  console.log('===============================================================');

  const tickers = ['RELIANCE', 'BTCUSD', 'ETHUSD', 'TCS', 'INFY'];

  for (const sym of tickers) {
    const rec = await stockResearchEngine.analyzeStock(sym, true, 'SWING_TRADER');
    const brain = aiTradingBrainEngine.analyze(sym, rec.currentPrice, rec.bars || []);
    
    console.log('\nTicker: ' + sym);
    console.log('  Live Price: ' + (rec.currency === 'USD' ? '$' : '₹') + rec.currentPrice);
    console.log('  stockEngine Action: ' + rec.suggestedAction + ' (Overall Score: ' + rec.overallScore + ', Conf: ' + rec.confidenceScore + '%)');
    console.log('  aiTradingBrainV1 Action: ' + brain.action + ' (Trend Strength: ' + brain.trendStrengthPct + '%)');
  }
}

verifyFix();
