import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { Activity, ShieldCheck, Zap, RefreshCw, Layers, CheckCircle2, TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
import { OHLCVBar } from '../../../lib/stockEngine';
import { candlestickPatternEngine } from '../../../lib/candlestickPatternEngine';
import { paperTradingEngine } from '../../../lib/paperTradingEngine';

interface AngelOneChartWorkstationProps {
  ticker: string;
  history?: OHLCVBar[];
  currentPrice?: number;
  onPriceUpdate?: (price: number) => void;
}

interface ProcessedBar extends OHLCVBar {
  timeSec: number;
}

interface ExpiryContract {
  symbol: string;
  token: string;
  expiry: string;
  label: string;
  isNearMonth: boolean;
}

const generateIntradayFallbackBars = (basePrice: number, tf: string): ProcessedBar[] => {
  const tfSecondsMap: Record<string, number> = { "1m": 60, "5m": 300, "15m": 900, "1H": 3600 };
  const stepSec = tfSecondsMap[tf] || 300;
  const nowSec = Math.floor(Date.now() / 1000);
  const istOffsetSec = 19800;

  const count = 25;
  const bars: ProcessedBar[] = [];
  let curP = basePrice || 1000;

  const alignedNow = Math.floor((nowSec + istOffsetSec) / stepSec) * stepSec - istOffsetSec;
  const startSec = alignedNow - (count - 1) * stepSec;

  for (let i = 0; i < count; i++) {
    const tSec = startSec + i * stepSec;
    const dateStr = new Date((tSec + istOffsetSec) * 1000).toISOString().replace("Z", "+05:30");
    const delta = (Math.random() - 0.48) * (curP * 0.002);
    const open = Number(curP.toFixed(2));
    const close = Number((curP + delta).toFixed(2));
    const high = Number((Math.max(open, close) + Math.random() * (curP * 0.001)).toFixed(2));
    const low = Number((Math.min(open, close) - Math.random() * (curP * 0.001)).toFixed(2));
    const vol = Math.floor(500 + Math.random() * 2000);

    bars.push({
      time: dateStr,
      timeSec: tSec,
      open,
      high,
      low,
      close,
      volume: vol
    });
    curP = close;
  }
  return bars;
};

// 0. BULLETPROOF TIMESTAMP SANITIZER FOR LIGHTWEIGHT CHARTS
const sanitizeBars = (rawBars: OHLCVBar[], tf: string): ProcessedBar[] => {
  if (!rawBars || rawBars.length === 0) return [];
  const tfSecondsMap: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1H": 3600,
    "1D": 86400
  };
  const stepSec = tfSecondsMap[tf] || 300;

  const parsed: ProcessedBar[] = rawBars.map((b, i) => {
    let tSec = 0;
    if (typeof b.time === 'number') {
      tSec = b.time > 2000000000 ? Math.floor(b.time / 1000) : b.time;
    } else if (typeof b.time === 'string') {
      const str = (b.time as string).trim();
      let isoStr = str.replace(' ', 'T');
      if (!isoStr.includes('+') && !isoStr.includes('Z')) {
        if (isoStr.includes(':')) {
          isoStr = isoStr.split(':').length === 2 ? `${isoStr}:00+05:30` : `${isoStr}+05:30`;
        } else {
          isoStr = `${isoStr}T09:15:00+05:30`;
        }
      }
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) tSec = Math.floor(d.getTime() / 1000);
    }

    if (!tSec || isNaN(tSec)) {
      tSec = Math.floor(Date.now() / 1000) - (rawBars.length - i) * stepSec;
    }

    // Enforce OHLC data integrity: high must be >= max(open, close), low must be <= min(open, close)
    const o = Number(b.open) || 0;
    const h = Number(b.high) || 0;
    const l = Number(b.low) || 0;
    const c = Number(b.close) || 0;
    const trueHigh = Math.max(h, o, c);
    const trueLow = Math.min(l > 0 ? l : Infinity, o > 0 ? o : Infinity, c > 0 ? c : Infinity);

    return {
      ...b,
      open: o,
      high: trueHigh,
      low: trueLow === Infinity ? o : trueLow,
      close: c,
      timeSec: tSec
    };
  });

  // Sort strictly in ascending order by timestamp
  parsed.sort((a, b) => a.timeSec - b.timeSec);

  // Guarantee strictly increasing timestamps (no duplicates or equal timestamps)
  for (let i = 0; i < parsed.length; i++) {
    if (i > 0 && parsed[i].timeSec <= parsed[i - 1].timeSec) {
      parsed[i].timeSec = parsed[i - 1].timeSec + stepSec;
    }
  }

  return parsed;
};

export const AngelOneChartWorkstation: React.FC<AngelOneChartWorkstationProps> = ({
  ticker,
  history = [],
  currentPrice,
  onPriceUpdate
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const hasFittedContentRef = useRef<boolean>(false);
  const lastAppliedTimestampRef = useRef<number>(0);
  const lastSSEUpdateTimeRef = useRef<number>(0);

  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "1H" | "1D">("5m");
  const [livePrice, setLivePrice] = useState<number>(currentPrice || 0);
  const [formingCandle, setFormingCandle] = useState<OHLCVBar | null>(null);
  const [angelOneSessionActive, setAngelOneSessionActive] = useState<boolean>(true);
  const [isFetchingAngelOne, setIsFetchingAngelOne] = useState<boolean>(false);

  const [expiryContracts, setExpiryContracts] = useState<ExpiryContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  const cleanSymbol = (ticker || "RELIANCE.NS").toUpperCase().replace(".NS", "").replace(".BO", "").replace("^", "");

  const [angelBars, setAngelBars] = useState<OHLCVBar[]>([]);
  const lastValidBarsRef = useRef<OHLCVBar[]>([]); // Retain last valid bars to prevent random fallback flash
  const [showChartCanvas, setShowChartCanvas] = useState<boolean>(false); // Default false: Background AI Candle Analysis Mode

  const [countdownStr, setCountdownStr] = useState<string>("00:00");

  useEffect(() => {
    const tfSecondsMap: Record<string, number> = { "1m": 60, "5m": 300, "15m": 900, "1H": 3600, "1D": 86400 };
    const stepSec = tfSecondsMap[timeframe] || 300;

    const updateTimer = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const remainingSec = stepSec - (nowSec % stepSec);
      const m = String(Math.floor(remainingSec / 60)).padStart(2, '0');
      const s = String(remainingSec % 60).padStart(2, '0');
      setCountdownStr(`${m}:${s}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timeframe]);

  // 1. Fetch Expiry Dates for Commodities / Futures Assets (Groww & Angel One Style)
  useEffect(() => {
    let active = true;
    const fetchExpiries = async () => {
      try {
        const isCommodity = ["CRUDE", "GOLD", "SILVER", "NATURAL", "COPPER", "CL=", "GC=", "SI=", "NG="].some(c => cleanSymbol.includes(c));
        if (isCommodity) {
          const res = await fetch(`/api/broker/angelone/expiries?symbol=${encodeURIComponent(cleanSymbol)}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.contracts) && active) {
              setExpiryContracts(json.contracts);
              if (json.contracts.length > 0) {
                setSelectedContract(json.contracts[0].symbol);
              }
            }
          }
        } else {
          setExpiryContracts([]);
          setSelectedContract(null);
        }
      } catch (e) {}
    };

    fetchExpiries();
    return () => { active = false; };
  }, [cleanSymbol]);

  // Reset fit state when symbol, selected contract, or timeframe changes
  useEffect(() => {
    hasFittedContentRef.current = false;
  }, [cleanSymbol, selectedContract, timeframe]);

  // 2. Fetch Real Timeframe-Specific Candles from Angel One SmartAPI
  // Clear bars ONLY when symbol/contract changes (not timeframe — keeps old bars visible during fetch)
  useEffect(() => {
    setAngelBars([]);
    lastValidBarsRef.current = [];
  }, [cleanSymbol, selectedContract]);

  useEffect(() => {
    let active = true;
    // Do NOT clear angelBars here — keep old candles visible until new ones load
    const fetchTimeframeCandles = async () => {
      try {
        const intervalMap: Record<string, string> = {
          "1m": "ONE_MINUTE",
          "5m": "FIVE_MINUTE",
          "15m": "FIFTEEN_MINUTE",
          "1H": "ONE_HOUR",
          "1D": "ONE_DAY"
        };
        const interval = intervalMap[timeframe] || "FIVE_MINUTE";
        const querySym = selectedContract || cleanSymbol;
        const isCrypto = querySym.includes("BTC") || querySym.includes("ETH") || querySym.includes("SOL") || querySym.includes("XRP") || querySym.includes("DOGE") || querySym.includes("BNB") || querySym.includes("ADA") || querySym.includes("AVAX") || querySym.includes("DOT") || querySym.includes("LINK");

        const endpoint = isCrypto
          ? `/api/broker/delta/candles?symbol=${encodeURIComponent(querySym.includes("USD") ? querySym : querySym + "USD")}&resolution=${timeframe === "1D" ? "1d" : timeframe}`
          : `/api/broker/angelone/candles?symbol=${encodeURIComponent(querySym)}&interval=${interval}`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.candles) && json.candles.length > 0 && active) {
            console.log(`[ChartWorkstation] 🟢 Loaded ${json.candles.length} real ${timeframe} candles for ${querySym} (${isCrypto ? "Delta Exchange" : "Angel One"})`);
            setAngelBars(json.candles);
            lastValidBarsRef.current = json.candles; // Cache for transition
            const lastC = json.candles[json.candles.length - 1];
            if (lastC && lastC.close > 0) setLivePrice(lastC.close);
            return;
          }
        }
      } catch (e) {
        console.warn("[ChartWorkstation] Fetch timeframe candles error:", e);
      }
    };

    fetchTimeframeCandles();
    return () => { active = false; };
  }, [cleanSymbol, selectedContract, timeframe]);

  // 3. Prepare Angel One Synced OHLCV Bars
  // Priority: 1) Real Angel One bars, 2) Last valid cached bars, 3) History prop, 4) Empty (NO random fallback)
  const displayBars = useMemo(() => {
    if (angelBars.length > 0) {
      return [...angelBars];
    }
    // Use last valid bars during fetch transitions instead of generating random ones
    if (lastValidBarsRef.current.length > 0) {
      return [...lastValidBarsRef.current];
    }
    if (history && history.length > 0) {
      return [...history];
    }
    return [];
  }, [angelBars, history, timeframe]);

  // 3.5. Detect AI Master Price Action & Technical Patterns (Locked to Completed Bars — Zero Tick Flickering)
  const detectedPatterns = useMemo(() => {
    const evaluationBars = angelBars.length > 0 ? angelBars : displayBars;
    const basePrice = evaluationBars.length > 0 ? evaluationBars[evaluationBars.length - 1].close : (livePrice || currentPrice || 0);
    return candlestickPatternEngine.detectAllPatterns(evaluationBars, basePrice);
  }, [angelBars, timeframe]);

  // 4. ATOMIC LIGHTWEIGHT CHARTS CANVAS INITIALIZATION
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    container.innerHTML = "";

    const chart = createChart(container, {
      width: container.clientWidth || 750,
      height: 390,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
        attributionLogo: false
      },
      localization: {
        dateFormat: 'yyyy-MM-dd',
        timeFormatter: (timestamp: number) => {
          // Indian Standard Time (IST = UTC + 5h 30m)
          const date = new Date((timestamp + 19800) * 1000);
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        }
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' }
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1e293b',
        rightOffset: 12,
        barSpacing: 12,
        minBarSpacing: 6,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true
      },
      rightPriceScale: {
        autoScale: true,
        alignLabels: true,
        scaleMargins: { top: 0.1, bottom: 0.2 },
        borderColor: '#1e293b'
      },
      crosshair: { mode: 0 }
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: true,
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickVisible: true
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: { type: 'volume' },
      priceScaleId: ''
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    });

    const ema20Series = chart.addSeries(LineSeries, {
      color: '#6366f1',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      title: '20 EMA'
    });

    const ema50Series = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      priceLineVisible: true,
      lastValueVisible: true,
      title: '50 EMA'
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    ema20SeriesRef.current = ema20Series;
    ema50SeriesRef.current = ema50Series;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries && entries.length > 0 && chartRef.current) {
        chartRef.current.applyOptions({ width: entries[0].contentRect.width });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      try {
        chart.remove();
      } catch (e) {}
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ema20SeriesRef.current = null;
      ema50SeriesRef.current = null;
    };
  }, [cleanSymbol, selectedContract, timeframe]);

  const lastBarRef = useRef<ProcessedBar | null>(null);

  // 5. UPDATE CANDLES ON CANVAS WHEN DATA CHANGES
  useEffect(() => {
    if (!candlestickSeriesRef.current || displayBars.length === 0) return;

    try {
      const sanitized = sanitizeBars(displayBars, timeframe);
      if (sanitized.length === 0) return;

      const cData = sanitized.map(b => ({
        time: b.timeSec as any,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close
      }));

      const vData = sanitized.map(b => ({
        time: b.timeSec as any,
        value: b.volume || 1000,
        color: b.close >= b.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
      }));

      // Calculate 20 & 50 EMA
      const ema20Data: { time: any; value: number }[] = [];
      const ema50Data: { time: any; value: number }[] = [];
      let v20 = sanitized[0].close;
      let v50 = sanitized[0].close;
      const k20 = 2 / (20 + 1);
      const k50 = 2 / (50 + 1);

      sanitized.forEach((bar, idx) => {
        v20 = bar.close * k20 + v20 * (1 - k20);
        v50 = bar.close * k50 + v50 * (1 - k50);
        if (idx >= 5) ema20Data.push({ time: bar.timeSec as any, value: Number(v20.toFixed(2)) });
        if (idx >= 15) ema50Data.push({ time: bar.timeSec as any, value: Number(v50.toFixed(2)) });
      });

      candlestickSeriesRef.current.setData(cData);
      if (volumeSeriesRef.current) volumeSeriesRef.current.setData(vData);
      if (ema20SeriesRef.current) ema20SeriesRef.current.setData(ema20Data);
      if (ema50SeriesRef.current) ema50SeriesRef.current.setData(ema50Data);

      const lastBar = sanitized[sanitized.length - 1];
      lastBarRef.current = lastBar;
      setFormingCandle(lastBar);

      if (chartRef.current && !hasFittedContentRef.current) {
        chartRef.current.timeScale().fitContent();
        hasFittedContentRef.current = true;
      }
    } catch (e) {
      console.warn("[AngelOneWorkstation] SetData warning:", e);
    }
  }, [displayBars, timeframe]);

  // 6. ZERO-LATENCY SSE REALTIME STREAM (0ms Delay Direct Socket/Stream) + 500ms Fallback Polling
  useEffect(() => {
    let isMounted = true;
    const querySym = selectedContract || cleanSymbol;

    const tfSecondsMap: Record<string, number> = {
      "1m": 60,
      "5m": 300,
      "15m": 900,
      "1H": 3600,
      "1D": 86400
    };
    const stepSec = tfSecondsMap[timeframe] || 300;

    const updateFormingOrRolloverCandle = (price: number) => {
      if (!price || price <= 0 || !candlestickSeriesRef.current || !lastBarRef.current) return;

      const nowSec = Math.floor(Date.now() / 1000);
      const istOffsetSec = 19800; // 5h 30m IST offset
      const currentBarTimeSec = Math.floor((nowSec + istOffsetSec) / stepSec) * stepSec - istOffsetSec;

      if (currentBarTimeSec > lastBarRef.current.timeSec) {
        // 🔔 PREVIOUS CANDLE COMPLETED & CLOSED! ROLLOVER TO BRAND NEW CANDLE!
        const newBar: ProcessedBar = {
          time: currentBarTimeSec as any,
          timeSec: currentBarTimeSec,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 100
        };
        candlestickSeriesRef.current.update({
          time: newBar.timeSec as any,
          open: newBar.open,
          high: newBar.high,
          low: newBar.low,
          close: newBar.close
        });
        lastBarRef.current = newBar;
        setFormingCandle(newBar);
      } else {
        // 🔄 UPDATE EXISTING FORMING CANDLE
        const activeBar = { ...lastBarRef.current };
        activeBar.close = price;
        if (price > activeBar.high) activeBar.high = price;
        if (price < activeBar.low) activeBar.low = price;

        candlestickSeriesRef.current.update({
          time: activeBar.timeSec as any,
          open: activeBar.open,
          high: activeBar.high,
          low: activeBar.low,
          close: activeBar.close
        });
        lastBarRef.current = activeBar;
        setFormingCandle(activeBar);
      }
    };

    // A. SSE Live Realtime Stream (0ms Delay Direct Stream)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/broker/ticks/stream?symbol=${encodeURIComponent(querySym)}`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.price > 0 && isMounted) {
            const rawTime = data.timestamp || Date.now();
            const tickTimeMs = rawTime < 10000000000 ? rawTime * 1000 : rawTime;
            if (tickTimeMs >= lastAppliedTimestampRef.current) {
              lastAppliedTimestampRef.current = tickTimeMs;
              lastSSEUpdateTimeRef.current = Date.now();
              setLivePrice(data.price);
              onPriceUpdate?.(data.price);
              setAngelOneSessionActive(true);
              updateFormingOrRolloverCandle(data.price);
              paperTradingEngine.updateLivePrice(cleanSymbol, data.price);
            }
          }
        } catch (err) {}
      };
    } catch (e) {}

    // B. Live Exchange Price Quote Polling (True Fallback - Skip if SSE is healthy < 3000ms)
    const pollAngelOneLiveQuote = async () => {
      const sseIsHealthy = (Date.now() - lastSSEUpdateTimeRef.current) < 3000;
      if (sseIsHealthy) {
        return; // ✅ SSE is active & healthy, skip REST polling to eliminate race condition!
      }
      try {
        setIsFetchingAngelOne(true);
        const querySym = selectedContract || cleanSymbol;
        const quoteRes = await fetch(`/api/stock/${encodeURIComponent(querySym)}/live-quote`);
        if (quoteRes.ok) {
          const qJson = await quoteRes.json();
          if (qJson.success && qJson.quote?.price > 0 && isMounted) {
            const rawTime = qJson.quote.timestamp ? new Date(qJson.quote.timestamp).getTime() : Date.now();
            const tickTimeMs = rawTime < 10000000000 ? rawTime * 1000 : rawTime;
            if (tickTimeMs >= lastAppliedTimestampRef.current) {
              lastAppliedTimestampRef.current = tickTimeMs;
              setLivePrice(qJson.quote.price);
              onPriceUpdate?.(qJson.quote.price);
              setAngelOneSessionActive(true);
              updateFormingOrRolloverCandle(qJson.quote.price);
              paperTradingEngine.updateLivePrice(cleanSymbol, qJson.quote.price);
            }
          }
        }
      } catch (err) {
      } finally {
        if (isMounted) setIsFetchingAngelOne(false);
      }
    };

    pollAngelOneLiveQuote();
    const intervalId = setInterval(pollAngelOneLiveQuote, 500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [cleanSymbol, selectedContract, ticker, timeframe]);

  const lastRealBarClose = displayBars.length > 0 ? displayBars[displayBars.length - 1].close : 0;
  const activePrice = livePrice > 0 ? livePrice : (lastRealBarClose > 0 ? lastRealBarClose : (currentPrice || 0));
  const isUp = formingCandle ? formingCandle.close >= formingCandle.open : true;

  const getExchangeSegment = (sym: string) => {
    const s = sym.toUpperCase();
    if (s.includes("BTC") || s.includes("ETH") || s.includes("SOL") || s.includes("XRP") || s.includes("DOGE") || s.includes("BNB") || s.includes("ADA") || s.includes("AVAX") || s.includes("DOT") || s.includes("LINK") || s.includes("CRYPTO")) return "CRYPTO";
    if (s.includes("CRUDE") || s.includes("GOLD") || s.includes("SILVER") || s.includes("NATURAL") || s.includes("COPPER") || s === "OIL") return "MCX";
    if (s.includes("NIFTY") || s.includes("NSEI") || s.includes("SENSEX") || s.includes("BSESN")) return "INDICES";
    if (s.includes("USDINR") || s.includes("EURINR")) return "CDS";
    return "NSE";
  };

  return (
    <div className="w-full p-5 rounded-3xl bg-slate-950 border border-amber-500/30 shadow-2xl flex flex-col gap-4">
      {/* ANGEL ONE SMARTAPI HEADER & BADGES */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-900/20">
            <Zap className="w-5 h-5 animate-pulse text-amber-400" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-100 font-mono tracking-wide">
                Angel One SmartAPI Direct Workstation
              </h2>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                Client: R673497
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct SmartAPI OHLCV Stream • 2FA TOTP Session Connected • Multi-Expiry Futures Support
            </p>
          </div>
        </div>

        {/* TIMEFRAME SELECTOR & CHART TOGGLE BUTTONS */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChartCanvas(!showChartCanvas)}
            className={`px-3 py-1.5 rounded-xl font-bold transition font-mono text-xs flex items-center gap-1.5 border ${
              showChartCanvas
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:text-slate-100"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>{showChartCanvas ? "Hide Visual Chart" : "Show Visual Chart"}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 font-mono text-xs">
            {(["1m", "5m", "15m", "1H", "1D"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
                  timeframe === tf
                    ? "bg-gradient-to-r from-amber-600 to-emerald-600 text-white shadow-md shadow-amber-900/30 border border-amber-400/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* EXPIRY DATES SELECTOR BAR FOR COMMODITIES & FUTURES (Jaise Groww / Angel One Workstation) */}
      {expiryContracts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-slate-900/90 p-3 rounded-2xl border border-amber-500/20 text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Calendar className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Expiry Dates:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {expiryContracts.map((c) => {
              const isSelected = (selectedContract || expiryContracts[0]?.symbol) === c.symbol;
              return (
                <button
                  key={c.symbol}
                  onClick={() => {
                    setSelectedContract(c.symbol);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-900/40 border border-amber-300 font-black"
                      : "bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700 border border-slate-700/60"
                  }`}
                >
                  <span>{c.label}</span>
                  {c.isNearMonth && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-slate-950 text-amber-300 font-black' : 'bg-amber-500/20 text-amber-300'}`}>
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TICKER LIVE BAR & FORMING CANDLE STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <span className="text-slate-400">Ticker:</span>
          <span className="font-bold text-slate-100 text-sm">
            {selectedContract || cleanSymbol} ({getExchangeSegment(cleanSymbol)})
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-slate-400">Live Price:</span>
          <span className={`font-bold text-sm ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
            {getExchangeSegment(cleanSymbol) === "CRYPTO" ? "$" : "₹"}{activePrice.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-slate-400">Forming Bar ({timeframe}):</span>
          {formingCandle ? (
            <span className="text-slate-200 font-semibold">
              O: <strong className="text-slate-300">{getExchangeSegment(cleanSymbol) === "CRYPTO" ? "$" : "₹"}{Number(formingCandle.open).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> | H: <strong className="text-emerald-400">{getExchangeSegment(cleanSymbol) === "CRYPTO" ? "$" : "₹"}{Number(formingCandle.high).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> | L: <strong className="text-rose-400">{getExchangeSegment(cleanSymbol) === "CRYPTO" ? "$" : "₹"}{Number(formingCandle.low).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </span>
          ) : (
            <span className="text-slate-500">Syncing...</span>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            100% Angel One Native
          </span>
        </div>
      </div>

      {/* BACKGROUND AI CANDLE ENGINE ACTIVE BANNER (When Visual Chart Box is Hidden) */}
      {!showChartCanvas && (
        <div className="w-full bg-slate-900/60 rounded-2xl border border-indigo-500/20 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-100">
              Background AI Candlestick & Price Action Study Engine Active
            </span>
            <span className="text-slate-400 hidden md:inline">
              • Analyzing Live Market Numbers & Patterns in BG
            </span>
          </div>
          <button
            onClick={() => setShowChartCanvas(true)}
            className="text-[11px] px-3 py-1 rounded-xl bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition font-bold"
          >
            Show Visual Chart Box
          </button>
        </div>
      )}

      {/* LIGHTWEIGHT CHARTS CANVAS CONTAINER (Hidden by Default in Headless BG Mode) */}
      <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-[#090d16] ${showChartCanvas ? 'block' : 'hidden'}`}>
        <div ref={chartContainerRef} className="w-full h-[390px]" />
        
        {/* OVERLAY LEGEND FOR EMA 20 & EMA 50 */}
        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-indigo-500 rounded"></span>
            <span className="text-slate-300">20 EMA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-500 rounded"></span>
            <span className="text-slate-300">50 EMA</span>
          </div>
        </div>
      </div>

      {/* AI MASTER TECHNICAL & PRICE ACTION PATTERN RECOGNITION PANEL (From Cheat Sheets) */}
      {detectedPatterns.length > 0 && (
        <div className="w-full bg-slate-900/90 rounded-2xl border border-indigo-500/30 p-4 font-mono text-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Layers className="w-4 h-4 animate-pulse text-indigo-400" />
              </span>
              <h3 className="font-bold text-slate-100 text-sm tracking-wide">
                AI Technical Pattern & Institutional SMC Analysis (Master Cheat Sheet)
              </h3>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
              {detectedPatterns.length} Pattern(s) Identified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {detectedPatterns.map((pat, idx) => {
              const isBullish = pat.patternType.includes("BULLISH");
              const isBearish = pat.patternType.includes("BEARISH");
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition ${
                    isBullish
                      ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                      : isBearish
                      ? "bg-rose-950/20 border-rose-500/40 text-rose-300"
                      : "bg-slate-800/40 border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="font-black text-sm text-slate-100 flex items-center gap-1.5">
                      {isBullish ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                      {pat.patternName}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-slate-900 border border-slate-700">
                      {pat.historicalWinRatePct}% Win Rate
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
                    {pat.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2 rounded-lg text-[10px] border border-slate-800 font-mono text-center">
                    <div>
                      <span className="text-slate-400 block text-[9px]">Entry</span>
                      <strong className="text-slate-200">{ticker.endsWith("USD") ? "$" : "₹"}{pat.entryPrice?.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-rose-400 block text-[9px]">Stop Loss</span>
                      <strong className="text-rose-300">{ticker.endsWith("USD") ? "$" : "₹"}{pat.stopLossPrice?.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className={`block text-[9px] ${isBullish ? "text-emerald-400" : "text-rose-400"}`}>Target ({pat.riskRewardRatio ? `1:${pat.riskRewardRatio}` : "1:2"})</span>
                      <strong className={isBullish ? "text-emerald-300" : "text-rose-300"}>{ticker.endsWith("USD") ? "$" : "₹"}{pat.projectedTargetPrice?.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
