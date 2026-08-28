import dotenv from "dotenv";
dotenv.config();

import { deltaAutoTraderEngine } from "../lib/deltaAutoTraderEngine";
import { deltaExchangeEngine } from "../lib/deltaExchangeEngine";

async function main() {
  console.log("=================================================");
  console.log("📊 LIVE PROFIT & LOSS AUDIT FOR AUTO-TRADER POSITIONS");
  console.log("=================================================");

  await deltaExchangeEngine.initialize();
  const state = deltaAutoTraderEngine.getLiveFullState();

  console.log(`\n💼 Account Capital: $${state.settings.currentCapitalUSD} USD (Mode: ${state.settings.mode})`);
  console.log(`Open Positions Count: ${state.openPositions.length}`);
  console.log(`Closed Trades Count: ${state.closedRecords.length}`);

  let totalUnrealizedUSD = 0;
  let totalUnrealizedINR = 0;
  const inrRate = 95.37;

  console.log("\n-------------------------------------------------");
  console.log("📍 ACTIVE OPEN POSITIONS P&L:");
  console.log("-------------------------------------------------");

  for (const pos of state.openPositions) {
    const ticker = await deltaExchangeEngine.fetchTicker(pos.symbol);
    const livePrice = parseFloat(ticker?.mark_price || ticker?.close || String(pos.currentPrice));
    
    // Update live prices in engine
    deltaAutoTraderEngine.updateLivePriceAndCheckExits(pos.symbol, livePrice);

    const priceDiff = pos.type === "BUY" ? (livePrice - pos.entryPrice) : (pos.entryPrice - livePrice);
    const posPnLUSD = priceDiff * pos.quantity;
    const posPnLPct = (priceDiff / pos.entryPrice) * 100;
    const posPnLINR = posPnLUSD * inrRate;

    totalUnrealizedUSD += posPnLUSD;
    totalUnrealizedINR += posPnLINR;

    console.log(`\n🔹 [${pos.symbol}] ${pos.type} Position (ID: ${pos.id}):`);
    console.log(`   - Entry Price: $${pos.entryPrice.toLocaleString()} USD`);
    console.log(`   - Current Live Price: $${livePrice.toLocaleString()} USD`);
    console.log(`   - Quantity: ${pos.quantity} (${pos.symbol})`);
    console.log(`   - Stop Loss: $${pos.stopLossPrice.toLocaleString()} | Target: $${pos.targetPrice.toLocaleString()}`);
    console.log(`   - Confidence Score: ${pos.confidenceScore}/100 (EV: $${pos.entryEVUSD || 0} USD)`);
    console.log(`   - Unrealized P&L (USD): ${posPnLUSD >= 0 ? '+' : ''}$${posPnLUSD.toFixed(4)} USD (${posPnLPct.toFixed(2)}%)`);
    console.log(`   - Unrealized P&L (INR): ${posPnLINR >= 0 ? '+' : ''}₹${posPnLINR.toFixed(2)} INR`);
  }

  console.log("\n=================================================");
  console.log(`📈 TOTAL CURRENT OPEN PROFIT/LOSS:`);
  console.log(`   Total PnL in USD: ${totalUnrealizedUSD >= 0 ? '+' : ''}$${totalUnrealizedUSD.toFixed(4)} USD`);
  console.log(`   Total PnL in INR: ${totalUnrealizedINR >= 0 ? '+' : ''}₹${totalUnrealizedINR.toFixed(2)} INR`);
  console.log("=================================================");
}

main().catch(console.error);
