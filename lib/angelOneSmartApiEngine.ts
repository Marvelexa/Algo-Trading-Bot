import { generateTOTP } from "./totpGenerator";
import { OHLCVBar } from "./stockEngine";

const safeReadSession = (): any => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = localStorage.getItem("NEXVORA_ANGEL_ONE_SESSION");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  try {
    const nodeFs = require("fs");
    if (nodeFs.existsSync("./.angel_one_session.json")) {
      return JSON.parse(nodeFs.readFileSync("./.angel_one_session.json", "utf-8"));
    }
  } catch (e) {}
  return null;
};

const safeSaveSession = (session: AngelOneSession) => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem("NEXVORA_ANGEL_ONE_SESSION", JSON.stringify(session));
    } catch (e) {}
  }
  try {
    const nodeFs = require("fs");
    nodeFs.writeFileSync("./.angel_one_session.json", JSON.stringify(session, null, 2), "utf-8");
  } catch (e) {}
};

export interface AngelOneCredentials {
  apiKey: string;
  clientCode: string;
  mpin: string;
  totpSecret: string;
}

export interface AngelOneSession {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
  clientCode: string;
  createdAt: number;
  expiresAt: number;
}

export interface ScripMasterItem {
  token: string;
  symbol: string;
  name: string;
  expiry: string;
  strike: string;
  lotsize: string;
  instrumenttype: string;
  exch_seg: string;
  tick_size: string;
}

export interface AngelOneOrderPayload {
  tradingSymbol: string;
  symbolToken: string;
  exchange: "NSE" | "BSE" | "MCX" | "NFO";
  transactionType: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOPLOSS_LIMIT";
  productType: "DELIVERY" | "INTRADAY" | "CARRYFORWARD";
  quantity: number;
  price?: number;
  stopLossPrice?: number;
}

const SCRIP_MASTER_CACHE_PATH = "./.scrip_master.json";

export class AngelOneSmartApiEngine {
  private session: AngelOneSession | null = null;
  private scripMaster: Map<string, ScripMasterItem> = new Map(); // "RELIANCE_NSE" -> item
  private isScripMasterLoaded: boolean = false;

  constructor() {
    this.loadPersistedSession();
  }

  public isSessionActive(): boolean {
    return !!(this.session && this.session.jwtToken && this.session.expiresAt > Date.now());
  }

  public getSession(): AngelOneSession | null {
    return this.session;
  }

  /**
   * Load session from disk/storage on startup so state doesn't vanish on reload
   */
  private loadPersistedSession() {
    try {
      const parsed = safeReadSession();
      if (parsed && parsed.expiresAt > Date.now()) {
        this.session = parsed;
        console.log(`[AngelOne] 🟢 Restored active session for client: ${parsed.clientCode}`);
      }
    } catch (e) {
      console.warn("[AngelOne] Could not restore session:", e);
    }
  }

  /**
   * Persist session
   */
  private persistSession(session: AngelOneSession) {
    try {
      safeSaveSession(session);
    } catch (e) {
      console.error("[AngelOne] Failed to persist session:", e);
    }
  }

  /**
   * STEP 1: Authentication & Session Generation
   */
  public async generateSession(creds: AngelOneCredentials): Promise<{ success: boolean; session?: AngelOneSession; message?: string }> {
    const { apiKey, clientCode, mpin, totpSecret } = creds;

    if (!apiKey || !clientCode || !mpin) {
      return { success: false, message: "API Key, Client Code, and MPIN are required." };
    }

    // Generate 6-digit TOTP dynamically
    const totp = generateTOTP(totpSecret);

    try {
      const url = "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-PrivateKey": apiKey,
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-ClientLocalIP": "127.0.0.1",
          "X-ClientPublicIP": "103.21.124.1",
          "X-MACAddress": "fe80::1%1"
        },
        body: JSON.stringify({
          clientcode: clientCode,
          password: mpin,
          totp: totp
        })
      });

      const json = await response.json();

      if (json.status === true && json.data) {
        const sessionData: AngelOneSession = {
          jwtToken: json.data.jwtToken,
          refreshToken: json.data.refreshToken,
          feedToken: json.data.feedToken,
          clientCode: clientCode,
          createdAt: Date.now(),
          expiresAt: Date.now() + 18 * 60 * 60 * 1000 // 18 hours validity
        };

        this.session = sessionData;
        this.persistSession(sessionData);

        console.log(`[AngelOne] 🔑 Authentication Successful! JWT Session established for Client ID: ${clientCode}`);
        return { success: true, session: sessionData, message: "Angel One SmartAPI Session Connected Successfully!" };
      } else {
        const errorMsg = json.message || json.errorcode || "Authentication failed. Check API Key, MPIN, and TOTP Secret.";
        console.error(`[AngelOne] ❌ Login Failed: ${errorMsg}`);
        return { success: false, message: errorMsg };
      }
    } catch (err: any) {
      console.error("[AngelOne] ❌ Network/Auth Error:", err.message);
      return { success: false, message: `Connection Error: ${err.message}` };
    }
  }

  /**
  /**
   * STEP 2: Instrument Token Lookup (Scrip Master Download & Cache)
   */
  public async loadScripMaster(forceRefresh: boolean = false): Promise<number> {
    const processItems = (items: ScripMasterItem[]) => {
      items.forEach(item => {
        if (item.token) {
          if (item.symbol) {
            const symKey = item.symbol.toUpperCase();
            this.scripMaster.set(`${symKey}_${item.exch_seg}`, item);
            this.scripMaster.set(symKey, item);
          }
          if (item.name) {
            const nameKey = item.name.toUpperCase();
            if (!this.scripMaster.has(`${nameKey}_${item.exch_seg}`)) {
              this.scripMaster.set(`${nameKey}_${item.exch_seg}`, item);
            }
            if (!this.scripMaster.has(nameKey)) {
              this.scripMaster.set(nameKey, item);
            }
          }
          this.scripMaster.set(item.token, item);
        }
      });
    };

    try {
      // Check local file cache first if in Node environment
      if (!forceRefresh && typeof window === "undefined") {
        try {
          const nodeFs = require("fs");
          if (nodeFs.existsSync(SCRIP_MASTER_CACHE_PATH)) {
            const stat = nodeFs.statSync(SCRIP_MASTER_CACHE_PATH);
            const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 3600);
            if (ageHours < 48) {
              const raw = nodeFs.readFileSync(SCRIP_MASTER_CACHE_PATH, "utf-8");
              const items: ScripMasterItem[] = JSON.parse(raw);
              if (Array.isArray(items) && items.length > 0) {
                processItems(items);
                this.isScripMasterLoaded = true;
                console.log(`[AngelOne] 📜 Loaded ${this.scripMaster.size} Instruments from Scrip Master Cache.`);
                return this.scripMaster.size;
              }
            }
          }
        } catch (cacheErr) {
          console.warn("[AngelOne] Invalid cache file detected...");
        }
      }

      console.log("[AngelOne] 🔄 Downloading fresh official Scrip Master JSON from Angel One...");
      const res = await fetch("https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json");
      if (res.ok) {
        const items: ScripMasterItem[] = await res.json();
        processItems(items);
        if (typeof window === "undefined") {
          try {
            const nodeFs = require("fs");
            nodeFs.writeFileSync(SCRIP_MASTER_CACHE_PATH, JSON.stringify(items), "utf-8");
          } catch (e) {}
        }
        this.isScripMasterLoaded = true;
        console.log(`[AngelOne] ✅ Downloaded & Cached ${items.length} Angel One Scrip Master Instruments.`);
        return items.length;
      }
    } catch (e) {
      console.warn("[AngelOne] Warning loading scrip master:", e);
    }

    // Default built-in token map for key Indian equities & indices
    const defaultTokens: Record<string, string> = {
      "RELIANCE-EQ_NSE": "2885",
      "RELIANCE_NSE": "2885",
      "TCS-EQ_NSE": "11536",
      "TCS_NSE": "11536",
      "INFY-EQ_NSE": "1594",
      "INFY_NSE": "1594",
      "TATAMOTORS-EQ_NSE": "3456",
      "TATAMOTORS_NSE": "3456",
      "HDFCBANK-EQ_NSE": "1333",
      "HDFCBANK_NSE": "1333",
      "ICICIBANK-EQ_NSE": "15083",
      "ICICIBANK_NSE": "15083",
      "SBIN-EQ_NSE": "3045",
      "SBIN_NSE": "3045",
      "BHARTIARTL-EQ_NSE": "10604",
      "BHARTIARTL_NSE": "10604",
      "ITC-EQ_NSE": "1660",
      "ITC_NSE": "1660",
      "LT-EQ_NSE": "11483",
      "LT_NSE": "11483",
      "AXISBANK-EQ_NSE": "5900",
      "AXISBANK_NSE": "5900",
      "WIPRO-EQ_NSE": "3787",
      "WIPRO_NSE": "3787",
      "KOTAKBANK-EQ_NSE": "1922",
      "KOTAKBANK_NSE": "1922",
      "MARUTI-EQ_NSE": "10999",
      "MARUTI_NSE": "10999",
      "SUNPHARMA-EQ_NSE": "3351",
      "SUNPHARMA_NSE": "3351",
      "ULTRACEMCO-EQ_NSE": "11532",
      "ULTRACEMCO_NSE": "11532",
      "TITAN-EQ_NSE": "3506",
      "TITAN_NSE": "3506",
      "BAJFINANCE-EQ_NSE": "317",
      "BAJFINANCE_NSE": "317",
      "ASIANPAINT-EQ_NSE": "236",
      "ASIANPAINT_NSE": "236",
      "HCLTECH-EQ_NSE": "7229",
      "HCLTECH_NSE": "7229",
      "NIFTY_NSE": "99926000",
      "NSEI_NSE": "99926000",
      "BANKNIFTY_NSE": "99926009",
      "NSEBANK_NSE": "99926009",
      "FINNIFTY_NSE": "99926037",
      "SENSEX_BSE": "99919000",
      "BSESN_BSE": "99919000"
    };

    Object.entries(defaultTokens).forEach(([key, token]) => {
      this.scripMaster.set(key, { token, symbol: key.split("_")[0], exch_seg: key.split("_")[1] } as any);
      this.scripMaster.set(key.split("_")[0], { token, symbol: key.split("_")[0], exch_seg: key.split("_")[1] } as any);
    });

    this.isScripMasterLoaded = true;
    return this.scripMaster.size;
  }

  /**
   * Symbol Token Lookup
   */
  public getToken(symbolInput: string, exchange: string = "NSE"): string {
    const rawInput = (symbolInput || "").toUpperCase();
    let raw = rawInput.replace(".NS", "").replace(".BO", "").replace("^", "");

    // 1. Commodity & Currency Normalization (Only for generic queries without explicit contract expiry)
    const hasExplicitExpiry = /\d{2}[A-Z]{3}\d{2}/.test(raw) || raw.endsWith("FUT");
    if (!hasExplicitExpiry) {
      if (raw.includes("CRUDE") || raw.includes("CL=") || raw === "OIL") raw = "CRUDEOIL";
      if (raw.includes("GOLD") || raw.includes("GC=")) raw = "GOLD";
      if (raw.includes("SILVER") || raw.includes("SI=")) raw = "SILVER";
      if (raw.includes("NATURAL") || raw.includes("GAS") || raw.includes("NG=")) raw = "NATURALGAS";
      if (raw.includes("COPPER") || raw.includes("HG=")) raw = "COPPER";
      if (raw.includes("USDINR") || raw.includes("INR=")) raw = "USDINR";
    }

    // 2. PRIORITY 1: Bulletproof Master Verified Token Dictionary (IMMUTABLE EXCHANGE TOKENS)
    const masterTokenMap: Record<string, string> = {
      // Major Indian Indices
      "NIFTY": "99926000",
      "NIFTY50": "99926000",
      "NIFTY-50": "99926000",
      "NSEI": "99926000",
      "^NSEI": "99926000",
      "BANKNIFTY": "99926009",
      "NIFTYBANK": "99926009",
      "NSEBANK": "99926009",
      "^NSEBANK": "99926009",
      "FINNIFTY": "99926037",
      "MIDCPNIFTY": "99926074",
      "SENSEX": "99919000",
      "BSESN": "99919000",
      "^BSESN": "99919000",

      // Top NIFTY 50 & Liquid Equities
      "RELIANCE": "2885",
      "TCS": "11536",
      "INFY": "1594",
      "TATAMOTORS": "3456",
      "HDFCBANK": "1333",
      "ICICIBANK": "4963",
      "SBIN": "3045",
      "BHARTIARTL": "10604",
      "ITC": "1660",
      "LT": "11483",
      "AXISBANK": "5900",
      "WIPRO": "3787",
      "KOTAKBANK": "1922",
      "MARUTI": "10999",
      "SUNPHARMA": "3351",
      "ULTRACEMCO": "11532",
      "TITAN": "3506",
      "BAJFINANCE": "317",
      "ASIANPAINT": "236",
      "HCLTECH": "7229",
      "HINDUNILVR": "1394",
      "BAJAJFINSV": "16675",
      "TATASTEEL": "3499",
      "NTPC": "11630",
      "POWERGRID": "14977",
      "ONGC": "2475",
      "COALINDIA": "20374",
      "ADANIENT": "25",
      "ADANIPORTS": "15083",
      "GRASIM": "1232",
      "HEROMOTOCO": "1348",
      "EICHERMOT": "910",
      "BPCL": "526",
      "CIPLA": "694",
      "DIVISLAB": "10940",
      "DRREDDY": "881",
      "APOLLOHOSP": "157",
      "BRITANNIA": "547",
      "TATACONSUM": "3432",
      "NESTLEIND": "17963",
      "INDUSINDBK": "5258",
      "HDFCLIFE": "467",
      "SBILIFE": "21808",
      "HINDALCO": "1363",
      "BEL": "383",
      "TRENT": "1964",

      // Missing Nifty 50 Constituents
      "BAJAJ-AUTO": "16669",
      "BAJAJAUTO": "16669",
      "JSWSTEEL": "11723",
      "M&M": "2031",
      "MAHINDRA": "2031",
      "TECHM": "13538",
      "LTIM": "17818",
      "LTIMINDTREE": "17818",
      "SHRIRAMFIN": "4306",

      // Currency
      "USDINR": "2000",

      // MCX Commodity Futures Expiries
      "CRUDEOIL19AUG26FUT": "560977",
      "CRUDEOIL21SEP26FUT": "565899",
      "CRUDEOIL19OCT26FUT": "569900",
      "CRUDEOIL19NOV26FUT": "573422"
    };

    // MCX Commodities: DO NOT hardcode tokens — they expire monthly!
    // Dynamic near-month FUT resolution happens below via ScripMaster lookup.

    if (masterTokenMap[raw]) return masterTokenMap[raw];

    // Priority 1.5: Dynamic MCX Commodity Near-Month FUT Token Resolution
    const commodityNames = ["CRUDEOIL", "GOLD", "SILVER", "NATURALGAS", "COPPER"];
    if (commodityNames.includes(raw)) {
      const contracts = this.getExpiryContracts(raw);
      if (contracts.length > 0 && contracts[0].token) {
        console.log(`[AngelOne] 🛢️ Dynamic MCX token resolved: ${raw} => ${contracts[0].symbol} (Token ${contracts[0].token})`);
        return contracts[0].token;
      }
    }

    // Priority 1.6: Pattern Lookups for Indices
    if (raw.includes("NIFTY50") || raw.includes("NSEI") || (raw.includes("NIFTY") && !raw.includes("BANK") && !raw.includes("FIN"))) return "99926000";
    if (raw.includes("BANK") || raw.includes("NSEBANK")) return "99926009";
    if (raw.includes("SENSEX") || raw.includes("BSESN")) return "99919000";

    // 3. PRIORITY 2: ScripMaster Dynamic Map for unlisted symbols
    const key1 = `${raw}-EQ_${exchange}`;
    const key2 = `${raw}_${exchange}`;
    const key3 = `${raw}_MCX`;
    const key4 = `${raw}_CDS`;
    const key5 = `${raw}-EQ`;
    const key6 = raw;

    if (this.scripMaster.has(key1)) return this.scripMaster.get(key1)!.token;
    if (this.scripMaster.has(key2)) return this.scripMaster.get(key2)!.token;
    if (this.scripMaster.has(key3)) return this.scripMaster.get(key3)!.token;
    if (this.scripMaster.has(key4)) return this.scripMaster.get(key4)!.token;
    if (this.scripMaster.has(key5)) return this.scripMaster.get(key5)!.token;
    if (this.scripMaster.has(key6)) return this.scripMaster.get(key6)!.token;

    console.warn(`[AngelOne] ⚠️ Token NOT FOUND for symbol: "${symbolInput}" (normalized: "${raw}", exchange: "${exchange}"). ScripMaster loaded: ${this.isScripMasterLoaded}.`);
    return "";
  }
  public getExpiryContracts(symbolInput: string): { symbol: string; token: string; expiry: string; label: string; isNearMonth: boolean }[] {
    const raw = (symbolInput || "").toUpperCase().replace(".NS", "").replace(".BO", "").replace("^", "");
    let name = raw;
    if (raw.includes("CRUDE") || raw.includes("CL=")) name = "CRUDEOIL";
    if (raw.includes("GOLD") || raw.includes("GC=")) name = "GOLD";
    if (raw.includes("SILVER") || raw.includes("SI=")) name = "SILVER";
    if (raw.includes("NATURAL") || raw.includes("GAS") || raw.includes("NG=")) name = "NATURALGAS";
    if (raw.includes("COPPER") || raw.includes("HG=")) name = "COPPER";

    const todayMs = Date.now() - 86400000;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthMap: Record<string, number> = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };

    const matching: ScripMasterItem[] = [];
    this.scripMaster.forEach(item => {
      if (
        item.exch_seg === "MCX" &&
        item.name === name &&
        item.symbol &&
        !item.symbol.includes("MINI") &&
        !item.symbol.includes("MIC") &&
        !item.symbol.includes("GUI") &&
        !item.symbol.includes("M1") &&
        !item.symbol.includes("M2") &&
        item.symbol.endsWith("FUT")
      ) {
        matching.push(item);
      }
    });

    const processed = matching.map(x => {
      let expMs = 0;
      let label = x.expiry || x.symbol;
      if (x.expiry) {
        const match = x.expiry.match(/^(\d{2})([A-Z]{3})(\d{4})$/);
        if (match) {
          const day = parseInt(match[1], 10);
          const monthIdx = monthMap[match[2]];
          const year = parseInt(match[3], 10);
          if (monthIdx !== undefined) {
            expMs = new Date(Date.UTC(year, monthIdx, day)).getTime();
            label = `${day} ${monthNames[monthIdx]}, ${year}`;
          }
        }
      }
      return { symbol: x.symbol, token: x.token, expiry: x.expiry, label, expMs };
    }).filter(x => x.expMs >= todayMs);

    // Deduplicate by expiry
    const seen = new Set<string>();
    const unique = processed.filter(x => {
      if (seen.has(x.expiry)) return false;
      seen.add(x.expiry);
      return true;
    });

    unique.sort((a, b) => a.expMs - b.expMs);
    
    // Built-in Fallback for MCX Commodities if ScripMaster is initializing
    if (unique.length === 0) {
      if (name === "CRUDEOIL") {
        return [
          { symbol: "CRUDEOIL19AUG26FUT", token: "560977", expiry: "19AUG2026", label: "19 August, 2026", isNearMonth: true },
          { symbol: "CRUDEOIL21SEP26FUT", token: "565899", expiry: "21SEP2026", label: "21 September, 2026", isNearMonth: false },
          { symbol: "CRUDEOIL19OCT26FUT", token: "569900", expiry: "19OCT2026", label: "19 October, 2026", isNearMonth: false },
          { symbol: "CRUDEOIL19NOV26FUT", token: "573422", expiry: "19NOV2026", label: "19 November, 2026", isNearMonth: false }
        ];
      }
      if (name === "GOLD") {
        return [{ symbol: "GOLD05AUG26FUT", token: "466583", expiry: "05AUG2026", label: "05 August, 2026", isNearMonth: true }];
      }
      if (name === "SILVER") {
        return [{ symbol: "SILVER04SEP26FUT", token: "471725", expiry: "04SEP2026", label: "04 September, 2026", isNearMonth: true }];
      }
      if (name === "NATURALGAS") {
        return [{ symbol: "NATURALGAS26AUG26FUT", token: "538685", expiry: "26AUG2026", label: "26 August, 2026", isNearMonth: true }];
      }
      if (name === "COPPER") {
        return [{ symbol: "COPPER31AUG26FUT", token: "562048", expiry: "31AUG2026", label: "31 August, 2026", isNearMonth: true }];
      }
    }

    return unique.slice(0, 5).map((x, idx) => ({
      symbol: x.symbol,
      token: x.token,
      expiry: x.expiry,
      label: x.label,
      isNearMonth: idx === 0
    }));
  }

  /**
   * STEP 4: Historical Data Fetch via Angel One getCandleData API
   */
  public async fetchCandles(
    symbolToken: string,
    exchange: string = "NSE",
    interval: "ONE_MINUTE" | "FIVE_MINUTE" | "FIFTEEN_MINUTE" | "ONE_DAY" = "FIVE_MINUTE",
    fromDateStr?: string,
    toDateStr?: string
  ): Promise<OHLCVBar[]> {
    if (!this.session) {
      console.warn("[AngelOne] No active session available for historical candles fetch.");
      return [];
    }

    const today = new Date();
    const past = new Date();
    past.setDate(past.getDate() - 30);

    const fromDate = fromDateStr || `${past.toISOString().split("T")[0]} 09:15`;
    const toDate = toDateStr || `${today.toISOString().split("T")[0]} 15:30`;

    try {
      const url = "https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${this.session.jwtToken}`,
          "X-PrivateKey": process.env.ANGEL_ONE_API_KEY || "at0UVM6C",
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-ClientLocalIP": "127.0.0.1",
          "X-ClientPublicIP": "103.21.124.1",
          "X-MACAddress": "fe80::1%1"
        },
        body: JSON.stringify({
          exchange: exchange,
          symboltoken: symbolToken,
          interval: interval,
          fromdate: fromDate,
          todate: toDate
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === true && Array.isArray(json.data)) {
          const bars: OHLCVBar[] = json.data.map((c: any) => ({
            time: c[0],
            open: Number(c[1]),
            high: Number(c[2]),
            low: Number(c[3]),
            close: Number(c[4]),
            volume: Number(c[5])
          }));
          return bars;
        }
      }
    } catch (err) {
      console.warn("[AngelOne] Historical candle fetch error:", err);
    }
    return [];
  }

  /**
   * STEP 4.5: Official Live Market Data API (FULL, OHLC, LTP Modes)
   * Endpoint: https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/
   */
  public async getMarketQuote(
    mode: "FULL" | "OHLC" | "LTP" = "FULL",
    exchangeTokens: Record<string, string[]> = { "NSE": ["2885"] }
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    if (!this.session) {
      return { success: false, message: "No active session for Angel One SmartAPI" };
    }

    try {
      const url = "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${this.session.jwtToken}`,
          "X-PrivateKey": process.env.ANGEL_ONE_API_KEY || "at0UVM6C",
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-ClientLocalIP": "127.0.0.1",
          "X-ClientPublicIP": "103.21.124.1",
          "X-MACAddress": "fe80::1%1"
        },
        body: JSON.stringify({
          mode: mode,
          exchangeTokens: exchangeTokens
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === true || json.success === true) {
          return { success: true, data: json.data };
        }
        return { success: false, message: json.message || "Market quote request failed" };
      }
      return { success: false, message: `Market quote HTTP Error ${res.status}` };
    } catch (e: any) {
      return { success: false, message: `Market Quote Exception: ${e.message}` };
    }
  }

  /**
   * STEP 5: Semi-Automated Order Placement with Explicit Approval Safeguard
   */
  public async placeOrder(
    payload: AngelOneOrderPayload,
    isManualApproved: boolean = false
  ): Promise<{ success: boolean; orderId?: string; message: string }> {
    // 🛡️ Explicit Approval Safeguard: Require human approval before real order placement
    if (!isManualApproved) {
      return {
        success: false,
        message: "⛔ SAFETY BLOCKED: Order requires 1-click human confirmation in the Execution Guardrail card."
      };
    }

    if (!this.session) {
      return {
        success: false,
        message: "No active Angel One session. Please connect your Demat account in the settings modal."
      };
    }

    try {
      const url = "https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/placeOrder";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${this.session.jwtToken}`,
          "X-PrivateKey": "dummy_key",
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-ClientLocalIP": "127.0.0.1",
          "X-ClientPublicIP": "103.21.124.1",
          "X-MACAddress": "fe80::1%1"
        },
        body: JSON.stringify({
          variety: "NORMAL",
          tradingsymbol: payload.tradingSymbol,
          symboltoken: payload.symbolToken,
          transactiontype: payload.transactionType,
          exchange: payload.exchange || "NSE",
          ordertype: payload.orderType || "MARKET",
          producttype: payload.productType || "DELIVERY",
          duration: "DAY",
          price: payload.price || 0,
          squareoff: "0",
          stoploss: payload.stopLossPrice ? String(payload.stopLossPrice) : "0",
          quantity: String(payload.quantity)
        })
      });

      const json = await res.json();
      if (json.status === true && json.data) {
        const orderId = json.data.orderid;
        console.log(`[AngelOne] 🎉 LIVE ORDER PLACED! Order ID: ${orderId} | ${payload.transactionType} ${payload.quantity} ${payload.tradingSymbol}`);
        return {
          success: true,
          orderId: orderId,
          message: `Angel One Order Placed Successfully! Order ID: ${orderId}`
        };
      } else {
        return {
          success: false,
          message: json.message || "Broker rejected order."
        };
      }
    } catch (e: any) {
      return {
        success: false,
        message: `Order Placement Failed: ${e.message}`
      };
    }
  }

  public getSessionStatus() {
    return {
      isConnected: !!this.session && this.session.expiresAt > Date.now(),
      clientCode: this.session?.clientCode || null,
      expiresAt: this.session?.expiresAt || null,
      scripMasterCount: this.scripMaster.size,
      wsConnected: this.isWsConnected
    };
  }

  // ────────────────────────────────────────────
  // WebSocket V2 Real-Time Streaming Support
  // ────────────────────────────────────────────
  private ws: any = null;
  private isWsConnected: boolean = false;
  private wsTickListeners: Array<(token: string, price: number, exchange: string) => void> = [];

  public onWsTick(listener: (token: string, price: number, exchange: string) => void) {
    this.wsTickListeners.push(listener);
  }

  public connectWebSocket(tokensByExchange?: { exchange: "NSE" | "BSE" | "MCX" | "NFO"; tokens: string[] }[]): void {
    if (!this.session || !this.session.jwtToken) {
      console.warn("[AngelOne WS] ⚠️ Cannot connect WebSocket: No active session.");
      return;
    }

    try {
      const WebSocket = require("ws");
      const wsUrl = "wss://smartapisocket.angelone.in/smart-stream";
      
      console.log("[AngelOne WS] 🔌 Connecting WebSocket to SmartAPI Stream...");
      this.ws = new WebSocket(wsUrl, {
        headers: {
          "Authorization": `Bearer ${this.session.jwtToken}`,
          "x-api-key": process.env.ANGEL_ONE_API_KEY || "at0UVM6C",
          "x-client-code": this.session.clientCode,
          "x-feed-token": this.session.feedToken
        }
      });

      this.ws.on("open", () => {
        this.isWsConnected = true;
        console.log("[AngelOne WS] 🟢 WebSocket Connected Successfully!");

        if (tokensByExchange && tokensByExchange.length > 0) {
          tokensByExchange.forEach(item => {
            const exchCodeMap: Record<string, number> = { "NSE": 1, "BSE": 3, "MCX": 5, "NFO": 2 };
            const subPayload = {
              action: 1, // Subscribe
              params: {
                mode: 1, // LTP Mode
                tokenList: [
                  {
                    exchangeType: exchCodeMap[item.exchange] || 1,
                    tokens: item.tokens
                  }
                ]
              }
            };
            this.ws.send(JSON.stringify(subPayload));
            console.log(`[AngelOne WS] 📡 Subscribed ${item.tokens.length} tokens on ${item.exchange}`);
          });
        }
      });

      this.ws.on("message", (data: any) => {
        try {
          // Parse tick data
          if (Buffer.isBuffer(data) && data.length >= 43) {
            const exchangeType = data.readUInt8(1);
            const tokenStr = data.toString("ascii", 2, 27).replace(/\0/g, "").trim();
            const ltpInPaisa = data.readInt32LE(35);
            const ltp = ltpInPaisa / 100;
            const exchNameMap: Record<number, string> = { 1: "NSE", 2: "NFO", 3: "BSE", 5: "MCX" };
            const exchange = exchNameMap[exchangeType] || "NSE";

            if (ltp > 0 && tokenStr) {
              this.wsTickListeners.forEach(fn => fn(tokenStr, ltp, exchange));
            }
          } else if (typeof data === "string") {
            const parsed = JSON.parse(data);
            if (parsed && parsed.text === "pong") return;
          }
        } catch (err) {}
      });

      this.ws.on("close", () => {
        this.isWsConnected = false;
        console.warn("[AngelOne WS] ⚠️ WebSocket connection closed.");
      });

      this.ws.on("error", (err: any) => {
        console.warn(`[AngelOne WS] ❌ WebSocket error: ${err.message || err}`);
      });
    } catch (e: any) {
      console.warn(`[AngelOne WS] ❌ Failed to initialize WebSocket: ${e.message}`);
    }
  }
}

export const angelOneSmartApiEngine = new AngelOneSmartApiEngine();

