import fs from "fs";
import path from "path";

const SCRIP_MASTER_CACHE_PATH = path.resolve(process.cwd(), ".scrip_master.json");
const SCRIP_MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

async function main() {
  console.log("📥 Downloading fresh official Scrip Master from Angel One...");
  const res = await fetch(SCRIP_MASTER_URL);
  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
  }
  const items = await res.json();
  console.log(`✅ Successfully downloaded ${items.length} items from Angel One!`);

  // Write file
  fs.writeFileSync(SCRIP_MASTER_CACHE_PATH, JSON.stringify(items), "utf-8");
  console.log(`💾 Persisted ${items.length} items to ${SCRIP_MASTER_CACHE_PATH}`);

  // Test token lookups
  const sbin = items.find((x: any) => x.symbol === "SBIN-EQ");
  const icici = items.find((x: any) => x.symbol === "ICICIBANK-EQ");
  const rel = items.find((x: any) => x.symbol === "RELIANCE-EQ");
  const nifty = items.find((x: any) => x.token === "99926000");
  const banknifty = items.find((x: any) => x.token === "99926009");
  const sensex = items.find((x: any) => x.token === "99919000" || x.name === "SENSEX");

  console.log("--- Token Verification ---");
  console.log("SBIN-EQ Token:", sbin?.token);
  console.log("ICICIBANK-EQ Token:", icici?.token);
  console.log("RELIANCE-EQ Token:", rel?.token);
  console.log("NIFTY 50 Token:", nifty?.token, nifty?.symbol);
  console.log("BANKNIFTY Token:", banknifty?.token, banknifty?.symbol);
  console.log("SENSEX Token:", sensex?.token, sensex?.symbol);
}

main().catch(console.error);
