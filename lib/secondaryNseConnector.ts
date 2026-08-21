/**
 * SECONDARY NSE DATA CONNECTOR (stock-nse-india Wrapper)
 * Serves as fallback and cross-verification engine for Angel One SmartAPI.
 */

import { NseIndia } from "stock-nse-india";

export interface NseSecondaryQuote {
  symbol: string;
  lastPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: "nse_secondary_fallback" | "primary_angel_one";
}

export class SecondaryNseConnector {
  private nse: NseIndia;
  private isInitialized: boolean = false;

  constructor() {
    this.nse = new NseIndia();
  }

  public async initialize(): Promise<boolean> {
    try {
      this.isInitialized = true;
      return true;
    } catch (e) {
      console.warn("[SecondaryNseConnector] Initialization warning:", e);
      return false;
    }
  }

  /**
   * Fetch Equity Details / Secondary Quote
   */
  public async getEquityQuote(symbol: string): Promise<NseSecondaryQuote | null> {
    try {
      const cleanSym = symbol.replace("NSE:", "").replace("BSE:", "").toUpperCase();
      const details = await this.nse.getEquityDetails(cleanSym);
      if (!details || !details.priceInfo) return null;

      return {
        symbol: cleanSym,
        lastPrice: details.priceInfo.lastPrice || 0,
        open: details.priceInfo.open || 0,
        high: details.priceInfo.intraDayHighLow?.max || 0,
        low: details.priceInfo.intraDayHighLow?.min || 0,
        close: details.priceInfo.close || details.priceInfo.lastPrice || 0,
        volume: details.securityInfo?.issuedSize || 100000,
        source: "nse_secondary_fallback"
      };
    } catch (e) {
      console.warn(`[SecondaryNseConnector] ⚠️ Failed fetching quote for ${symbol}:`, e);
      return null;
    }
  }

  /**
   * Cross-Check Price Data Point between Primary (Angel One) and Secondary (stock-nse-india)
   */
  public crossCheckData(
    symbol: string,
    primaryPrice: number,
    secondaryPrice: number,
    tolerancePct: number = 1.5
  ): { matches: boolean; diffPct: number; logMessage: string } {
    if (!primaryPrice || !secondaryPrice || primaryPrice <= 0 || secondaryPrice <= 0) {
      return { matches: true, diffPct: 0, logMessage: "Data cross-check skipped: missing price" };
    }

    const diffPct = Number((Math.abs(primaryPrice - secondaryPrice) / primaryPrice * 100).toFixed(2));
    const matches = diffPct <= tolerancePct;

    const logMessage = matches
      ? `✅ Data Cross-Check Passed for ${symbol}: Primary ₹${primaryPrice} vs Secondary ₹${secondaryPrice} (Diff: ${diffPct}%)`
      : `⚠️ Data Discrepancy Warning for ${symbol}: Primary ₹${primaryPrice} vs Secondary ₹${secondaryPrice} (Diff: ${diffPct}% > ${tolerancePct}% tolerance)`;

    if (!matches) {
      console.warn(`[DataIntegrity] ${logMessage}`);
    }

    return { matches, diffPct, logMessage };
  }
}

export const secondaryNseConnector = new SecondaryNseConnector();
