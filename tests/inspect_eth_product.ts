import dotenv from "dotenv";
dotenv.config();

import { deltaExchangeEngine } from "../lib/deltaExchangeEngine";

async function main() {
  await deltaExchangeEngine.fetchProducts();
  const eth = (deltaExchangeEngine as any).products.get("ETHUSD");
  console.log("ETHUSD Product on Delta Exchange:", {
    id: eth?.id,
    symbol: eth?.symbol,
    contract_value: eth?.contract_value,
    tick_size: eth?.tick_size,
    initial_margin: eth?.initial_margin,
    default_leverage: eth?.default_leverage
  });
}

main().catch(console.error);
