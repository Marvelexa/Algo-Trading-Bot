import dotenv from "dotenv";
dotenv.config();

import { deltaAutoTraderEngine } from "../lib/deltaAutoTraderEngine";

async function main() {
  const fullState = deltaAutoTraderEngine.getLiveFullState();
  console.log("=========================================");
  console.log("🤖 DELTA AUTO TRADER LIVE STATUS INSPECTION");
  console.log("=========================================");
  console.log("Settings:", {
    mode: fullState.settings.mode,
    isEnabled: fullState.settings.isEnabled,
    currentCapitalUSD: fullState.settings.currentCapitalUSD,
    maxConcurrentPositions: fullState.settings.maxConcurrentPositions,
    minConfidenceThreshold: fullState.settings.minConfidenceThreshold
  });
  console.log("\nCurrent Asset Being Inspected:", fullState.status.currentInspectedAsset);
  console.log("Inspection Countdown Remaining:", `${Math.floor((fullState.status.inspectionRemainingSeconds || 0) / 60)}m ${(fullState.status.inspectionRemainingSeconds || 0) % 60}s`);
  console.log("Open Positions on Engine:", fullState.openPositions.length);
  console.log("Closed Trades History Count:", fullState.closedRecords.length);

  // Get diagnostic radar across all 10 coins
  const diag = await deltaAutoTraderEngine.getScanDiagnostics();
  console.log("\n--- Top Curated Coins Radar ---");
  diag.assetScans.slice(0, 5).forEach((asset, idx) => {
    console.log(`#${idx + 1} ${asset.symbol}: Score ${asset.score}/100 [${asset.direction}] - Status: ${asset.status}`);
  });
}

main().catch(console.error);
