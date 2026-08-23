import dotenv from "dotenv";
dotenv.config();

import { deltaExchangeEngine } from "../lib/deltaExchangeEngine";

async function main() {
  console.log("=================================================");
  console.log("🚀 TESTING REAL DELTA EXCHANGE INDIA LIVE ORDER");
  console.log("=================================================");

  const key = deltaExchangeEngine.getApiKey();
  const secret = deltaExchangeEngine.getApiSecret();
  console.log("API Key loaded:", key ? `${key.slice(0, 8)}...` : "NONE");

  // Place 1 contract live market order on BTCUSD with Stop Loss and Take Profit attached
  console.log("\nPlacing 1 contract BUY order on BTCUSD...");
  const orderRes = await deltaExchangeEngine.placeOrder(
    "BTCUSD",
    "buy",
    0.001, // 1 contract
    undefined, // market order
    75000, // SL
    80000 // TP
  );

  console.log("\nOrder Response from Delta Exchange:", JSON.stringify(orderRes, null, 2));

  // Check live open positions
  const positions = await deltaExchangeEngine.fetchLivePositions();
  console.log("\nOpen Positions on Delta Exchange:", JSON.stringify(positions, null, 2));

  // Close position if filled
  if (positions.length > 0) {
    console.log("\nClosing live test position...");
    const closeRes = await deltaExchangeEngine.placeOrder("BTCUSD", "sell", 0.001);
    console.log("Close order response:", JSON.stringify(closeRes, null, 2));
  }
}

main().catch(console.error);
