import { deltaAutoTraderEngine, CURATED_AUTO_TRADER_ASSETS } from "../lib/deltaAutoTraderEngine";

async function main() {
  console.log("Analyzing all 10 assets with latest trend engine:\n");
  for (const asset of CURATED_AUTO_TRADER_ASSETS) {
    try {
      const [c15, c1h, c4h] = await Promise.all([
        (deltaAutoTraderEngine as any).fetchCryptoCandles(asset.symbol, "15m", 30),
        (deltaAutoTraderEngine as any).fetchCryptoCandles(asset.symbol, "1h", 30),
        (deltaAutoTraderEngine as any).fetchCryptoCandles(asset.symbol, "4h", 30)
      ]);
      const analysis = deltaAutoTraderEngine.analyzeMultiTimeframe(asset.symbol, c15, c1h, c4h);
      console.log(`[${asset.symbol}] Score: ${analysis.overallScore}/100 | Dir: ${analysis.direction} | 4H: ${analysis.fourHourTrend} | 1H RSI: ${analysis.rsi1h?.toFixed(1)} | 15m Trigger: ${analysis.fifteenMinTrigger}`);
    } catch (e) {
      console.error(`Error analyzing ${asset.symbol}:`, e);
    }
  }
}

main().catch(console.error);
