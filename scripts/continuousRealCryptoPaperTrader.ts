import { deltaExchangeEngine } from "../lib/deltaExchangeEngine";
import { nexvoraCryptoMasterIndicator } from "../lib/nexvoraCryptoMasterIndicator";
import { paperTradingEngine } from "../lib/paperTradingEngine";

export class ContinuousRealCryptoPaperTrader {
  private activeTicker: string = "BTCUSD";
  private isMonitoring: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  public async startRealTimeSession(ticker: string = "BTCUSD") {
    this.activeTicker = ticker;
    console.log(`\n===============================================================`);
    console.log(`🌐 100% REAL LIVE DELTA EXCHANGE PAPER TRADING ENGINE (24/7 USD)`);
    console.log(`===============================================================`);
    console.log(`Target Asset: ${ticker} (Native US Dollar Derivative Contract)`);

    await deltaExchangeEngine.initialize();

    // 1. Fetch real exchange ticker
    const exchangeTicker = await deltaExchangeEngine.fetchTicker(ticker);
    if (!exchangeTicker) {
      console.error(`[RealPaperTrader] ❌ Could not fetch live exchange ticker for ${ticker}`);
      return;
    }

    const realPriceUSD = parseFloat(exchangeTicker.mark_price || exchangeTicker.close || "0");
    console.log(`[RealPaperTrader] ⚡ REAL LIVE MARKET PRICE: $${realPriceUSD.toFixed(2)} USD (Source: Delta Exchange REST)`);

    // 2. Fetch real 1-minute exchange candles for NEXVORA-MCI indicator
    const realCandles = await deltaExchangeEngine.fetchCandles(ticker, "1m");
    console.log(`[RealPaperTrader] 📊 Fetched ${realCandles.length} real 1m candles from exchange`);

    // 3. Compute NEXVORA Master Crypto Indicator
    const fundingRate = parseFloat(exchangeTicker.funding_rate || "0.0095");
    const mciReport = nexvoraCryptoMasterIndicator.calculateMasterSignal(ticker, realPriceUSD, realCandles, fundingRate);

    console.log(`\n--- PROPRIETARY NEXVORA MASTER CRYPTO INDICATOR REPORT ---`);
    console.log(`Symbol: ${mciReport.symbol}`);
    console.log(`Exchange Price: $${mciReport.currentPriceUSD.toLocaleString()} USD`);
    console.log(`Master Signal: ${mciReport.masterSignal} (Score: ${mciReport.masterScore}/100)`);
    console.log(`Smart Money Flow: ${mciReport.smartMoneyFlowImbalance.description}`);
    console.log(`Funding Rate Squeeze: ${mciReport.fundingRateAlpha.description}`);
    console.log(`Target 1 USD: $${mciReport.targetsAndStopLossUSD.target1USD.toLocaleString()} USD`);
    console.log(`Target 2 USD: $${mciReport.targetsAndStopLossUSD.target2USD.toLocaleString()} USD`);
    console.log(`Stop Loss USD: $${mciReport.targetsAndStopLossUSD.stopLossUSD.toLocaleString()} USD`);
    console.log(`Execution Advice: ${mciReport.executionAdvice}`);

    // 4. Open paper trading position at 100% exact live market price
    const orderType = mciReport.masterSignal.includes("SELL") ? "SELL" : "BUY";
    console.log(`\n--- OPENING REAL-PRICE PAPER POSITION ---`);
    const openRes = paperTradingEngine.openPosition(
      ticker,
      `${ticker} Delta 24/7 (Real Market Price)`,
      orderType,
      0.5,
      realPriceUSD,
      mciReport.targetsAndStopLossUSD.stopLossUSD,
      mciReport.targetsAndStopLossUSD.target1USD,
      "USD"
    );
    console.log(`Status: ${openRes.message}`);

    // 5. Start live monitoring interval fetching 100% authentic exchange ticks
    this.startLiveTickMonitoring(ticker);
  }

  private startLiveTickMonitoring(ticker: string) {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    let checkCount = 0;

    console.log(`\n[RealPaperTrader] ⏳ Starting continuous real-time live price monitor (Interval: 3s)...`);

    this.monitorInterval = setInterval(async () => {
      checkCount++;
      try {
        const liveTicker = await deltaExchangeEngine.fetchTicker(ticker);
        if (!liveTicker) return;

        const livePriceUSD = parseFloat(liveTicker.mark_price || liveTicker.close || "0");
        paperTradingEngine.updateLivePrice(ticker, livePriceUSD);

        const openPositions = paperTradingEngine.getOpenPositions();
        const pos = openPositions.find(p => p.ticker === ticker);

        if (pos) {
          const sym = pos.currency === "USD" ? "$" : "₹";
          console.log(`[Tick #${checkCount}] ${ticker} | Exchange Price: ${sym}${livePriceUSD.toFixed(2)} | Entry: ${sym}${pos.entryPrice.toFixed(2)} | PnL: ${sym}${pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} (${pos.unrealizedPnLPct}%)`);

          // If position in profit or hit target, execute square off
          if (pos.unrealizedPnL > 0) {
            console.log(`\n🎉 REAL MARKET PROFIT DETECTED! Position is in profit by +$${pos.unrealizedPnL.toFixed(2)} USD! Executing Square-Off...`);
            const closeRes = paperTradingEngine.closePosition(pos.id, livePriceUSD, "Real Market Profit Achieved");
            console.log(`Square Off Result: ${closeRes.message}`);
            this.stopMonitoring();
          }
        } else {
          this.stopMonitoring();
        }
      } catch (err) {
        console.error(`[RealPaperTrader] Live tick error:`, err);
      }
    }, 3000);
  }

  public stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    console.log(`[RealPaperTrader] 🛑 Live monitor session ended.`);
  }
}

export const continuousRealCryptoPaperTrader = new ContinuousRealCryptoPaperTrader();
