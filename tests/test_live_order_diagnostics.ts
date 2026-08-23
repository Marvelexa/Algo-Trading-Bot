import dotenv from "dotenv";
dotenv.config();

import { deltaExchangeEngine } from "../lib/deltaExchangeEngine";
import { deltaAutoTraderEngine } from "../lib/deltaAutoTraderEngine";

async function main() {
  console.log("=================================================");
  console.log("🔍 DELTA EXCHANGE INDIA LIVE ORDER DIAGNOSTICS");
  console.log("=================================================");

  const rawKey = process.env.DELTA_EXCHANGE_API_KEY || process.env.VITE_DELTA_EXCHANGE_API_KEY || "";
  const rawSecret = process.env.DELTA_EXCHANGE_API_SECRET || process.env.VITE_DELTA_EXCHANGE_API_SECRET || "";

  console.log("Raw from .env:");
  console.log("Key:", rawKey);
  console.log("Secret length:", rawSecret.length);

  deltaExchangeEngine.setCredentials(rawKey, rawSecret);

  console.log("1. Checking API Key loaded:");
  console.log("   API Key:", (deltaExchangeEngine as any).apiKey ? `${(deltaExchangeEngine as any).apiKey.slice(0, 8)}...` : "NONE");
  console.log("   AutoTrader Mode:", deltaAutoTraderEngine.getSettings().mode);

  // 2. Fetch Wallet Balances
  try {
    const path = "/v2/wallet/balances";
    const headers = (deltaExchangeEngine as any).getAuthHeaders("GET", path, "");
    console.log("Request Headers:", headers);
    const res = await fetch(`https://api.india.delta.exchange${path}`, { headers });
    const balanceData = await res.json();
    console.log("\n2. Wallet Balances Response:", JSON.stringify(balanceData, null, 2));
  } catch (e) {
    console.error("Wallet balance error:", e);
  }

  // 3. Fetch Live Products count
  await deltaExchangeEngine.fetchProducts();
  console.log("\n3. Loaded Products:", (deltaExchangeEngine as any).products.size);
}

main().catch(console.error);
