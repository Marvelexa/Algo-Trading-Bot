export interface TradingViewAnalysis {
  symbol: string;
  price: number;
  recommendation: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  recommendationScore: number; // -1 to 1
  rsi: number;
  macd: number;
  macdSignal: number;
  ema20: number;
  sma50: number;
  source: "TRADINGVIEW_LIVE_SCANNER";
  timestamp: string;
}

export class TradingViewScannerEngine {
  /**
   * Resolves internal symbol to proper TradingView scanner endpoint and symbol string
   */
  private getScannerConfig(symbolInput: string): { endpoint: string; tvSymbol: string } {
    const raw = (symbolInput || "").trim().toUpperCase();

    // MCX Commodities / Futures (Indian INR Realtime Data)
    if (raw.includes("CRUDE") || raw.includes("CL=") || raw.includes("USOIL")) {
      if (raw.includes("21SEP") || raw.includes("19OCT") || raw.includes("19NOV")) {
        return { endpoint: "", tvSymbol: "" };
      }
      return { endpoint: "https://scanner.tradingview.com/futures/scan", tvSymbol: "MCX:CRUDEOIL1!" };
    }
    if (raw.includes("GOLD") || raw.includes("GC=")) {
      return { endpoint: "https://scanner.tradingview.com/futures/scan", tvSymbol: "MCX:GOLD1!" };
    }
    if (raw.includes("SILVER") || raw.includes("SI=")) {
      return { endpoint: "https://scanner.tradingview.com/futures/scan", tvSymbol: "MCX:SILVER1!" };
    }
    if (raw.includes("NATURAL") || raw.includes("GAS") || raw.includes("NG=")) {
      return { endpoint: "https://scanner.tradingview.com/futures/scan", tvSymbol: "MCX:NATURALGAS1!" };
    }
    if (raw.includes("COPPER") || raw.includes("HG=")) {
      return { endpoint: "https://scanner.tradingview.com/futures/scan", tvSymbol: "MCX:COPPER1!" };
    }

    // Forex / Currencies
    if (raw.includes("USDINR") || raw.includes("INR=X")) {
      return { endpoint: "https://scanner.tradingview.com/forex/scan", tvSymbol: "FX_IDC:USDINR" };
    }

    // US Equities
    if (["AAPL", "NVDA", "TSLA", "MSFT", "GOOGL", "AMZN", "META"].includes(raw)) {
      return { endpoint: "https://scanner.tradingview.com/america/scan", tvSymbol: `NASDAQ:${raw}` };
    }

    // Indian Equities / Indices
    let clean = raw.replace(".NS", "").replace(".BO", "").replace("^", "");
    if (clean === "NSEI" || clean === "NIFTY") return { endpoint: "https://scanner.tradingview.com/india/scan", tvSymbol: "NSE:NIFTY" };
    if (clean === "BSESN" || clean === "SENSEX") return { endpoint: "https://scanner.tradingview.com/india/scan", tvSymbol: "BSE:SENSEX" };

    return { endpoint: "https://scanner.tradingview.com/india/scan", tvSymbol: `NSE:${clean}` };
  }

  /**
   * Fetches real-time technical analysis & live price directly from TradingView Scanner API
   */
  public async fetchTradingViewAnalysis(symbolInput: string): Promise<TradingViewAnalysis | null> {
    try {
      const { endpoint, tvSymbol } = this.getScannerConfig(symbolInput);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({
          symbols: { tickers: [tvSymbol] },
          columns: [
            "Recommend.All",
            "close",
            "RSI",
            "MACD.macd",
            "MACD.signal",
            "EMA20",
            "SMA50"
          ]
        })
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data?.data || data.data.length === 0) return null;

      const [recScore, close, rsi, macd, macdSignal, ema20, sma50] = data.data[0].d;

      let rec: TradingViewAnalysis["recommendation"] = "NEUTRAL";
      if (recScore >= 0.5) rec = "STRONG_BUY";
      else if (recScore > 0.1) rec = "BUY";
      else if (recScore <= -0.5) rec = "STRONG_SELL";
      else if (recScore < -0.1) rec = "SELL";

      return {
        symbol: tvSymbol,
        price: Number(close?.toFixed(2) || 0),
        recommendation: rec,
        recommendationScore: Number(recScore?.toFixed(2) || 0),
        rsi: Number(rsi?.toFixed(2) || 50),
        macd: Number(macd?.toFixed(2) || 0),
        macdSignal: Number(macdSignal?.toFixed(2) || 0),
        ema20: Number(ema20?.toFixed(2) || 0),
        sma50: Number(sma50?.toFixed(2) || 0),
        source: "TRADINGVIEW_LIVE_SCANNER",
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error("[TradingViewScannerEngine] Error fetching live TradingView data:", err);
      return null;
    }
  }
}

export const tradingViewScannerEngine = new TradingViewScannerEngine();
