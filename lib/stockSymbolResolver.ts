export interface SearchResultItem {
  symbol: string;
  name: string;
  exch: string;
  type: string;
}

export class StockSymbolResolver {
  public resolveSymbol(symbolInput: string): string {
    let raw = (symbolInput || "").trim();
    let symbol = raw.toUpperCase().replace("-EQ", "").replace("-BE", "").replace("-SM", "");

    const hasExplicitExpiry = /\d{2}[A-Z]{3}\d{2}/.test(symbol) || symbol.endsWith("FUT");
    if (hasExplicitExpiry) return symbol;

    // 1. Commodity Mappings (MCX / NYMEX)
    if (symbol.includes("CRUDE") || symbol.includes("CLQ") || symbol.includes("CL=") || symbol === "OIL") return "CRUDEOIL";
    if (symbol.includes("GOLD") || symbol === "GC" || symbol.includes("GC=")) return "GOLD";
    if (symbol.includes("SILVER") || symbol === "SI" || symbol.includes("SI=")) return "SILVER";
    if (symbol.includes("NATURAL") || symbol.includes("GAS") || symbol === "NG" || symbol.includes("NG=")) return "NATURALGAS";
    if (symbol.includes("COPPER") || symbol === "HG" || symbol.includes("HG=")) return "COPPER";

    // 2. Currency Mappings (CDX)
    if (symbol === "USDINR" || symbol === "USD/INR" || symbol === "USD") return "USDINR";
    if (symbol === "EURINR" || symbol === "EUR/INR" || symbol === "EUR") return "EURINR";
    if (symbol === "GBPINR" || symbol === "GBP/INR" || symbol === "GBP") return "GBPINR";

    // 3. Indian Indices (Angel One & NSE Formats)
    if (symbol === "NIFTY" || symbol === "NIFTY 50" || symbol === "NIFTY50") return "^NSEI";
    if (symbol === "BANKNIFTY" || symbol === "BANK NIFTY" || symbol === "NIFTY BANK" || symbol === "NIFTY-BANK") return "^NSEBANK";
    if (symbol === "FINNIFTY" || symbol === "FIN NIFTY") return "FINNIFTY";
    if (symbol === "SENSEX" || symbol === "BSE SENSEX") return "^BSESN";

    // 4. Crypto Assets & US Tech Stocks (avoid appending .NS)
    const usTech = ["AAPL", "GOOGL", "MSFT", "AMZN", "META", "TSLA", "NVDA"];
    const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL") || symbol.includes("XRP") || symbol.includes("DOGE") || symbol.includes("BNB") || symbol.includes("ADA") || symbol.includes("AVAX") || symbol.includes("DOT") || symbol.includes("LINK") || symbol.endsWith("USD") || symbol.endsWith("USDT");
    if (usTech.includes(symbol) || isCrypto) return symbol;

    // Already has an extension (like .NS, .BO)
    if (symbol.includes(".")) return symbol;

    // Default Indian Equity -> append .NS
    return `${symbol}.NS`;
  }

  public getYahooSymbol(symbolInput: string): string {
    const symbol = this.resolveSymbol(symbolInput);
    if (symbol === "CRUDEOIL") return "CRUDEOIL";
    if (symbol === "GOLD") return "GOLD";
    if (symbol === "SILVER") return "SILVER";
    if (symbol === "NATURALGAS") return "NATURALGAS";
    if (symbol === "COPPER") return "COPPER";
    if (symbol === "USDINR") return "INR=X";
    if (symbol === "EURINR") return "EURINR=X";
    if (symbol === "GBPINR") return "GBPINR=X";
    if (symbol === "BTCINR" || symbol === "BTC-INR") return "BTC-INR";
    if (symbol === "ETHINR" || symbol === "ETH-INR") return "ETH-INR";
    return symbol;
  }

  public getKnownStocks() {
    return [
      // Delta Exchange Crypto Assets
      { symbol: "BTCUSD", company: "Bitcoin / U.S. Dollar Perpetual (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "ETHUSD", company: "Ethereum / U.S. Dollar Perpetual (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "SOLUSD", company: "Solana / U.S. Dollar Perpetual (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "XRPUSD", company: "XRP / U.S. Dollar Perpetual (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "DOGEUSD", company: "Dogecoin / U.S. Dollar Perpetual (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "BNBUSD", company: "BNB / U.S. Dollar Perpetual (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "ADAUSD", company: "Cardano / U.S. Dollar Perpetual (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "AVAXUSD", company: "Avalanche / U.S. Dollar Perpetual (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "DOTUSD", company: "Polkadot / U.S. Dollar Perpetual (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "LINKUSD", company: "Chainlink / U.S. Dollar Perpetual (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "BTCUSDT", company: "Bitcoin USDT Spot (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },
      { symbol: "ETHUSDT", company: "Ethereum USDT Spot (Delta Exchange)", exchange: "DELTA", type: "CRYPTO" },

      // Indices & Commodities (Angel One)
      { symbol: "^NSEI", company: "NIFTY 50 Index (Angel One: NIFTY 50)", exchange: "NSE", type: "INDEX" },
      { symbol: "^BSESN", company: "SENSEX Index (Angel One: SENSEX)", exchange: "BSE", type: "INDEX" },
      { symbol: "^NSEBANK", company: "NIFTY BANK Index (Angel One: BANKNIFTY)", exchange: "NSE", type: "INDEX" },
      { symbol: "FINNIFTY", company: "FINNIFTY Index (Angel One: FINNIFTY)", exchange: "NSE", type: "INDEX" },
      { symbol: "CRUDEOIL", company: "Crude Oil Futures (Angel One: CRUDEOIL)", exchange: "MCX", type: "COMMODITY" },
      { symbol: "GOLD", company: "Gold Futures (Angel One: GOLD)", exchange: "MCX", type: "COMMODITY" },
      { symbol: "SILVER", company: "Silver Futures (Angel One: SILVER)", exchange: "MCX", type: "COMMODITY" },
      { symbol: "NATURALGAS", company: "Natural Gas Futures (Angel One: NATURALGAS)", exchange: "MCX", type: "COMMODITY" },
      { symbol: "COPPER", company: "Copper Futures (Angel One: COPPER)", exchange: "MCX", type: "COMMODITY" },
      { symbol: "USDINR", company: "USD/INR Currency Pair (Angel One: USDINR)", exchange: "CDX", type: "CURRENCY" },

      // Angel One & NSE Equities
      { symbol: "RELIANCE.NS", company: "Reliance Industries Limited (Angel One: RELIANCE)", exchange: "NSE", type: "EQUITY" },
      { symbol: "TCS.NS", company: "Tata Consultancy Services (Angel One: TCS)", exchange: "NSE", type: "EQUITY" },
      { symbol: "INFY.NS", company: "Infosys Limited (Angel One: INFY)", exchange: "NSE", type: "EQUITY" },
      { symbol: "TATAMOTORS.NS", company: "Tata Motors Limited (Angel One: TATAMOTORS)", exchange: "NSE", type: "EQUITY" },
      { symbol: "HDFCBANK.NS", company: "HDFC Bank Limited (Angel One: HDFCBANK)", exchange: "NSE", type: "EQUITY" },
      { symbol: "ICICIBANK.NS", company: "ICICI Bank Limited (Angel One: ICICIBANK)", exchange: "NSE", type: "EQUITY" },
      { symbol: "SBIN.NS", company: "State Bank of India (Angel One: SBIN)", exchange: "NSE", type: "EQUITY" },
      { symbol: "BHARTIARTL.NS", company: "Bharti Airtel (Angel One: BHARTIARTL)", exchange: "NSE", type: "EQUITY" },
      { symbol: "ITC.NS", company: "ITC Limited (Angel One: ITC)", exchange: "NSE", type: "EQUITY" },
      { symbol: "LT.NS", company: "Larsen & Toubro (Angel One: LT)", exchange: "NSE", type: "EQUITY" },
      { symbol: "AXISBANK.NS", company: "Axis Bank Limited (Angel One: AXISBANK)", exchange: "NSE", type: "EQUITY" },
      { symbol: "WIPRO.NS", company: "Wipro Limited (Angel One: WIPRO)", exchange: "NSE", type: "EQUITY" },
      { symbol: "KOTAKBANK.NS", company: "Kotak Mahindra Bank (Angel One: KOTAKBANK)", exchange: "NSE", type: "EQUITY" },
      { symbol: "MARUTI.NS", company: "Maruti Suzuki (Angel One: MARUTI)", exchange: "NSE", type: "EQUITY" },
      { symbol: "SUNPHARMA.NS", company: "Sun Pharma (Angel One: SUNPHARMA)", exchange: "NSE", type: "EQUITY" },
      { symbol: "ULTRACEMCO.NS", company: "UltraTech Cement (Angel One: ULTRACEMCO)", exchange: "NSE", type: "EQUITY" },
      { symbol: "TITAN.NS", company: "Titan Company (Angel One: TITAN)", exchange: "NSE", type: "EQUITY" },
      { symbol: "BAJFINANCE.NS", company: "Bajaj Finance (Angel One: BAJFINANCE)", exchange: "NSE", type: "EQUITY" },
      { symbol: "ASIANPAINT.NS", company: "Asian Paints (Angel One: ASIANPAINT)", exchange: "NSE", type: "EQUITY" },
      { symbol: "HCLTECH.NS", company: "HCL Technologies (Angel One: HCLTECH)", exchange: "NSE", type: "EQUITY" },

      // US Nasdaq Stocks
      { symbol: "AAPL", company: "Apple Inc. (NASDAQ)", exchange: "NASDAQ", type: "EQUITY" },
      { symbol: "NVDA", company: "NVIDIA Corporation (NASDAQ)", exchange: "NASDAQ", type: "EQUITY" },
      { symbol: "TSLA", company: "Tesla, Inc. (NASDAQ)", exchange: "NASDAQ", type: "EQUITY" }
    ];
  }

  public searchTickers(query: string): SearchResultItem[] {
    if (!query || query.trim().length === 0) return [];
    const raw = query.trim();
    const q = raw.toLowerCase().replace("-eq", "").replace("-be", "").replace("-sm", "");
    const upperQ = raw.toUpperCase();

    // Commodity specific multi-expiry contract search options (Angel One / MCX)
    if (q.includes("crude") || q === "oil" || q.includes("cl=")) {
      return [
        { symbol: "CRUDEOIL", name: "Crude Oil Futures (19 Aug 2026 - Active Near Month)", exch: "MCX", type: "COMMODITY" },
        { symbol: "CRUDEOIL21SEP26FUT", name: "Crude Oil Futures (21 Sep 2026 Expiry)", exch: "MCX", type: "COMMODITY" },
        { symbol: "CRUDEOIL19OCT26FUT", name: "Crude Oil Futures (19 Oct 2026 Expiry)", exch: "MCX", type: "COMMODITY" }
      ];
    }

    if (q.includes("gold") || q.includes("gc=")) {
      return [
        { symbol: "GOLD", name: "Gold Futures (05 Aug 2026 - Active Near Month)", exch: "MCX", type: "COMMODITY" },
        { symbol: "GOLD05OCT26FUT", name: "Gold Futures (05 Oct 2026 Expiry)", exch: "MCX", type: "COMMODITY" }
      ];
    }

    if (q.includes("silver") || q.includes("si=")) {
      return [
        { symbol: "SILVER", name: "Silver Futures (04 Sep 2026 - Active Near Month)", exch: "MCX", type: "COMMODITY" },
        { symbol: "SILVER04DEC26FUT", name: "Silver Futures (04 Dec 2026 Expiry)", exch: "MCX", type: "COMMODITY" }
      ];
    }

    const known = this.getKnownStocks();
    const localMatches = known.filter(
      k => k.symbol.toLowerCase().includes(q) || k.company.toLowerCase().includes(q) || k.symbol.replace(".NS", "").toLowerCase().includes(q)
    );

    if (localMatches.length > 0) {
      return localMatches.map(m => ({
        symbol: m.symbol,
        name: m.company,
        exch: m.exchange,
        type: m.type
      }));
    }

    // Check if query is Crypto asset
    const isCrypto = upperQ.includes("BTC") || upperQ.includes("ETH") || upperQ.includes("SOL") || upperQ.includes("XRP") || upperQ.includes("DOGE") || upperQ.includes("BNB") || upperQ.includes("ADA") || upperQ.includes("AVAX") || upperQ.includes("DOT") || upperQ.includes("LINK") || upperQ.endsWith("USD") || upperQ.endsWith("USDT");
    if (isCrypto) {
      return [
        {
          symbol: upperQ,
          name: `${upperQ} Crypto Contract (Delta Exchange)`,
          exch: "DELTA",
          type: "CRYPTO"
        }
      ];
    }

    // Check Option or Futures Contract (NFO)
    const isOptionOrFut = upperQ.endsWith("CE") || upperQ.endsWith("PE") || upperQ.endsWith("FUT") || /\d{2}[A-Z]{3}/.test(upperQ);
    if (isOptionOrFut) {
      return [
        {
          symbol: upperQ,
          name: `${upperQ} Derivatives Contract (Angel One F&O)`,
          exch: "NFO",
          type: upperQ.endsWith("FUT") ? "FUTURE" : "OPTION"
        }
      ];
    }

    const resolved = this.resolveSymbol(query);
    return [
      {
        symbol: resolved,
        name: `${upperQ} (Angel One / NSE)`,
        exch: "NSE",
        type: "EQUITY"
      }
    ];
  }
}

export const stockSymbolResolver = new StockSymbolResolver();
