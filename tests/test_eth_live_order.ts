import dotenv from "dotenv";
dotenv.config();

import { deltaExchangeEngine } from "../lib/deltaExchangeEngine";

async function main() {
  console.log("Placing live test order on ETHUSD...");
  const res = await deltaExchangeEngine.placeOrder(
    "ETHUSD",
    "buy",
    0.01, // 1 contract
    undefined,
    2350,
    2550
  );
  console.log("ETHUSD Live Order Result:", JSON.stringify(res, null, 2));

  // Check positions
  const pos = await deltaExchangeEngine.fetchLivePositions();
  console.log("Open positions after order:", JSON.stringify(pos, null, 2));

  if (pos.length > 0) {
    console.log("Closing test position...");
    const closeRes = await deltaExchangeEngine.placeOrder("ETHUSD", "sell", 0.01);
    console.log("Close result:", JSON.stringify(closeRes, null, 2));
  }
}

main().catch(console.error);
