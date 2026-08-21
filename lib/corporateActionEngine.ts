/**
 * Production-Grade Corporate Action Adjustment Engine
 * Adjusts historical price and volume series for:
 * - Stock Splits (e.g. 1:5, 1:10)
 * - Bonus Shares (e.g. 1:1, 1:2)
 * - Ex-Dividend Price Drops
 */

import { MarketBar } from "./aiTradingBrainV1";

export interface CorporateEvent {
  symbol: string;
  eventType: "STOCK_SPLIT" | "BONUS_ISSUE" | "EX_DIVIDEND";
  eventDate: string;
  ratio: number; // e.g. 5 for 1:5 split, 2 for 1:1 bonus
  dividendAmount?: number;
}

export interface CorporateActionReport {
  hasCorporateActionsApplied: boolean;
  appliedEventsCount: number;
  events: CorporateEvent[];
  adjustedBars: MarketBar[];
}

export class CorporateActionEngine {

  /**
   * Adjust historical price series for corporate action events
   */
  public adjustPriceSeries(symbol: string, bars: MarketBar[], events: CorporateEvent[] = []): CorporateActionReport {
    if (!bars || bars.length === 0 || !events || events.length === 0) {
      return {
        hasCorporateActionsApplied: false,
        appliedEventsCount: 0,
        events: [],
        adjustedBars: bars
      };
    }

    let adjustedBars = [...bars];
    let appliedCount = 0;

    for (const evt of events) {
      if (evt.symbol !== symbol) continue;

      if (evt.eventType === "STOCK_SPLIT" || evt.eventType === "BONUS_ISSUE") {
        const factor = evt.ratio > 0 ? evt.ratio : 1;
        adjustedBars = adjustedBars.map(b => ({
          ...b,
          open: Number((b.open / factor).toFixed(2)),
          high: Number((b.high / factor).toFixed(2)),
          low: Number((b.low / factor).toFixed(2)),
          close: Number((b.close / factor).toFixed(2)),
          volume: Math.floor(b.volume * factor)
        }));
        appliedCount++;
      } else if (evt.eventType === "EX_DIVIDEND" && evt.dividendAmount) {
        const div = evt.dividendAmount;
        adjustedBars = adjustedBars.map(b => ({
          ...b,
          open: Number((b.open - div).toFixed(2)),
          high: Number((b.high - div).toFixed(2)),
          low: Number((b.low - div).toFixed(2)),
          close: Number((b.close - div).toFixed(2))
        }));
        appliedCount++;
      }
    }

    return {
      hasCorporateActionsApplied: appliedCount > 0,
      appliedEventsCount: appliedCount,
      events,
      adjustedBars
    };
  }
}

export const corporateActionEngine = new CorporateActionEngine();
