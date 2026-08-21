/**
 * Regression Test: Intraday EOD_FORCE_CLOSE Mandatory Cutoff Verification
 * Confirms that EOD_FORCE_CLOSE fires reliably even if a position is highly profitable and mid-trail,
 * overriding the normal profit-protection trailing stop logic at session cutoff time (15:15 IST).
 */

import { paperTradingEngine } from "../lib/paperTradingEngine";

function runEodForceCloseTest() {
  console.log("=========================================================");
  console.log("STARTING REGRESSION TEST: Intraday EOD_FORCE_CLOSE Cutoff");
  console.log("=========================================================");

  // Reset paper trading state for test isolation
  paperTradingEngine.resetAccount(100000);

  // 1. Open an Intraday position on RELIANCE
  const openRes = paperTradingEngine.openPosition(
    "RELIANCE",
    "Reliance Industries Ltd",
    "BUY",
    10,
    1250,
    1230,
    1300,
    "INR"
  );

  if (!openRes.success || !openRes.position) {
    console.error("❌ Failed to open test position:", openRes.message);
    process.exit(1);
  }

  console.log(`✅ Opened Intraday Position: ${openRes.position.ticker} @ ₹${openRes.position.entryPrice}`);

  // 2. Simulate price surging up to ₹1285 (highly profitable, mid-trail)
  paperTradingEngine.updateLivePrice("RELIANCE", 1285);
  const openPos = paperTradingEngine.getOpenPositions()[0];
  console.log(`📈 Position Current Price: ₹${openPos.currentPrice}, Unrealized P&L: +₹${openPos.unrealizedPnL} (${openPos.unrealizedPnLPct}%)`);

  // Verify position is still open and mid-trail
  if (paperTradingEngine.getOpenPositions().length !== 1) {
    console.error("❌ Position should still be open before EOD cutoff!");
    process.exit(1);
  }

  // 3. Trigger EOD Force Close at cutoff time 15:15 IST
  console.log("⏰ Simulating EOD Cutoff Time 15:15 IST...");
  const closedLogs = paperTradingEngine.checkEodForceClose("15:15");

  console.log("Logs:", closedLogs);

  // 4. Verify position was closed with exitReason EOD_FORCE_CLOSE
  const openPositionsAfter = paperTradingEngine.getOpenPositions();
  const closedTrades = paperTradingEngine.getClosedTrades();

  if (openPositionsAfter.length === 0 && closedTrades.length === 1) {
    const closed = closedTrades[0];
    if (closed.exitReason.includes("EOD_FORCE_CLOSE")) {
      console.log(`✅ [TEST PASSED]: Position successfully closed via EOD_FORCE_CLOSE! Exit Price: ₹${closed.exitPrice}, Realized P&L: +₹${closed.realizedPnL}`);
      console.log("=========================================================");
      return;
    } else {
      console.error(`❌ Incorrect exit reason: ${closed.exitReason}`);
      process.exit(1);
    }
  } else {
    console.error("❌ Position was not closed by EOD_FORCE_CLOSE!");
    process.exit(1);
  }
}

runEodForceCloseTest();
